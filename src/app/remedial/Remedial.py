# -*- coding: utf-8 -*-
"""
Remedial RAG & Hybrid AI Generator (Syariah-Quest)
Sistem Rekomendasi Remedial Berbasis Vektor (Supabase pgvector / vecs) + Fallback Gemini AI

Fitur:
1. Akses langsung ke database Supabase:
   - Membaca soal yang salah dijawab mahasiswa dari tabel `riwayat_jawaban_kuis`, `soal`, dan `jawaban`.
   - Mengambil materi modul pembelajaran dari tabel `modul` dan `modul_remedial`.
   - Menyimpan hasil rekomendasi remedial langsung ke tabel `modul_remedial` agar muncul di UI mahasiswa.
2. Embedding materi modul menggunakan SentenceTransformer (paraphrase-multilingual-MiniLM-L12-v2, 384 dimensi).
3. Penyimpanan dan pencarian kemiripan kosinus (Cosine Distance) di Supabase pgvector menggunakan 'vecs'.
4. Sistem Rekomendasi Hybrid:
   - Jika kemiripan >= threshold (misal 70%): ambil materi resmi dari modul database.
   - Jika kemiripan < threshold: panggil Google Gemini API untuk generate materi remedial baru secara otomatis.
5. Dapat dijalankan via CLI (--mahasiswa, --modul, --seed, --test) atau sebagai REST API (--serve) untuk Next.js.
"""

import os
import sys
import json
import argparse
from typing import List, Dict, Any, Optional

# 1. Muat Environment Variables (.env atau .env.local dari root project)
def load_environment():
    """Membaca variabel lingkungan dari .env atau .env.local"""
    try:
        from dotenv import load_dotenv
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        env_local = os.path.join(root_dir, ".env.local")
        env_default = os.path.join(root_dir, ".env")

        if os.path.exists(env_local):
            load_dotenv(env_local)
        elif os.path.exists(env_default):
            load_dotenv(env_default)
        else:
            load_dotenv()
    except ImportError:
        pass


load_environment()


# 2. Inisialisasi Koneksi & Model
def get_db_connection_string() -> str:
    """
    Mengambil string koneksi PostgreSQL Supabase dari environment variable.
    Format yang dibutuhkan vecs & SQLAlchemy:
    postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
    atau connection pooling:
    postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
    """
    conn = (
        os.getenv("DB_CONNECTION")
        or os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")
    )
    if not conn:
        print("\n[PERINGATAN] DB_CONNECTION / DATABASE_URL belum diatur di .env.local atau environment.")
        print("Format contoh: postgresql://postgres:PASSWORD@db.popswysrryifhgucfxvj.supabase.co:5432/postgres")
        try:
            conn = input("Masukkan connection string PostgreSQL Supabase: ").strip()
        except (EOFError, KeyboardInterrupt):
            conn = ""
    return conn


def get_gemini_api_key() -> str:
    """Mengambil API key Gemini dari environment variable"""
    return (
        os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or ""
    )


def call_gemini(prompt: str, api_key: Optional[str] = None, model: str = "gemini-2.5-flash") -> str:
    """
    Memanggil Google Gemini API untuk menghasilkan penjelasan remedial.
    Mendukung SDK 'google.genai' (terbaru) atau fallback HTTP REST jika SDK belum terpasang.
    """
    key = api_key or get_gemini_api_key()
    if not key:
        return (
            "Konsep syariah ini perlu dipelajari kembali dengan seksama. "
            "Pelajari kembali prinsip akad, syarat, rukun, dan ketentuan larangan transaksi dalam ekonomi Islam."
        )

    # Opsi 1: Coba gunakan google-genai SDK
    try:
        from google import genai
        client = genai.Client(api_key=key)
        model_name = os.getenv("GEMINI_MODEL") or model
        if "3.5" in model_name:
            model_name = "gemini-2.5-flash"

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )
        if response and response.text:
            return response.text.strip()
    except ImportError:
        pass
    except Exception as e:
        print(f"[Gemini SDK Warning] {e}, mencoba REST fallback...")

    # Opsi 2: Fallback direct HTTP REST API (tanpa perlu install google-genai)
    try:
        import urllib.request
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}"
        payload = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.4}
        }).encode("utf-8")

        req = urllib.request.Request(
            endpoint,
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
    except Exception as e:
        print(f"[Gemini REST Error] {e}")

    return (
        "Pembagian dan aturan dalam syariat Islam memiliki ketentuan pasti berdasarkan Al-Qur'an dan Sunnah. "
        "Pastikan Anda mengkaji kembali ketentuan rukun, syarat, dan dalil-dalil utama yang relevan dengan pertanyaan ini."
    )


def load_model():
    """Memuat model SentenceTransformer"""
    try:
        from sentence_transformers import SentenceTransformer
        print("[Embedding] Memuat model SentenceTransformer...")
        model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
        return model
    except ImportError:
        print("\n[ERROR] Modul 'sentence_transformers' belum terinstall.")
        print("Silakan jalankan:")
        print("pip install sentence-transformers\n")
        raise


def get_vecs_client(db_connection: Optional[str] = None):
    """Menghubungkan vecs ke Supabase PostgreSQL"""
    try:
        import vecs
    except ImportError:
        print("\n[ERROR] Modul 'vecs' belum terinstall.")
        print("Silakan jalankan:")
        print("pip install vecs sqlalchemy psycopg2-binary\n")
        raise

    conn_str = db_connection or get_db_connection_string()
    if not conn_str:
        raise ValueError("String koneksi database Supabase (DB_CONNECTION) tidak boleh kosong.")

    return vecs.create_client(conn_str)


# 3. Akses Langsung ke Database Supabase (Soal, Jawaban, & Materi)
def ambil_soal_salah_dari_db(
    vx_client,
    id_mahasiswa: int,
    id_modul: int
) -> List[Dict[str, Any]]:
    """
    Mengambil daftar pertanyaan yang salah dijawab mahasiswa dari tabel Supabase:
    `riwayat_jawaban_kuis` JOIN `soal` JOIN `jawaban`
    """
    from sqlalchemy import text

    query = text("""
        SELECT 
            r.id_soal,
            s.soal AS teks_soal,
            s.id_sub_topik,
            j_mhs.jawaban AS jawaban_mahasiswa,
            j_benar.jawaban AS jawaban_benar
        FROM riwayat_jawaban_kuis r
        JOIN soal s ON s.id_soal = r.id_soal
        LEFT JOIN jawaban j_mhs ON j_mhs.id_jawaban = r.id_jawaban
        LEFT JOIN jawaban j_benar ON j_benar.id_soal = r.id_soal AND j_benar.jawaban_benar = true
        WHERE r.id_mahasiswa = :id_mhs 
          AND r.id_modul = :id_modul 
          AND r.is_benar = false
        ORDER BY r.id_riwayat_jawaban ASC
    """)

    with vx_client.engine.connect() as conn:
        rows = conn.execute(query, {
            "id_mhs": id_mahasiswa,
            "id_modul": id_modul
        }).fetchall()

    hasil = []
    for r in rows:
        hasil.append({
            "id_soal": r.id_soal,
            "teks_soal": r.teks_soal,
            "id_sub_topik": r.id_sub_topik,
            "jawaban_mahasiswa": r.jawaban_mahasiswa or "Tidak menjawab",
            "jawaban_benar": r.jawaban_benar or "Kunci jawaban tidak tersedia",
        })

    print(f"[Database] Ditemukan {len(hasil)} soal salah untuk Mahasiswa #{id_mahasiswa} pada Modul #{id_modul}")
    return hasil


def ambil_dan_seed_materi_dari_db(vx_client, model, id_modul: Optional[int] = None):
    """
    Mengambil materi dari tabel `modul` dan `modul_remedial` di Supabase,
    lalu menyimpannya ke koleksi vektor `vecs.materi_pembelajaran`.
    """
    from sqlalchemy import text

    query_modul = text("""
        SELECT id_modul, nama_modul, teks_materi 
        FROM modul
        WHERE (:id_modul IS NULL OR id_modul = :id_modul)
    """)

    with vx_client.engine.connect() as conn:
        rows_modul = conn.execute(query_modul, {"id_modul": id_modul}).fetchall()

    koleksi = vx_client.get_or_create_collection(
        name="materi_pembelajaran",
        dimension=384
    )

    records = []
    print(f"[Seed DB] Meng-embed materi dari tabel 'modul'...")
    for row in rows_modul:
        if row.teks_materi and len(row.teks_materi.strip()) > 10:
            # Potong materi panjang menjadi paragraf-paragraf bermakna
            paragraf_list = [p.strip() for p in row.teks_materi.split("\n\n") if len(p.strip()) > 30]
            if not paragraf_list:
                paragraf_list = [row.teks_materi.strip()]

            for idx, p in enumerate(paragraf_list, start=1):
                doc_id = f"modul_{row.id_modul}_p{idx}"
                teks_embed = f"{row.nama_modul}. {p}"
                emb = model.encode(teks_embed, normalize_embeddings=True).tolist()
                records.append((
                    doc_id,
                    emb,
                    {
                        "id_modul": row.id_modul,
                        "judul": f"{row.nama_modul} (Bagian {idx})",
                        "isi": p,
                        "topik": row.nama_modul
                    }
                ))

    # Juga tambahkan default materi fundamental jika database modul masih sedikit
    for m in DEFAULT_MATERI:
        teks = f"{m['judul']}. {m['isi']}"
        emb = model.encode(teks, normalize_embeddings=True).tolist()
        records.append((
            m["id"],
            emb,
            {
                "judul": m["judul"],
                "isi": m["isi"],
                "topik": m.get("topik", "umum")
            }
        ))

    if records:
        koleksi.upsert(records=records)
        try:
            koleksi.create_index()
        except Exception:
            pass
        print(f"[Seed DB] Sukses menyimpan {len(records)} vektor materi ke vecs.materi_pembelajaran!")
    else:
        print("[Seed DB] Tidak ada materi modul yang ditemukan untuk di-embed.")

    return koleksi


def simpan_hasil_remedial_ke_db(
    vx_client,
    id_mahasiswa: int,
    id_modul: int,
    id_attempt_ke: int,
    hasil_remedial: Dict[str, Any]
) -> int:
    """
    Menyimpan hasil rekomendasi remedial Machine Learning langsung ke tabel `modul_remedial`.
    Dengan demikian, hasilnya langsung muncul di panel UI RemedialPanel mahasiswa.
    """
    from sqlalchemy import text

    detail_rekomendasi = hasil_remedial.get("detail_rekomendasi", [])
    if not detail_rekomendasi:
        return 0

    with vx_client.engine.connect() as conn:
        # Hapus data AI attempt yang sama sebelumnya agar tidak duplikat
        conn.execute(text("""
            DELETE FROM modul_remedial
            WHERE id_mahasiswa = :id_mhs 
              AND id_modul = :id_modul 
              AND id_attempt_ke = :id_attempt
              AND is_ai_generated = true
        """), {
            "id_mhs": id_mahasiswa,
            "id_modul": id_modul,
            "id_attempt": id_attempt_ke
        })

        # Dapatkan urutan terakhir
        res_urutan = conn.execute(text("""
            SELECT COALESCE(MAX(urutan), 0) as max_urutan
            FROM modul_remedial
            WHERE id_modul = :id_modul
        """), {"id_modul": id_modul}).fetchone()
        urutan_mulai = (res_urutan.max_urutan if res_urutan else 0) + 1

        insert_sql = text("""
            INSERT INTO modul_remedial (
                id_modul,
                id_sub_topik,
                judul,
                tipe,
                konten,
                urutan,
                is_ai_generated,
                id_mahasiswa,
                id_attempt_ke,
                generated_at,
                source_material
            ) VALUES (
                :id_modul,
                :id_sub_topik,
                :judul,
                'teks',
                :konten,
                :urutan,
                true,
                :id_mahasiswa,
                :id_attempt_ke,
                NOW(),
                :source_material
            )
        """)

        saved_count = 0
        for i, item in enumerate(detail_rekomendasi):
            konten_paragraf = item.get("konten") or item.get("isi") or (
                f"### {item.get('judul')}\n\n"
                f"Penjelasan terkait soal: \"{item.get('soal')}\".\n\n"
                f"Pelajari kembali rukun dan prinsip syariat yang berlaku pada topik ini."
            )

            kemiripan = item.get("kemiripan", 0)
            sumber = item.get("sumber", "ai")
            soal_ref = item.get("soal", "")
            if soal_ref:
                konten_paragraf = f"📌 Berdasarkan soal: \"{soal_ref}\"\n\n{konten_paragraf}"
            if sumber == "database" and kemiripan:
                konten_paragraf = f"{konten_paragraf}\n\n*Sumber: Modul Resmi ({kemiripan:.0f}% kemiripan)*"

            source_json = json.dumps({
                "soal_salah": soal_ref,
                "sumber": sumber,
                "kemiripan": kemiripan,
                "topik": item.get("topik", "umum"),
                "tipe": "penjelasan",
                "prioritas": 1 if sumber == "database" else 2
            }, ensure_ascii=False)

            conn.execute(insert_sql, {
                "id_modul": id_modul,
                "id_sub_topik": item.get("id_sub_topik"),
                "judul": item.get("judul", f"Remedial: {item.get('topik', 'Syariah')}"),
                "konten": konten_paragraf,
                "urutan": urutan_mulai + i,
                "id_mahasiswa": id_mahasiswa,
                "id_attempt_ke": id_attempt_ke,
                "source_material": source_json,
            })
            saved_count += 1

        conn.commit()

    print(f"[Database] Sukses menyimpan {saved_count} materi remedial AI ke tabel 'modul_remedial'!")
    return saved_count


# 4. Data Cadangan Standar (Fallback Fundamental Syariah)
DEFAULT_MATERI = [
    {
        "id": "materi_001",
        "judul": "Pengertian & Larangan Riba",
        "isi": (
            "Riba adalah tambahan yang dilarang dalam transaksi syariat Islam, "
            "baik berupa pinjaman berbunga (Riba Qardh) maupun pertukaran barang sejenis dengan takaran berbeda (Riba Fadhl). "
            "Setiap manfaat atau bunga yang disyaratkan di awal atas pokok utang tanpa akad riil adalah haram."
        ),
        "topik": "riba"
    },
    {
        "id": "materi_002",
        "judul": "Akad Mudharabah & Pembagian Hasil",
        "isi": (
            "Mudharabah adalah kerja sama pembiayaan antara pemilik modal (shahibul maal) "
            "dan pengelola usaha (mudharib). Keuntungan dibagi sesuai nisbah yang disepakati di awal (misal 60:40). "
            "Jika terjadi kerugian finansial bukan karena kelalaian pengelola, kerugian ditanggung sepenuhnya oleh pemilik modal."
        ),
        "topik": "mudharabah"
    },
    {
        "id": "materi_003",
        "judul": "Ketentuan Zakat & 8 Asnaf",
        "isi": (
            "Zakat merupakan kewajiban mengeluarkan bagian tertentu dari harta yang telah "
            "mencapai nisab dan haul menurut syariat Islam untuk diserahkan kepada 8 asnaf "
            "golongan penerima yang berhak (Fakir, Miskin, Amil, Mualaf, Riqab, Gharimin, Fisabilillah, Ibnu Sabil)."
        ),
        "topik": "zakat"
    }
]


# 5. Core Machine Learning: Hybrid RAG Remedial Function
def buat_materi_remedial_hybrid(
    daftar_soal_salah: List[Any],
    model_embedding,
    db_client,
    threshold: float = 70.0,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sistem Rekomendasi Remedial Hybrid (RAG + AI):
    1. Mencari materi relevan di database Supabase menggunakan Cosine Distance (<=>).
    2. Jika similarity >= threshold (default 70%): Ambil materi resmi modul dari DB.
    3. Jika similarity < threshold: Otomatis generate penjelasan baru menggunakan Google Gemini.
    """
    from sqlalchemy import text

    sql_query = text("""
        SELECT
            id,
            metadata,
            vec <=> CAST(:embedding AS vector) AS distance
        FROM vecs.materi_pembelajaran
        ORDER BY vec <=> CAST(:embedding AS vector)
        LIMIT 1
    """)

    konten_materi = []
    topik_terkait = []
    detail_hasil = []

    for nomor, item in enumerate(daftar_soal_salah, start=1):
        # Format input bisa berupa string murni atau dict dari database
        if isinstance(item, dict):
            soal_teks = item.get("teks_soal") or str(item)
            id_sub_topik = item.get("id_sub_topik")
            jawaban_mhs = item.get("jawaban_mahasiswa")
            jawaban_benar = item.get("jawaban_benar")
        else:
            soal_teks = str(item)
            id_sub_topik = None
            jawaban_mhs = None
            jawaban_benar = None

        # 1. Generate embedding vektor untuk soal yang salah
        vektor = model_embedding.encode(soal_teks, normalize_embeddings=True).tolist()

        # 2. Cari di database Supabase pgvector
        is_found_in_db = False
        materi_terbaik = None
        kemiripan = 0.0

        try:
            with db_client.engine.connect() as conn:
                hasil = conn.execute(sql_query, {"embedding": str(vektor)}).fetchall()
                if hasil:
                    materi_terbaik = hasil[0]
                    jarak_kosinus = float(materi_terbaik.distance)
                    kemiripan = (1.0 - jarak_kosinus) * 100.0
        except Exception as e:
            print(f"[Query Vektor Error] {e}")

        # 3. Evaluasi Threshold
        if materi_terbaik and kemiripan >= threshold:
            is_found_in_db = True
            judul = materi_terbaik.metadata.get("judul", "Materi Modul Resmi")
            isi = materi_terbaik.metadata.get("isi", "")
            topik = materi_terbaik.metadata.get("topik", "Syariah")
            topik_terkait.append(topik)

            paragraf = (
                f"### {judul} (Materi Modul Resmi)\n"
                f"{isi}\n\n"
                f"*Materi ini direkomendasikan dari modul karena memiliki tingkat kecocokan tinggi "
                f"({kemiripan:.1f}%) dengan soal yang salah: \"{soal_teks}\"*"
            )
            konten_materi.append(paragraf)
            detail_hasil.append({
                "soal": soal_teks,
                "sumber": "database",
                "kemiripan": round(kemiripan, 2),
                "judul": judul,
                "konten": paragraf,
                "topik": topik,
                "id_sub_topik": id_sub_topik
            })

        # 4. Fallback Gemini AI jika di bawah threshold
        if not is_found_in_db:
            topik_terkait.append("Ekstensi AI")

            prompt = (
                f"Anda adalah seorang dosen Ahli Fikih dan Ekonomi Syariah. "
                f"Seorang mahasiswa salah menjawab pertanyaan kuis berikut:\n"
                f"Pertanyaan: '{soal_teks}'\n"
            )
            if jawaban_mhs:
                prompt += f"Jawaban keliru mahasiswa: '{jawaban_mhs}'\n"
            if jawaban_benar:
                prompt += f"Kunci jawaban yang benar: '{jawaban_benar}'\n"

            prompt += (
                f"\nBuatkan penjelasan materi remedial yang akademis, jelas, dan mudah dipahami "
                f"dalam 2 paragraf padat tentang konsep yang benar, dalil syariah/kaidah fikihnya, dan pembahasannya."
            )

            penjelasan_ai = call_gemini(prompt, api_key=api_key)

            paragraf = (
                f"### Pembahasan Cerdas: Konsep Syariah (Materi AI)\n"
                f"{penjelasan_ai}\n\n"
                f"*Materi ini dibuat otomatis oleh AI Pembimbing karena topik soal ini belum tercakup "
                f"secara spesifik di modul atau kemiripannya di bawah {threshold}%.*"
            )
            konten_materi.append(paragraf)
            detail_hasil.append({
                "soal": soal_teks,
                "sumber": "ai_gemini",
                "kemiripan": round(kemiripan, 2),
                "judul": f"Pembahasan: {soal_teks[:40]}...",
                "konten": paragraf,
                "topik": "Ekstensi AI",
                "id_sub_topik": id_sub_topik
            })

    return {
        "judul_halaman": "MODUL REMEDIAL MAHASISWA (HYBRID RAG & AI)",
        "isi_pembelajaran": "\n\n---\n\n".join(konten_materi),
        "topik_terkait": list(set(topik_terkait)),
        "detail_rekomendasi": detail_hasil
    }


# 6. Pipeline Lengkap End-to-End dari Database ke Database
def proses_remedial_mahasiswa_lengkap(
    id_mahasiswa: int,
    id_modul: int,
    id_attempt_ke: int = 1,
    threshold: float = 70.0
) -> Dict[str, Any]:
    """
    Eksekusi alur penuh:
    1. Ambil soal yang salah dari database Supabase (`riwayat_jawaban_kuis`).
    2. Proses melalui Machine Learning RAG vecs & Gemini AI.
    3. Simpan hasil rekomendasi kembali ke tabel `modul_remedial` di Supabase.
    """
    print(f"\n=======================================================")
    print(f" Memproses Remedial Mahasiswa #{id_mahasiswa} | Modul #{id_modul} (Attempt #{id_attempt_ke})")
    print(f"=======================================================\n")

    vx = get_vecs_client()
    model = load_model()

    # 1. Ambil soal salah dari DB
    soal_salah = ambil_soal_salah_dari_db(vx, id_mahasiswa, id_modul)
    if not soal_salah:
        print("[Info] Tidak ada jawaban salah yang ditemukan untuk modul ini.")
        return {
            "status": "success",
            "message": "Tidak ada soal salah untuk diproses.",
            "total_soal_salah": 0,
            "saved_count": 0
        }

    # 2. Proses Machine Learning
    hasil = buat_materi_remedial_hybrid(
        daftar_soal_salah=soal_salah,
        model_embedding=model,
        db_client=vx,
        threshold=threshold
    )

    # 3. Simpan ke modul_remedial agar muncul di panel web
    saved_count = simpan_hasil_remedial_ke_db(
        vx_client=vx,
        id_mahasiswa=id_mahasiswa,
        id_modul=id_modul,
        id_attempt_ke=id_attempt_ke,
        hasil_remedial=hasil
    )

    return {
        "status": "success",
        "total_soal_salah": len(soal_salah),
        "saved_count": saved_count,
        "detail": hasil
    }


# 7. REST API Server (Untuk Komunikasi Langsung dengan Next.js)
def jalankan_api_server(port: int = 8000):
    """
    Menjalankan HTTP REST server ringan agar dapat dipanggil oleh Next.js.
    Endpoint yang didukung:
    - POST /api/remedial/process-attempt : Ambil soal salah dari DB, proses ML, dan simpan ke modul_remedial
    - POST /api/remedial : Terima array soal salah dan kembalikan rekomendasi hybrid
    - GET  /health : Cek status server
    """
    from http.server import HTTPServer, BaseHTTPRequestHandler

    print("[API] Memuat database dan model embedding...")
    model = load_model()
    vx = get_vecs_client()

    class RemedialHandler(BaseHTTPRequestHandler):
        def _set_cors(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

        def do_OPTIONS(self):
            self.send_response(200)
            self._set_cors()
            self.end_headers()

        def do_GET(self):
            if self.path == "/health":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._set_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "service": "Syariah-Quest Remedial ML Engine"}).encode())
            else:
                self.send_response(404)
                self.end_headers()

        def do_POST(self):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)

            if self.path == "/api/remedial/process-attempt":
                try:
                    payload = json.loads(body.decode("utf-8"))
                    id_mhs = int(payload.get("id_mahasiswa", 0))
                    id_modul = int(payload.get("id_modul", 0))
                    id_attempt = int(payload.get("id_attempt_ke", 1))
                    threshold = float(payload.get("threshold", 70.0))

                    if not id_mhs or not id_modul:
                        self.send_response(400)
                        self.send_header("Content-Type", "application/json")
                        self._set_cors()
                        self.end_headers()
                        self.wfile.write(json.dumps({"error": "id_mahasiswa dan id_modul diperlukan"}).encode())
                        return

                    soal_salah = ambil_soal_salah_dari_db(vx, id_mhs, id_modul)
                    hasil = buat_materi_remedial_hybrid(
                        daftar_soal_salah=soal_salah,
                        model_embedding=model,
                        db_client=vx,
                        threshold=threshold
                    )

                    saved_count = simpan_hasil_remedial_ke_db(
                        vx_client=vx,
                        id_mahasiswa=id_mhs,
                        id_modul=id_modul,
                        id_attempt_ke=id_attempt,
                        hasil_remedial=hasil
                    )

                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self._set_cors()
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": True,
                        "saved_count": saved_count,
                        "total_soal_salah": len(soal_salah),
                        "materials": hasil
                    }, ensure_ascii=False).encode("utf-8"))

                except Exception as e:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self._set_cors()
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode())

            elif self.path == "/api/remedial":
                try:
                    payload = json.loads(body.decode("utf-8"))
                    daftar_soal = payload.get("soal", [])
                    threshold = float(payload.get("threshold", 70.0))

                    if not daftar_soal:
                        self.send_response(400)
                        self.send_header("Content-Type", "application/json")
                        self._set_cors()
                        self.end_headers()
                        self.wfile.write(json.dumps({"error": "Field 'soal' (array) diperlukan"}).encode())
                        return

                    hasil = buat_materi_remedial_hybrid(
                        daftar_soal_salah=daftar_soal,
                        model_embedding=model,
                        db_client=vx,
                        threshold=threshold
                    )

                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self._set_cors()
                    self.end_headers()
                    self.wfile.write(json.dumps(hasil, ensure_ascii=False).encode("utf-8"))

                except Exception as e:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self._set_cors()
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode())
            else:
                self.send_response(404)
                self.end_headers()

    server = HTTPServer(("0.0.0.0", port), RemedialHandler)
    print(f"\n=======================================================")
    print(f"🚀 Remedial ML Server aktif di: http://localhost:{port}")
    print(f"   Endpoint 1: POST http://localhost:{port}/api/remedial/process-attempt")
    print(f"   Endpoint 2: POST http://localhost:{port}/api/remedial")
    print(f"   Health Check: GET http://localhost:{port}/health")
    print(f"=======================================================\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Server dimatikan]")
        server.server_close()


# 8. Command Line Interface (CLI)
def main():
    parser = argparse.ArgumentParser(description="Syariah-Quest Remedial Machine Learning Engine")
    parser.add_argument("--mahasiswa", type=int, help="ID Mahasiswa untuk diproses remedialnya")
    parser.add_argument("--modul", type=int, help="ID Modul untuk diproses remedialnya")
    parser.add_argument("--attempt", type=int, default=1, help="Attempt ke-berapa (default: 1)")
    parser.add_argument("--threshold", type=float, default=70.0, help="Threshold kemiripan vektor (default: 70.0)")
    parser.add_argument("--seed-db", action="store_true", help="Ambil materi dari tabel modul dan simpan ke vektor vecs")
    parser.add_argument("--seed", action="store_true", help="Simpan materi default ke vektor vecs")
    parser.add_argument("--serve", action="store_true", help="Jalankan REST API server lokal untuk Next.js")
    parser.add_argument("--test", action="store_true", help="Jalankan uji coba pencarian remedial hybrid")
    parser.add_argument("--port", type=int, default=8000, help="Port untuk server API (default: 8000)")

    args = parser.parse_args()

    if args.serve:
        jalankan_api_server(port=args.port)
        return

    # Jika argumen mahasiswa dan modul disediakan, jalankan pipeline DB end-to-end
    if args.mahasiswa and args.modul:
        proses_remedial_mahasiswa_lengkap(
            id_mahasiswa=args.mahasiswa,
            id_modul=args.modul,
            id_attempt_ke=args.attempt,
            threshold=args.threshold
        )
        return

    model = load_model()
    vx = get_vecs_client()

    if args.seed_db:
        ambil_dan_seed_materi_dari_db(vx, model, id_modul=args.modul)
        return

    if args.seed:
        ambil_dan_seed_materi_dari_db(vx, model)
        return

    # Default ke test mode
    soal_uji = [
        "Bagaimana konsekuensi pinjaman uang yang berbunga dalam hukum Islam?",
        "Bagaimana pembagian harta warisan untuk anak laki-laki menurut hukum waris Islam?"
    ]
    print("\nMenjalankan evaluasi hybrid untuk 2 soal:")
    for i, s in enumerate(soal_uji, 1):
        print(f"{i}. {s}")

    modul = buat_materi_remedial_hybrid(
        daftar_soal_salah=soal_uji,
        model_embedding=model,
        db_client=vx,
        threshold=args.threshold
    )

    print("\n===============================================================")
    print(modul["judul_halaman"])
    print("===============================================================")
    print(modul["isi_pembelajaran"])
    print("===============================================================")
    print("Topik Terkait:", ", ".join(modul["topik_terkait"]))


if __name__ == "__main__":
    main()
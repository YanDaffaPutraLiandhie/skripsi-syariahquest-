"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateSubTopikModul } from "@/lib/generateSubTopik";
import { panggilGemini } from "@/lib/gemini";
import {
  getSubTopikModul,
  hitungPerSubTopik,
  subTopikLemah,
} from "@/lib/subTopik";

export type WeakArea = {
  idSubTopik: number;
  judul: string;
  benar: number;
  total: number;
  persentaseBenar: number;
  soalSalah: SoalSalah[];
};

export type SoalSalah = {
  idSoal: number;
  teksSoal: string;
  jawabanBenar: string;
  jawabanMahasiswa: string;
  idSubTopik: number | null;
};

export type GeneratedMaterial = {
  id: string;
  judul: string;
  tipe: "ringkasan" | "penjelasan" | "contoh_soal" | "tips";
  konten: string;
  idSubTopik: number;
  prioritas: number;
  source?: {
    soal_salah?: string;
    sumber?: string;
    kemiripan?: number;
    topik?: string;
  };
};

export type MaterialGenerationInput = {
  idMahasiswa: number;
  idModul: number;
  passScore: number;
};

export type MaterialGenerationResult = {
  weakAreas: WeakArea[];
  generatedMaterials: GeneratedMaterial[];
  existingMaterials: ExistingMaterial[];
};

export type ExistingMaterial = {
  idRemedial: number;
  judul: string;
  tipe: "teks" | "video" | "dokumen";
  konten: string;
  idSubTopik: number | null;
};

async function fetchWeakAreas(
  idMahasiswa: number,
  idModul: number,
  passScore: number,
): Promise<WeakArea[]> {
  const { data: riwayat, error: riwayatError } = await supabaseAdmin
    .from("riwayat_jawaban_kuis")
    .select("id_soal, id_jawaban, is_benar")
    .eq("id_mahasiswa", idMahasiswa)
    .eq("id_modul", idModul);

  if (riwayatError) throw riwayatError;

  console.log(
    "[fetchWeakAreas] Riwayat count:",
    riwayat?.length,
    "for idMahasiswa:",
    idMahasiswa,
    "idModul:",
    idModul,
  );

  // CATATAN: ini berisi semua percobaan. Kalau tabel punya kolom percobaan
  // (mis. id_attempt), filter hanya percobaan terakhir di query di atas.
  const semuaJawaban = riwayat ?? [];
  const idSoalList = [...new Set(semuaJawaban.map((r) => r.id_soal as number))];

  // Peta soal -> sub-topik dan soal -> teks (satu query, tanpa query di dalam loop)
  const soalKeSubTopik = new Map<number, number | null>();
  const soalTeks = new Map<number, string>();
  if (idSoalList.length > 0) {
    const { data: soalRows, error: soalError } = await supabaseAdmin
      .from("soal")
      .select("id_soal, id_sub_topik, soal")
      .in("id_soal", idSoalList);
    if (soalError) throw soalError;
    for (const s of soalRows ?? []) {
      soalKeSubTopik.set(s.id_soal as number, (s.id_sub_topik as number | null) ?? null);
      soalTeks.set(s.id_soal as number, s.soal as string);
    }
  }

  // Kunci jawaban diambil per soal (bukan dari jawaban yang dipilih mahasiswa)
  const jawabanBenarMap = new Map<number, string>();
  if (idSoalList.length > 0) {
    const { data: kunciRows, error: kunciError } = await supabaseAdmin
      .from("jawaban")
      .select("id_soal, jawaban")
      .in("id_soal", idSoalList)
      .eq("jawaban_benar", true);
    if (kunciError) throw kunciError;
    for (const k of kunciRows ?? []) {
      jawabanBenarMap.set(k.id_soal as number, k.jawaban as string);
    }
  }

  // Jawaban yang dipilih mahasiswa
  const jawabanMahasiswaMap = new Map<number, string>();
  const jawabanIds = [
    ...new Set(semuaJawaban.map((r) => r.id_jawaban as number).filter(Boolean)),
  ];
  if (jawabanIds.length > 0) {
    const { data: jawabanRows, error: jawabanError } = await supabaseAdmin
      .from("jawaban")
      .select("id_jawaban, jawaban")
      .in("id_jawaban", jawabanIds);
    if (jawabanError) throw jawabanError;
    for (const j of jawabanRows ?? []) {
      jawabanMahasiswaMap.set(j.id_jawaban as number, j.jawaban as string);
    }
  }

  const buatSoalSalah = (r: (typeof semuaJawaban)[number]): SoalSalah => ({
    idSoal: r.id_soal as number,
    teksSoal: soalTeks.get(r.id_soal as number) ?? "Soal tidak ditemukan",
    jawabanBenar: jawabanBenarMap.get(r.id_soal as number) ?? "Tidak diketahui",
    jawabanMahasiswa:
      jawabanMahasiswaMap.get(r.id_jawaban as number) ?? "Tidak diketahui",
    idSubTopik: soalKeSubTopik.get(r.id_soal as number) ?? null,
  });

  const daftarSubTopik = await getSubTopikModul(idModul);
  const hasilSubTopik = hitungPerSubTopik(
    semuaJawaban.map((r) => ({
      id_sub_topik: soalKeSubTopik.get(r.id_soal as number) ?? null,
      is_benar: Boolean(r.is_benar),
    })),
    daftarSubTopik,
  );
  const lemah = subTopikLemah(hasilSubTopik, passScore);

  console.log(
    "[fetchWeakAreas] Sub-topik lemah:",
    lemah.map((l) => ({ id: l.id_sub_topik, judul: l.judul, benar: l.benar, total: l.total })),
  );

  const weakAreas: WeakArea[] = [];

  for (const l of lemah) {
    const soalSalah = semuaJawaban
      .filter(
        (r) =>
          !r.is_benar &&
          (soalKeSubTopik.get(r.id_soal as number) ?? null) === l.id_sub_topik,
      )
      .map(buatSoalSalah);

    weakAreas.push({
      idSubTopik: l.id_sub_topik,
      judul: l.judul,
      benar: l.benar,
      total: l.total,
      persentaseBenar: l.total > 0 ? Math.round((l.benar / l.total) * 100) : 0,
      soalSalah,
    });
  }

  // Cadangan: kalau tidak ada sub-topik lemah terdeteksi tapi nilai keseluruhan
  // di bawah batas lulus, buat satu area lemah umum untuk seluruh modul.
  if (weakAreas.length === 0 && semuaJawaban.length > 0) {
    const total = semuaJawaban.length;
    const salah = semuaJawaban.filter((r) => !r.is_benar);
    const benar = total - salah.length;
    const persen = Math.round((benar / total) * 100);

    if (persen < passScore) {
      console.log("[fetchWeakAreas] Pakai cadangan 'Materi Umum Modul'");
      weakAreas.push({
        idSubTopik: 0,
        judul: "Materi Umum Modul",
        benar,
        total,
        persentaseBenar: persen,
        soalSalah: salah.map(buatSoalSalah),
      });
    }
  }

  return weakAreas;
}

async function fetchExistingMaterials(idModul: number): Promise<ExistingMaterial[]> {
  const { data, error } = await supabaseAdmin
    .from("modul_remedial")
    .select("id_remedial, judul, tipe, konten, id_sub_topik")
    .eq("id_modul", idModul)
    .is("id_mahasiswa", null) // hanya materi buatan dosen, bukan materi AI per mahasiswa
    .order("urutan", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((m) => ({
    idRemedial: m.id_remedial,
    judul: m.judul,
    tipe: m.tipe,
    konten: m.konten,
    idSubTopik: m.id_sub_topik,
  })) as ExistingMaterial[];
}

async function fetchModuleContext(idModul: number): Promise<{
  namaModul: string;
  teksMateri: string;
  videoUrl: string | null;
  dokumenPendukung: string | null;
} | null> {
  const { data, error } = await supabaseAdmin
    .from("modul")
    .select("nama_modul, teks_materi, video_url, dokumen_pendukung")
    .eq("id_modul", idModul)
    .single();

  if (error || !data) return null;
  return {
    namaModul: data.nama_modul,
    teksMateri: data.teks_materi,
    videoUrl: data.video_url,
    dokumenPendukung: data.dokumen_pendukung,
  };
}

function generateRuleBasedMaterials(
  weakAreas: WeakArea[],
  _existingMaterials: ExistingMaterial[],
  moduleContext: Awaited<ReturnType<typeof fetchModuleContext>>,
): GeneratedMaterial[] {
  const materials: GeneratedMaterial[] = [];
  let materialId = 0;

  for (const area of weakAreas) {
    materialId++;
    materials.push({
      id: `gen-${materialId}`,
      judul: `Materi Penguatan: ${area.judul}`,
      tipe: "penjelasan",
      konten: `### 1. Konsep Pokok & Pengertian\n\nSub-topik **"${area.judul}"** merupakan kompetensi inti yang perlu kamu telaah kembali agar menguasai materi modul ini secara menyeluruh.\n\n> 📜 **Rujukan Pembelajaran:** "${area.judul}" memiliki ketentuan hukum dan prinsip dasar yang wajib dipenuhi dalam muamalah syariah.\n\n### 2. Poin-Poin Penting yang Perlu Diperhatikan\n- **Definisi & Batasan:** Pahami definisi syar'i dan batasan hukum yang berlaku.\n- **Rukun & Syarat:** Pastikan seluruh syarat keabsahan terpenuhi sesuai syariat.\n- **Konsekuensi Hukum:** Pahami akibat hukum dari pelaksanaan akad atau kaidah ini.\n\n💡 **Contoh Penerapan:**\nDalam praktik transaksi kontemporer, pemahaman mengenai "${area.judul}" membantu membedakan akad yang sah dari transaksi yang berpotensi melanggar ketentuan fikih.\n\n⚠️ **Catatan Penting:**\nTelaah kembali materi modul ini dengan cermat sebelum mengulangi kuis evaluasi.`,
      idSubTopik: area.idSubTopik,
      prioritas: 1,
    });
  }

  console.log("[generateRuleBasedMaterials] Generated materials count:", materials.length);
  return materials;
}

const TIPE_VALID = ["ringkasan", "penjelasan", "contoh_soal", "tips"] as const;

async function generateWithLLM(
  weakAreas: WeakArea[],
  moduleContext: Awaited<ReturnType<typeof fetchModuleContext>>,
): Promise<GeneratedMaterial[]> {
  if (!process.env.GEMINI_API_KEY || weakAreas.length === 0) return [];

  try {
    const daftarId = weakAreas.map((a) => `${a.idSubTopik} = ${a.judul}`).join("; ");

    const prompt = `Sebagai AI tutor akademik pembelajaran Syariah, buatkan 1 materi penjelasan pembelajaran yang mendalam, terstruktur, menarik, dan interaktif untuk dibaca mahasiswa pada sub-topik berikut:

Modul: ${moduleContext?.namaModul ?? "Tidak diketahui"}
Materi acuan: ${moduleContext?.teksMateri?.substring(0, 1500) ?? "Tidak tersedia"}

Sub-topik yang belum dikuasai mahasiswa:
${weakAreas.map((a) => `- ${a.judul}: ${a.benar}/${a.total} benar (${a.persentaseBenar}%)`).join("\n")}

INSTRUKSI PENTING FORMAT TAMPILAN (AGAR TIDAK MEMBOSANKAN SAAT DIBACA):
- Kemas materi dengan tampilan yang menarik, terstruktur, dan mudah dipahami (hindari paragraf panjang yang membosankan).
- Gunakan struktur Markdown kaya berikut:
  1. "### 1. Definisi & Konsep Pokok"
     Jelaskan inti konsep dengan bahasa yang komunikatif dan tebalkan istilah kunci dengan "**kata kunci**".
  2. "> 📜 **Rujukan Dalil / Kaidah Fiqih:** [Tuliskan kutipan ayat Al-Qur'an, Hadits, atau Kaidah Fikih terkait beserta artinya]"
  3. "### 2. Ketentuan & Rukun Penting"
     Gunakan daftar poin bullet ("- ") untuk rukun, syarat, atau prinsip utama.
  4. "💡 **Contoh Kasus Nyata:** [Berikan contoh kasus penerapan muamalah sehari-hari yang konkret dan mudah dibayangkan]"
  5. "⚠️ **Poin Kritis / Perhatian:** [Jelaskan kekeliruan umum yang sering terjadi agar mahasiswa tidak salah paham]"
- JANGAN membocorkan kunci jawaban kuis secara langsung; fokuskan pada penguasaan konsep yang benar.

Pemetaan idSubTopik: ${daftarId}

Balas HANYA JSON tanpa teks lain dengan format:
{"materials":[{"judul":"Penjelasan Materi: [Judul Sub-topik]","tipe":"penjelasan","konten":"...","idSubTopik":0}]}`;

    const text = await panggilGemini(prompt, {
      system:
        "Kamu adalah AI tutor pembelajaran Islam yang membantu mahasiswa memahami materi Syariah. " +
        "PENTING: Jangan pernah menyebutkan atau membocorkan jawaban benar dari soal kuis secara langsung. " +
        "Fokuslah pada penjelasan konsep, prinsip, dan pemahaman materi, bukan pada kunci jawaban. " +
        "Tujuanmu adalah mendorong mahasiswa untuk memahami konsep, bukan menghafal jawaban.",
      temperature: 0.5,
    });

    const awal = text.indexOf("{");
    const akhir = text.lastIndexOf("}");
    if (awal === -1 || akhir === -1) throw new Error("Respons LLM bukan JSON");

    const parsed = JSON.parse(text.slice(awal, akhir + 1));
    const mentah: unknown[] = Array.isArray(parsed) ? parsed : parsed.materials ?? [];

    const idValid = new Set(weakAreas.map((a) => a.idSubTopik));
    const hasil: GeneratedMaterial[] = [];

    mentah.forEach((raw, i) => {
      const m = raw as Partial<GeneratedMaterial>;
      if (!m.judul || !m.konten) return;
      const tipe = TIPE_VALID.includes(m.tipe as (typeof TIPE_VALID)[number])
        ? (m.tipe as GeneratedMaterial["tipe"])
        : "penjelasan";
      const idSubTopik =
        m.idSubTopik !== undefined && idValid.has(Number(m.idSubTopik))
          ? Number(m.idSubTopik)
          : weakAreas[0].idSubTopik;

      hasil.push({
        id: `llm-${i + 1}`,
        judul: String(m.judul),
        tipe,
        konten: String(m.konten),
        idSubTopik,
        prioritas: 1,
      });
    });

    console.log("[generateWithLLM] Materi dari LLM:", hasil.length);
    return hasil;
  } catch (error) {
    console.error("LLM generation failed:", error);
    return [];
  }
}

async function generateWithPythonRAG(
  weakAreas: WeakArea[],
): Promise<GeneratedMaterial[]> {
  const soalSalahList = weakAreas.flatMap((w) => w.soalSalah.map((s) => s.teksSoal));
  if (soalSalahList.length === 0) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch("http://127.0.0.1:8000/api/remedial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soal: soalSalahList.slice(0, 5), threshold: 70 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    type DetailItem = { soal: string; sumber: string; judul: string; topik: string; kemiripan: number; konten?: string };
    const detail: DetailItem[] = data.detail_rekomendasi ?? [];
    const hasil: GeneratedMaterial[] = [];

    detail.forEach((d, i) => {
      const weak = weakAreas.find((w) => w.soalSalah.some((s) => s.teksSoal === d.soal)) ?? weakAreas[0];
      hasil.push({
        id: `rag-${i + 1}`,
        judul: d.sumber === "database" ? `Materi Modul: ${d.judul}` : `Penjelasan Konsep: ${d.judul}`,
        tipe: "penjelasan",
        konten: d.konten || `### ${d.judul}\n\nTopik: ${d.topik}\n\n${data.isi_pembelajaran}`,
        idSubTopik: weak ? weak.idSubTopik : 0,
        prioritas: d.sumber === "database" ? 1 : 2,
        source: {
          soal_salah: d.soal,
          sumber: d.sumber,
          kemiripan: d.kemiripan,
          topik: d.topik,
        },
      });
    });

    if (hasil.length > 0) {
      console.log("[generateWithPythonRAG] Menggunakan hasil dari Python vecs RAG:", hasil.length);
      return hasil;
    }
  } catch {
    // Python service offline, lewati tanpa error
  }

  return [];
}

export async function generateLearningMaterials(
  input: MaterialGenerationInput,
): Promise<MaterialGenerationResult> {
  // 1. Pastikan soal punya sub-topik (aman dipanggil berulang)
  await generateSubTopikModul(input.idModul).catch((e) =>
    console.error("generateSubTopikModul gagal:", e),
  );

  // 2. Ambil data; satu kegagalan tidak boleh menjatuhkan semuanya
  const moduleContext = await fetchModuleContext(input.idModul);

  const [weakAreas, existingMaterials] = await Promise.all([
    fetchWeakAreas(input.idMahasiswa, input.idModul, input.passScore).catch((e) => {
      console.error("fetchWeakAreas gagal:", e);
      return [] as WeakArea[];
    }),
    fetchExistingMaterials(input.idModul).catch((e) => {
      console.error("fetchExistingMaterials gagal:", e);
      return [] as ExistingMaterial[];
    }),
  ]);

  // 3. Coba Python RAG terlebih dahulu jika aktif
  const ragMaterials = await generateWithPythonRAG(weakAreas);

  // 4. Fokus pada materi pembelajaran utama (tanpa duplikasi atau tips umum)
  let generatedMaterials: GeneratedMaterial[] = [];

  if (ragMaterials.length > 0) {
    generatedMaterials = ragMaterials;
  } else {
    const llmMaterials = await generateWithLLM(weakAreas, moduleContext);
    if (llmMaterials.length > 0) {
      generatedMaterials = llmMaterials;
    } else {
      // Fallback rule-based hanya digunakan jika LLM dan RAG tidak tersedia
      generatedMaterials = generateRuleBasedMaterials(
        weakAreas,
        existingMaterials,
        moduleContext,
      );
    }
  }

  return {
    weakAreas,
    generatedMaterials,
    existingMaterials,
  };
}
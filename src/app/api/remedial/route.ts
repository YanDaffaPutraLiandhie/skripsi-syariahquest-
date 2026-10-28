import { NextRequest, NextResponse } from "next/server";
import { panggilGemini } from "@/lib/gemini";

/**
 * API Route: /api/remedial
 * Menerima daftar soal salah dan mengembalikan modul remedial hybrid.
 * 
 * Alur:
 * 1. Coba hubungi Python RAG Engine (http://127.0.0.1:8000/api/remedial) jika sedang aktif.
 * 2. Jika Python RAG aktif, gunakan hasil pencarian Cosine Similarity vecs + Gemini fallback dari Python.
 * 3. Jika Python RAG tidak aktif (offline), fallback secara otomatis ke Gemini AI bawaan Next.js.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { soal, threshold = 70 } = body as { soal: string[]; threshold?: number };

    if (!soal || !Array.isArray(soal) || soal.length === 0) {
      return NextResponse.json(
        { error: "Parameter 'soal' (array teks soal yang salah) diperlukan." },
        { status: 400 }
      );
    }

    // 1. Coba hubungi Python RAG Server (Remedial.py --serve)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5 detik timeout

      const pythonRes = await fetch("http://127.0.0.1:8000/api/remedial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soal, threshold }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (pythonRes.ok) {
        const pythonData = await pythonRes.json();
        return NextResponse.json({
          ...pythonData,
          engine: "python_vecs_rag",
        });
      }
    } catch {
      // Python engine offline / timeout, lanjut ke fallback Next.js internal
      console.log("[/api/remedial] Python RAG engine offline, beralih ke Next.js Gemini fallback.");
    }

    // 2. Fallback Langsung Menggunakan Gemini AI
    const materiList: string[] = [];
    const detailRekomendasi = [];

    for (const pertanyaan of soal) {
      const prompt = `Anda adalah dosen dan ahli Fikih Muamalah / Ekonomi Syariah.
Seorang mahasiswa salah menjawab pertanyaan kuis berikut:
"${pertanyaan}"

Buatkan modul remedial singkat yang jelas, akademis, dan mudah dipahami:
1. Konsep dasar dan definisi yang benar.
2. Dalil syariat / kaidah fikih yang relevan.
3. Contoh kasus nyata atau kesimpulan aplikatif.
Format jawaban dalam Markdown terstruktur dengan judul topik.`;

      try {
        const aiText = await panggilGemini(prompt, {
          system: "Kamu adalah tutor akademik syariah yang ramah, mendidik, dan berbasis prinsip Islam moderat.",
          temperature: 0.4,
        });

        materiList.push(aiText);
        detailRekomendasi.push({
          soal: pertanyaan,
          sumber: "gemini_native_ai",
          kemiripan: 0,
          judul: `Remedial: ${pertanyaan.slice(0, 45)}...`,
          topik: "Ekstensi AI",
        });
      } catch (geminiError) {
        console.error("Gemini call error:", geminiError);
        materiList.push(
          `### Remedial Khusus\nUntuk soal: *"${pertanyaan}"*\n\n` +
          `Pastikan Anda mengkaji kembali ketentuan rukun, syarat, dan kaidah fikih terkait topik ini di modul utama.`
        );
      }
    }

    return NextResponse.json({
      judul_halaman: "MODUL REMEDIAL HYBRID MAHASISWA",
      isi_pembelajaran: materiList.join("\n\n---\n\n"),
      topik_terkait: ["Fikih Syariah", "Ekstensi AI"],
      detail_rekomendasi: detailRekomendasi,
      engine: "nextjs_gemini_fallback",
    });

  } catch (error) {
    console.error("Error in /api/remedial:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat materi remedial.", detail: String(error) },
      { status: 500 }
    );
  }
}

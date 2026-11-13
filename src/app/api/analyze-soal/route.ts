import { NextRequest, NextResponse } from "next/server";
import { panggilGemini } from "@/lib/gemini";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { soal, idModul, learningObjects } = body as {
      soal?: string;
      idModul?: number;
      learningObjects?: Array<{ id_sub_topik: number; lo_code: string | null; judul: string; keywords?: string | null }>;
    };

    if (!soal || soal.trim().length < 10) {
      return NextResponse.json({ error: "Teks soal terlalu pendek" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseAdmin = getAdminClient();
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    // Deteksi tingkat kesulitan via AI berdasarkan ciri-ciri teks soal
    const prompt = `Anda adalah psikometrisi. Tugas Anda menilai tingkat kesulitan kognitif dari sebuah soal pilihan ganda berikut dalam bidang ekonomi syariah.

Soal: "${soal}"

Tentukan tingkat kesulitan dengan satu nilai numerik dari tiga pilihan:
- 950 = Mudah (definisi dasar, hafalan konsep, informasi eksplisit dari materi)
- 1100 = Sedang (pemahaman konsep, penerapan sederhana, analisis ringkas)
- 1250 = Sulit (analisis kompleks, studi kasus multikriteria, sintesis, evaluasi)

Balas HANYA JSON tanpa teks lain:
{"difficulty_rating": 950, "alasan": "penjelasan singkat mengapa tingkat ini"}`;

    const raw = await panggilGemini(prompt, { temperature: 0.2 });
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    let difficultyRating = 1100;
    let alasan = "Terdeteksi berdasarkan kompleksitas soal.";
    if (start !== -1 && end !== -1) {
      try {
        const parsed = JSON.parse(raw.slice(start, end + 1));
        const val = Number(parsed.difficulty_rating);
        if ([950, 1100, 1250].includes(val)) difficultyRating = val;
        if (parsed.alasan) alasan = String(parsed.alasan);
      } catch {
        // fallback ke default
      }
    }

    // Deteksi LO yang paling cocok berdasarkan kata kunci (jika learningObjects disediakan)
    let matchedLO: { id_sub_topik: number; lo_code: string | null; judul: string; score: number } | null = null;
    if (learningObjects && learningObjects.length > 0) {
      const q = soal.toLowerCase();
      for (const lo of learningObjects) {
        const keywords = ((lo.keywords || lo.judul) || "").split(",").map((k) => k.trim()).filter(Boolean);
        let score = 0;
        for (const kw of keywords) {
          if (kw.length > 2 && q.includes(kw.toLowerCase())) score += 1;
        }
        if (lo.judul && q.includes(lo.judul.toLowerCase())) score += 2;
        if (score > 0 && (!matchedLO || score > matchedLO.score)) {
          matchedLO = { ...lo, score };
        }
      }
    }

    return NextResponse.json({
      success: true,
      difficulty_rating: difficultyRating,
      difficulty_label: difficultyRating === 950 ? "Mudah" : difficultyRating === 1100 ? "Sedang" : "Sulit",
      alasan,
      matched_lo: matchedLO ? {
        id_sub_topik: matchedLO.id_sub_topik,
        lo_code: matchedLO.lo_code,
        judul: matchedLO.judul,
      } : null,
    });
  } catch (err) {
    console.error("[analyze-soal] Error:", err);
    return NextResponse.json(
      { error: "Gagal menganalisis soal", detail: String(err) },
      { status: 500 },
    );
  }
}

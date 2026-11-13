import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { panggilGemini } from "@/lib/gemini";

// ─── Types ───────────────────────────────────────────────────────────────────

type GeneratedQuestion = {
  lo_code: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_key: "A" | "B" | "C" | "D";
  difficulty_rating: number;
  reason_correct: string;
};

type SavedQuestion = {
  id_soal: number;
  soal: string;
  lo_code: string;
  id_sub_topik: number | null;
  difficulty_rating: number;
  jawaban: Array<{ id_jawaban: number; jawaban: string; jawaban_benar: boolean }>;
};

type RequestBody = {
  idModul: number;
  loCode?: string;          // e.g. "LO1" — if provided, generates for one LO only
  sourceText?: string;      // raw text segment to generate from (overrides DB lookup)
  numQuestions?: number;    // default 5, max 10
  saveToDb?: boolean;       // default true — save soal+jawaban to Supabase
  dryRun?: boolean;         // if true, only return generated JSON without saving
};

// ─── Supabase admin client ────────────────────────────────────────────────────

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Prompt builder (Psychometrician persona) ─────────────────────────────────

function buildPrompt(
  loCode: string,
  sourceText: string,
  numQuestions: number,
): string {
  return `Role: You are a professional Psychometrician and Academic Assessment Specialist. Your task is to generate highly accurate, contextualized multiple-choice quiz questions based exclusively on the specific text segment below.

Strict Operational Guidelines:
1. Generate exactly ${numQuestions} multiple-choice questions (with options A, B, C, D) based ONLY on the provided text.
2. Anti-Hallucination Policy: The question, the correct answer, and all incorrect distractors MUST be 100% derived from and validated by the provided source text. Do NOT use external knowledge or vocabulary absent from this segment.
3. Provide a clear pedagogical rationale (reason_correct) explaining why the chosen key is factually correct according to the text.
4. Distribute correct answers across A, B, C, D — do NOT put all correct answers in the same position.
5. Assign a difficulty_rating matching the question's cognitive demand: 950 (easy), 1100 (medium), or 1250 (hard). Use only these numeric values.
6. Write questions and options in Indonesian (Bahasa Indonesia), keeping Islamic Finance terms (Murabahah, Gharar, Riba, etc.) in their original form.

Output Format: Return ONLY a raw JSON array — no markdown, no extra text. Must be directly parseable.

Schema:
[
  {
    "lo_code": "${loCode}",
    "question": "...",
    "option_a": "...",
    "option_b": "...",
    "option_c": "...",
    "option_d": "...",
    "correct_key": "A|B|C|D",
    "difficulty_rating": 1100,
    "reason_correct": "..."
  }
]

ASSIGNED LO CODE: ${loCode}

SOURCE MATERIAL TEXT SEGMENT:
${sourceText.substring(0, 8000)}`;
}

// ─── Save questions to Supabase ───────────────────────────────────────────────

async function saveQuestionsToDb(
  supabaseAdmin: ReturnType<typeof getAdminClient>,
  idModul: number,
  questions: GeneratedQuestion[],
  loCodeToSubTopikMap: Map<string, number | null>,
): Promise<SavedQuestion[]> {
  const saved: SavedQuestion[] = [];

  for (const q of questions) {
    const idSubTopik = loCodeToSubTopikMap.get(q.lo_code) ?? null;

    // Insert into soal
    const { data: soalRow, error: soalErr } = await supabaseAdmin
      .from("soal")
      .insert({
        id_modul: idModul,
        soal: q.question,
        id_sub_topik: idSubTopik,
        lo_code: q.lo_code,
        difficulty_rating: q.difficulty_rating,
        is_ai_generated: true,
        reason_correct: q.reason_correct,
      })
      .select("id_soal")
      .single();

    if (soalErr || !soalRow) {
      console.error("[generate-questions] Failed to insert soal:", soalErr);
      continue;
    }

    const idSoal = soalRow.id_soal;

    // Build jawaban rows
    const optionMap: Record<string, string> = {
      A: q.option_a,
      B: q.option_b,
      C: q.option_c,
      D: q.option_d,
    };

    const jawabanRows = (["A", "B", "C", "D"] as const).map((key) => ({
      id_soal: idSoal,
      jawaban: optionMap[key],
      jawaban_benar: key === q.correct_key,
      // Also keep is_benar for backward compatibility
      is_benar: key === q.correct_key,
      penjelasan:
        key === q.correct_key
          ? q.reason_correct
          : `Jawaban ini kurang tepat. Jawaban yang benar adalah ${q.correct_key}: ${optionMap[q.correct_key]}`,
      option_key: key,
    }));

    const { data: jawRows, error: jawErr } = await supabaseAdmin
      .from("jawaban")
      .insert(jawabanRows)
      .select("id_jawaban, jawaban, jawaban_benar");

    if (jawErr) {
      console.error("[generate-questions] Failed to insert jawaban:", jawErr);
    }

    saved.push({
      id_soal: idSoal,
      soal: q.question,
      lo_code: q.lo_code,
      id_sub_topik: idSubTopik,
      difficulty_rating: q.difficulty_rating,
      jawaban: jawRows ?? [],
    });
  }

  return saved;
}

// ─── POST /api/generate-questions ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const {
      idModul,
      loCode,
      sourceText,
      numQuestions = 5,
      saveToDb = true,
      dryRun = false,
    } = body;

    // ── Validate ──
    if (!idModul) {
      return NextResponse.json({ error: "idModul diperlukan" }, { status: 400 });
    }
    const clampedNum = Math.min(Math.max(numQuestions, 1), 10);

    // ── Authenticate ──
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseAdmin = getAdminClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    // ── Resolve LOs from DB if no sourceText provided ──
    type SubTopikRow = {
      id_sub_topik: number;
      lo_code: string | null;
      judul: string;
      remedial_text: string | null;
      keywords: string | null;
    };

    let losToProcess: Array<{ loCode: string; text: string; idSubTopik: number | null }> = [];
    const loCodeToSubTopikMap = new Map<string, number | null>();

    if (sourceText && loCode) {
      // Direct mode: caller provides text + LO code
      losToProcess = [{ loCode, text: sourceText, idSubTopik: null }];
    } else {
      // DB mode: fetch sub_topik for the module
      const { data: subTopikRows, error: stErr } = await supabaseAdmin
        .from("sub_topik")
        .select("id_sub_topik, lo_code, judul, remedial_text, keywords")
        .eq("id_modul", idModul)
        .order("lo_code", { ascending: true });

      if (stErr || !subTopikRows || subTopikRows.length === 0) {
        return NextResponse.json(
          {
            error:
              "Sub-topik / Learning Objects tidak ditemukan untuk modul ini. " +
              "Jalankan /api/generate-lo terlebih dahulu.",
          },
          { status: 404 },
        );
      }

      // If loCode filter given, only process that one
      const filtered = loCode
        ? (subTopikRows as SubTopikRow[]).filter((st) => st.lo_code === loCode)
        : (subTopikRows as SubTopikRow[]);

      if (filtered.length === 0) {
        return NextResponse.json(
          { error: `LO code "${loCode}" tidak ditemukan di modul ini.` },
          { status: 404 },
        );
      }

      // Also fetch module's teks_materi as base context
      const { data: modul } = await supabaseAdmin
        .from("modul")
        .select("teks_materi, nama_modul")
        .eq("id_modul", idModul)
        .single();

      const baseMateri = modul?.teks_materi ?? "";

      for (const st of filtered) {
        const stRow = st as SubTopikRow;
        loCodeToSubTopikMap.set(stRow.lo_code ?? stRow.judul, stRow.id_sub_topik);

        // Build contextual text from: remedial_text + keywords + excerpt from base materi
        const contextParts: string[] = [];
        contextParts.push(`## Sub-Topik: ${stRow.judul}`);
        if (stRow.keywords) contextParts.push(`Kata Kunci: ${stRow.keywords}`);
        if (stRow.remedial_text) contextParts.push(`\nRingkasan Materi:\n${stRow.remedial_text}`);
        if (baseMateri) {
          // Extract relevant section from base material using keywords
          const keywords = (stRow.keywords ?? stRow.judul).split(",").map((k) => k.trim()).slice(0, 3);
          let relevantExcerpt = "";
          for (const kw of keywords) {
            const idx = baseMateri.toLowerCase().indexOf(kw.toLowerCase());
            if (idx !== -1) {
              const start = Math.max(0, idx - 200);
              const end = Math.min(baseMateri.length, idx + 1500);
              relevantExcerpt += baseMateri.slice(start, end) + "\n\n";
              break;
            }
          }
          if (relevantExcerpt) contextParts.push(`\nMateri Referensi:\n${relevantExcerpt}`);
        }

        losToProcess.push({
          loCode: stRow.lo_code ?? stRow.judul,
          text: contextParts.join("\n"),
          idSubTopik: stRow.id_sub_topik,
        });
      }
    }

    // ── Generate questions for each LO ──
    const allGenerated: GeneratedQuestion[] = [];
    const errors: Array<{ loCode: string; error: string }> = [];

    for (const lo of losToProcess) {
      try {
        const prompt = buildPrompt(lo.loCode, lo.text, clampedNum);
        const raw = await panggilGemini(prompt, { temperature: 0.3 });

        // Parse JSON (tolerant)
        const start = raw.indexOf("[");
        const end = raw.lastIndexOf("]");
        if (start === -1 || end === -1) {
          errors.push({ loCode: lo.loCode, error: "AI tidak mengembalikan JSON array" });
          continue;
        }

        let parsed: GeneratedQuestion[];
        try {
          parsed = JSON.parse(raw.slice(start, end + 1));
        } catch {
          errors.push({ loCode: lo.loCode, error: "Gagal parse JSON dari AI" });
          continue;
        }

        // Normalize LO codes and validate ratings used by adaptive difficulty selection.
        parsed = parsed.map((q) => ({
          ...q,
          lo_code: lo.loCode,
          difficulty_rating: Number(q.difficulty_rating),
        }));
        if (
          parsed.some(
            (q) =>
              !Number.isInteger(q.difficulty_rating) ||
              ![950, 1100, 1250].includes(q.difficulty_rating),
          )
        ) {
          errors.push({
            loCode: lo.loCode,
            error: "AI menghasilkan difficulty_rating di luar nilai 950, 1100, atau 1250.",
          });
          continue;
        }

        // Map idSubTopik into the map
        if (lo.idSubTopik !== null) {
          loCodeToSubTopikMap.set(lo.loCode, lo.idSubTopik);
        }

        allGenerated.push(...parsed);
      } catch (err) {
        errors.push({ loCode: lo.loCode, error: String(err) });
      }
    }

    if (allGenerated.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada soal yang berhasil di-generate", errors },
        { status: 500 },
      );
    }

    // ── Save to DB unless dryRun ──
    let savedQuestions: SavedQuestion[] = [];
    if (saveToDb && !dryRun) {
      savedQuestions = await saveQuestionsToDb(
        supabaseAdmin,
        idModul,
        allGenerated,
        loCodeToSubTopikMap,
      );
    }

    return NextResponse.json({
      success: true,
      idModul,
      generated: allGenerated.length,
      saved: savedQuestions.length,
      dryRun,
      questions: dryRun ? allGenerated : savedQuestions,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[generate-questions] Error:", err);
    return NextResponse.json(
      { error: "Gagal generate soal", detail: String(err) },
      { status: 500 },
    );
  }
}

// ─── GET /api/generate-questions?idModul=X&loCode=LO1 ────────────────────────
// Fetch existing AI-generated questions for a module (with optional LO filter)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idModul = Number(searchParams.get("idModul"));
    const loCode = searchParams.get("loCode") ?? undefined;

    if (!idModul) {
      return NextResponse.json({ error: "idModul diperlukan" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseAdmin = getAdminClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    let query = supabaseAdmin
      .from("soal")
      .select("id_soal, soal, lo_code, id_sub_topik, difficulty_rating, is_ai_generated, jawaban(id_jawaban, jawaban, jawaban_benar, option_key)")
      .eq("id_modul", idModul)
      .order("id_soal", { ascending: true });

    if (loCode) {
      query = query.eq("lo_code", loCode);
    }

    const { data: soalRows, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      idModul,
      loCode: loCode ?? "all",
      count: soalRows?.length ?? 0,
      questions: soalRows ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal mengambil soal", detail: String(err) },
      { status: 500 },
    );
  }
}

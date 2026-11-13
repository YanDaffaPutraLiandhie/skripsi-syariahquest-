
import { NextRequest, NextResponse } from "next/server";
import { panggilGemini } from "@/lib/gemini";
import { createClient } from "@supabase/supabase-js";

export type LearningObject = {
  id_sub_topik: number;
  lo_code: string | null;
  judul: string;
  keywords: string | null;
  remedial_text: string | null;
};

type LearningObjectAI = {
  lo_code: string;
  topic_name: string;
  keywords: string;
  remedial_text: string;
};

function jsonError(
  message: string,
  status: number,
  detail?: string,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(detail ? { detail } : {}),
    },
    { status },
  );
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables belum dikonfigurasi.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("AUTH_TOKEN_MISSING");
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    throw new Error("AUTH_TOKEN_MISSING");
  }

  const supabaseAdmin = getAdminClient();

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new Error("AUTH_INVALID");
  }

  return { supabaseAdmin, user };
}

function buildPrompt(
  namaModul: string,
  teksMateri: string,
): string {
  return `
Role: You are an expert Instructional Designer for an Adaptive Learning platform.

Analyze the provided learning material and divide it into 3 to 4 distinct Learning Objects.

INSTRUCTIONS:

1. Identify 3 to 4 distinct sub-topics.
2. Give each sub-topic a sequential code: LO1, LO2, LO3, optionally LO4.
3. Each LO must have 5 to 8 specific keywords.
4. Keywords must be relevant and written in Indonesian.
5. Generate concise remedial learning content.
6. Remedial content should contain 3 to 5 bullet points.
7. Do not invent concepts outside the provided material.
8. Avoid duplicate topics.

IMPORTANT:
Return ONLY a valid raw JSON array.
Do not use Markdown code blocks.
Do not include explanations outside the JSON.

SCHEMA:

[
  {
    "lo_code": "LO1",
    "topic_name": "Judul Sub Topik",
    "keywords": "keyword1, keyword2, keyword3, keyword4, keyword5",
    "remedial_text": "• Poin pertama\\n• Poin kedua\\n• Poin ketiga"
  }
]

MODULE:
${namaModul}

LEARNING MATERIAL:
${teksMateri.substring(0, 12000)}
`;
}

function parseLearningObjects(raw: string): LearningObjectAI[] {
  if (!raw || typeof raw !== "string") {
    throw new Error("Gemini mengembalikan respons kosong.");
  }

  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Gemini tidak mengembalikan JSON array yang valid.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned.substring(start, end + 1));
  } catch {
    throw new Error("Format JSON dari Gemini tidak valid.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Gemini tidak menghasilkan Learning Objects.");
  }

  return parsed.slice(0, 4).map((item: unknown, index: number) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Learning Object ke-${index + 1} tidak valid.`);
    }

    const value = item as Record<string, unknown>;

    const topicName =
      typeof value.topic_name === "string"
        ? value.topic_name.trim()
        : "";

    const loCode =
      typeof value.lo_code === "string" && value.lo_code.trim()
        ? value.lo_code.trim()
        : `LO${index + 1}`;

    const keywords =
      typeof value.keywords === "string"
        ? value.keywords.trim()
        : "";

    const remedialText =
      typeof value.remedial_text === "string"
        ? value.remedial_text.trim()
        : "";

    if (!topicName) {
      throw new Error(`Judul ${loCode} kosong.`);
    }

    return {
      lo_code: loCode,
      topic_name: topicName,
      keywords:
        keywords ||
        topicName
          .split(/[\s,.;]+/)
          .filter((word) => word.length > 2)
          .slice(0, 8)
          .join(", "),
      remedial_text:
        remedialText ||
        `• Pelajari konsep ${topicName}\n• Pahami istilah penting dalam materi\n• Kerjakan soal terkait ${loCode}`,
    };
  });
}

async function saveLearningObjects(
  supabaseAdmin: ReturnType<typeof getAdminClient>,
  idModul: number,
  los: LearningObjectAI[],
): Promise<LearningObject[]> {
  for (const lo of los) {
    const { data: existing, error: findError } =
      await supabaseAdmin
        .from("sub_topik")
        .select("id_sub_topik")
        .eq("id_modul", idModul)
        .eq("lo_code", lo.lo_code)
        .maybeSingle();

    if (findError) {
      throw new Error(
        `Gagal memeriksa ${lo.lo_code}: ${findError.message}`,
      );
    }

    if (existing?.id_sub_topik) {
      const { error } = await supabaseAdmin
        .from("sub_topik")
        .update({
          judul: lo.topic_name,
          keywords: lo.keywords,
          remedial_text: lo.remedial_text,
          updated_at: new Date().toISOString(),
        })
        .eq("id_sub_topik", existing.id_sub_topik);

      if (error) {
        throw new Error(
          `Gagal memperbarui ${lo.lo_code}: ${error.message}`,
        );
      }
    } else {
      const { error } = await supabaseAdmin
        .from("sub_topik")
        .insert({
          id_modul: idModul,
          lo_code: lo.lo_code,
          judul: lo.topic_name,
          keywords: lo.keywords,
          remedial_text: lo.remedial_text,
        });

      if (error) {
        throw new Error(
          `Gagal menyimpan ${lo.lo_code}: ${error.message}`,
        );
      }
    }
  }

  const { data, error } = await supabaseAdmin
    .from("sub_topik")
    .select("id_sub_topik, lo_code, judul, keywords, remedial_text")
    .eq("id_modul", idModul)
    .order("lo_code", { ascending: true });

  if (error) {
    throw new Error(`Gagal mengambil Learning Objects: ${error.message}`);
  }

  return (data ?? []) as LearningObject[];
}

// ======================================================
// POST - GENERATE LEARNING OBJECTS
// ======================================================

export async function POST(request: NextRequest) {
  try {
    let body: {
      idModul?: number;
      teksMateri?: string;
    };

    try {
      body = await request.json();
    } catch {
      return jsonError("Format request tidak valid.", 400);
    }

    const idModul =
      body.idModul !== undefined ? Number(body.idModul) : undefined;

    if (
      body.idModul !== undefined &&
      (!Number.isInteger(idModul) || (idModul as number) <= 0)
    ) {
      return jsonError("ID modul tidak valid.", 400);
    }

    let supabaseAdmin;

    try {
      const auth = await authenticate(request);
      supabaseAdmin = auth.supabaseAdmin;
    } catch (authError) {
      const message =
        authError instanceof Error ? authError.message : "";

      if (message === "AUTH_TOKEN_MISSING") {
        return jsonError("Token login tidak ditemukan.", 401);
      }

      if (message === "AUTH_INVALID") {
        return jsonError("Sesi login tidak valid. Silakan login kembali.", 401);
      }

      throw authError;
    }

    let namaModul = "Modul Syariah";
    let teksMateri =
      typeof body.teksMateri === "string" ? body.teksMateri : "";

    if (idModul !== undefined) {
      const { data: modul, error } = await supabaseAdmin
        .from("modul")
        .select("nama_modul, teks_materi")
        .eq("id_modul", idModul)
        .single();

      if (error || !modul) {
        return jsonError("Modul tidak ditemukan.", 404);
      }

      namaModul = modul.nama_modul || "Modul Syariah";
      teksMateri = modul.teks_materi || teksMateri;
    }

    if (!teksMateri || teksMateri.trim().length < 50) {
      return jsonError(
        "Teks materi terlalu singkat. Minimal 50 karakter.",
        400,
      );
    }

    const prompt = buildPrompt(namaModul, teksMateri.trim());

    let raw: string;

    try {
      raw = await panggilGemini(prompt, {
        temperature: 0.2,
      });
    } catch (geminiError) {
      const message =
        geminiError instanceof Error
          ? geminiError.message
          : String(geminiError);

      const unavailable =
        /503|UNAVAILABLE|overloaded|high demand|service unavailable/i.test(
          message,
        );

      console.error(
        "[generate-lo] Gemini error:",
        message.substring(0, 500),
      );

      return jsonError(
        unavailable
          ? "Layanan Gemini sedang sibuk atau tidak tersedia. Silakan coba kembali beberapa saat lagi."
          : "Gagal menghubungi layanan Gemini.",
        unavailable ? 503 : 502,
        message.substring(0, 500),
      );
    }

    let los: LearningObjectAI[];

    try {
      los = parseLearningObjects(raw);
    } catch (parseError) {
      const message =
        parseError instanceof Error
          ? parseError.message
          : "Respons AI tidak dapat diproses.";

      console.error("[generate-lo] Parse error:", message);

      return jsonError(
        "Gagal memproses hasil Learning Objects dari AI.",
        502,
        message,
      );
    }

    let savedLOs: LearningObject[];

    if (idModul !== undefined) {
      try {
        savedLOs = await saveLearningObjects(
          supabaseAdmin,
          idModul,
          los,
        );
      } catch (dbError) {
        const message =
          dbError instanceof Error
            ? dbError.message
            : "Database error.";

        console.error(
          "[generate-lo] Database error:",
          message.substring(0, 500),
        );

        return jsonError(
          "Learning Objects berhasil dibuat, tetapi gagal disimpan ke database.",
          500,
          message.substring(0, 500),
        );
      }
    } else {
      savedLOs = los.map((lo) => ({
        id_sub_topik: 0,
        lo_code: lo.lo_code,
        judul: lo.topic_name,
        keywords: lo.keywords,
        remedial_text: lo.remedial_text,
      }));
    }

    return NextResponse.json({
      success: true,
      idModul: idModul ?? null,
      namaModul,
      los: savedLOs,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan pada server.";

    console.error(
      "[generate-lo] Server error:",
      message.substring(0, 500),
    );

    return jsonError(
      "Gagal generate Learning Objects.",
      500,
      message.substring(0, 500),
    );
  }
}

// ======================================================
// GET - FETCH EXISTING LEARNING OBJECTS
// ======================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idModul = Number(searchParams.get("idModul"));

    if (!Number.isInteger(idModul) || idModul <= 0) {
      return jsonError("ID modul tidak valid.", 400);
    }

    let supabaseAdmin;

    try {
      const auth = await authenticate(request);
      supabaseAdmin = auth.supabaseAdmin;
    } catch (authError) {
      const message =
        authError instanceof Error ? authError.message : "";

      if (message === "AUTH_TOKEN_MISSING") {
        return jsonError("Token login tidak ditemukan.", 401);
      }

      if (message === "AUTH_INVALID") {
        return jsonError("Sesi login tidak valid. Silakan login kembali.", 401);
      }

      throw authError;
    }

    const { data, error } = await supabaseAdmin
      .from("sub_topik")
      .select("id_sub_topik, lo_code, judul, keywords, remedial_text")
      .eq("id_modul", idModul)
      .order("lo_code", { ascending: true });

    if (error) {
      console.error(
        "[generate-lo] GET database error:",
        error.message.substring(0, 500),
      );

      return jsonError(
        "Gagal mengambil Learning Objects dari database.",
        500,
        error.message.substring(0, 500),
      );
    }

    return NextResponse.json({
      success: true,
      idModul,
      los: (data ?? []) as LearningObject[],
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan pada server.";

    console.error(
      "[generate-lo] GET server error:",
      message.substring(0, 500),
    );

    return jsonError(
      "Gagal mengambil Learning Objects.",
      500,
      message.substring(0, 500),
    );
  }
}

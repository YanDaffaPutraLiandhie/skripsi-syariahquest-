import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  AdaptiveLearningPlan,
  LearningObjectMastery,
} from "@/lib/adaptiveLearning";

type SubTopikRow = {
  id_sub_topik: number;
  lo_code: string | null;
  judul: string;
  urutan: number | null;
  remedial_text: string | null;
};

type ConceptRow = {
  id_sub_topik: number;
  tingkat_pemahaman: number;
  total_jawaban: number;
  total_benar: number;
};

type QuestionRow = {
  id_sub_topik: number | null;
  lo_code: string | null;
};

const MASTERY_THRESHOLD = 0.8;

async function getStudentId(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Token tidak ditemukan", status: 401 as const };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return { error: "Tidak terautentikasi", status: 401 as const };
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from("user")
    .select("id_mahasiswa")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (userError) {
    console.error("[adaptive-learning] Failed to resolve student:", userError);
    return { error: "Gagal memuat profil mahasiswa", status: 500 as const };
  }
  if (!userRow?.id_mahasiswa) {
    return { error: "Endpoint ini hanya tersedia untuk mahasiswa", status: 403 as const };
  }

  return { idMahasiswa: Number(userRow.id_mahasiswa) };
}

function parseModuleId(value: unknown): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function buildPlan(
  idMahasiswa: number,
  idModul: number,
): Promise<AdaptiveLearningPlan> {
  const [subTopikRes, conceptRes, questionRes] = await Promise.all([
    supabaseAdmin
      .from("sub_topik")
      .select("id_sub_topik, lo_code, judul, urutan, remedial_text")
      .eq("id_modul", idModul)
      .order("urutan", { ascending: true }),
    supabaseAdmin
      .from("konsep_mahasiswa")
      .select("id_sub_topik, tingkat_pemahaman, total_jawaban, total_benar")
      .eq("id_mahasiswa", idMahasiswa)
      .eq("id_modul", idModul),
    supabaseAdmin
      .from("soal")
      .select("id_sub_topik, lo_code")
      .eq("id_modul", idModul),
  ]);

  if (subTopikRes.error) throw subTopikRes.error;
  if (conceptRes.error) throw conceptRes.error;
  if (questionRes.error) throw questionRes.error;

  const subTopik = (subTopikRes.data ?? []) as SubTopikRow[];
  const concepts = new Map(
    ((conceptRes.data ?? []) as ConceptRow[]).map((row) => [row.id_sub_topik, row]),
  );
  const questionCounts = new Map<number, number>();
  const idByCode = new Map(
    subTopik
      .filter((row) => row.lo_code)
      .map((row) => [row.lo_code as string, row.id_sub_topik]),
  );

  for (const question of (questionRes.data ?? []) as QuestionRow[]) {
    const idSubTopik =
      question.id_sub_topik ??
      (question.lo_code ? idByCode.get(question.lo_code) ?? null : null);
    if (idSubTopik !== null) {
      questionCounts.set(idSubTopik, (questionCounts.get(idSubTopik) ?? 0) + 1);
    }
  }

  const learningObjects: LearningObjectMastery[] = subTopik.map((row) => {
    const concept = concepts.get(row.id_sub_topik);
    return {
      id_sub_topik: row.id_sub_topik,
      lo_code: row.lo_code,
      judul: row.judul,
      urutan: Number(row.urutan ?? 0),
      masteryProbability: Math.max(
        0,
        Math.min(1, Number(concept?.tingkat_pemahaman ?? 0.1)),
      ),
      totalAnswers: Number(concept?.total_jawaban ?? 0),
      totalCorrect: Number(concept?.total_benar ?? 0),
      questionCount: questionCounts.get(row.id_sub_topik) ?? 0,
      remedialText: row.remedial_text,
    };
  });

  const available = learningObjects
    .filter((item) => item.questionCount > 0)
    .sort(
      (left, right) =>
        left.masteryProbability - right.masteryProbability ||
        left.urutan - right.urutan,
    );
  const nextLearningObject =
    available.find((item) => item.masteryProbability < MASTERY_THRESHOLD) ??
    available[0] ??
    null;

  const probability = nextLearningObject?.masteryProbability ?? 0;
  const difficulty =
    probability < 0.4
      ? { key: "foundation" as const, label: "Dasar", targetQuantile: 0.25 }
      : probability < MASTERY_THRESHOLD
        ? { key: "practice" as const, label: "Latihan", targetQuantile: 0.5 }
        : { key: "challenge" as const, label: "Tantangan", targetQuantile: 0.75 };
  const reason = !nextLearningObject
    ? "Soal modul belum dipetakan ke Learning Object. Personalisasi soal aktif setelah dosen menghubungkan soal ke sub-topik."
    : nextLearningObject.masteryProbability >= MASTERY_THRESHOLD
      ? "Semua Learning Object yang memiliki soal sudah mencapai target. Latihan tantangan dipilih untuk menjaga ingatan."
      : nextLearningObject.totalAnswers === 0
        ? `Kita mulai dari ${nextLearningObject.judul}, Learning Object berikutnya dalam urutan materi.`
        : `Estimasi penguasaan ${nextLearningObject.judul} masih ${Math.round(nextLearningObject.masteryProbability * 100)}%. Materi ini diprioritaskan untuk memperkuat pemahaman.`;

  return {
    engine: "bkt",
    moduleId: idModul,
    masteryThreshold: MASTERY_THRESHOLD,
    learningObjects,
    nextLearningObject,
    difficulty,
    reason,
  };
}

export async function GET(request: NextRequest) {
  try {
    const student = await getStudentId(request);
    if ("error" in student) {
      return NextResponse.json({ error: student.error }, { status: student.status });
    }

    const idModul = parseModuleId(new URL(request.url).searchParams.get("idModul"));
    if (!idModul) {
      return NextResponse.json({ error: "idModul tidak valid" }, { status: 400 });
    }

    const plan = await buildPlan(student.idMahasiswa, idModul);
    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("[adaptive-learning] Failed to build plan:", error);
    return NextResponse.json(
      { error: "Gagal memuat rekomendasi pembelajaran adaptif" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const student = await getStudentId(request);
    if ("error" in student) {
      return NextResponse.json({ error: student.error }, { status: student.status });
    }

    const body = await request.json();
    const idModul = parseModuleId(body?.idModul);
    const submissionKey =
      typeof body?.submissionKey === "string" ? body.submissionKey : "";
    const responses = body?.responses;

    if (
      !idModul ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        submissionKey,
      ) ||
      !Array.isArray(responses) ||
      responses.length === 0 ||
      responses.length > 50
    ) {
      return NextResponse.json({ error: "Data hasil kuis tidak valid" }, { status: 400 });
    }

    const seenQuestionIds = new Set<number>();
    const rows: Array<{ id_soal: number; id_jawaban: number | null }> = [];
    for (const response of responses) {
      const idSoal = parseModuleId(response?.id_soal);
      const idJawaban =
        response?.id_jawaban === null ? null : parseModuleId(response?.id_jawaban);
      if (
        !idSoal ||
        (response?.id_jawaban !== null && !idJawaban) ||
        seenQuestionIds.has(idSoal)
      ) {
        return NextResponse.json({ error: "Daftar jawaban tidak valid" }, { status: 400 });
      }
      seenQuestionIds.add(idSoal);
      rows.push({ id_soal: idSoal, id_jawaban: idJawaban });
    }

    const { data, error } = await supabaseAdmin.rpc("record_bkt_responses", {
      p_id_mahasiswa: student.idMahasiswa,
      p_id_modul: idModul,
      p_submission_key: submissionKey,
      p_rows: rows,
    });
    if (error) throw error;

    const plan = await buildPlan(student.idMahasiswa, idModul);
    const result = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      success: true,
      processed: Number(result?.o_processed ?? 0),
      unmapped: Number(result?.o_unmapped ?? 0),
      plan,
    });
  } catch (error) {
    console.error("[adaptive-learning] Failed to record responses:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan progres penguasaan. Coba simpan ulang." },
      { status: 500 },
    );
  }
}

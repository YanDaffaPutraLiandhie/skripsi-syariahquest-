import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateLearningMaterials, type MaterialGenerationInput } from "@/lib/aiMaterialGenerator";

// Type definitions for Supabase tables
type ModulRemedialRow = {
  urutan: number;
};

type WeakArea = {
  idSubTopik: number;
  judul: string;
  benar: number;
  total: number;
  persentaseBenar: number;
  soalSalah: Array<{
    idSoal: number;
    teksSoal: string;
    jawabanBenar: string;
    jawabanMahasiswa: string;
    idSubTopik: number | null;
  }>;
};

type AiRemedialJobUpsert = {
  id_mahasiswa: number;
  id_modul: number;
  id_attempt_ke: number;
  status: "pending" | "processing" | "completed" | "failed";
  weak_areas: WeakArea[] | null;
  generated_count: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

type AiRemedialJobUpdate = {
  status: "completed" | "failed";
  generated_count: number;
  error_message: string | null;
  completed_at: string;
};

type SupabaseAdminClient = ReturnType<typeof createClient>;

function getAdminClient(): SupabaseAdminClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Konfigurasi Supabase belum lengkap");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function saveAiRemedialMaterials(
  supabaseAdmin: SupabaseAdminClient,
  idMahasiswa: number,
  idModul: number,
  idAttemptKe: number,
  weakAreas: WeakArea[],
  generatedMaterials: Array<{
    id: string;
    judul: string;
    tipe: "ringkasan" | "penjelasan" | "contoh_soal" | "tips";
    konten: string;
    idSubTopik: number;
    prioritas: number;
  }>,
  moduleContext: { namaModul: string; teksMateri: string } | null,
): Promise<number> {
  let savedCount = 0;
  let urutan = 1;

  // Clean up any existing AI materials for this attempt to prevent duplicates
  await supabaseAdmin
    .from("modul_remedial")
    .delete()
    .eq("id_modul", idModul)
    .eq("id_mahasiswa", idMahasiswa)
    .eq("id_attempt_ke", idAttemptKe)
    .eq("is_ai_generated", true);

  // Get max urutan for this modul
  const { data: maxUrutan } = await supabaseAdmin
    .from("modul_remedial")
    .select("urutan")
    .eq("id_modul", idModul)
    .order("urutan", { ascending: false })
    .limit(1)
    .single<ModulRemedialRow>();

  if (maxUrutan?.urutan) {
    urutan = maxUrutan.urutan + 1;
  }

  for (const material of generatedMaterials) {
    // Prepare source material JSON
    const sourceMaterial = {
      subTopik: material.judul.replace(/^(Ringkasan Materi|Contoh Soal & Pembahasan|Tips Belajar):\s*/, ""),
      tipe: material.tipe,
      prioritas: material.prioritas,
      weakAreaDetail: weakAreas.find(w => w.idSubTopik === material.idSubTopik),
      moduleContext: moduleContext ? {
        namaModul: moduleContext.namaModul,
        teksMateri: moduleContext.teksMateri.substring(0, 500)
      } : null,
      generatedAt: new Date().toISOString(),
      ...(material as any).source,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("modul_remedial")
      .insert({
        id_modul: idModul,
        id_sub_topik: material.idSubTopik,
        judul: material.judul,
        tipe: "teks",
        konten: material.konten,
        urutan: urutan++,
        is_ai_generated: true,
        id_mahasiswa: idMahasiswa,
        id_attempt_ke: idAttemptKe,
        generated_at: new Date().toISOString(),
      });

    if (!error) {
      savedCount++;
    } else {
      console.error("Failed to save AI remedial:", error);
    }
  }

  return savedCount;
}

async function logGenerationJob(
  supabaseAdmin: SupabaseAdminClient,
  idMahasiswa: number,
  idModul: number,
  idAttemptKe: number,
  status: "pending" | "processing" | "completed" | "failed",
  weakAreas?: WeakArea[],
  generatedCount?: number,
  errorMessage?: string,
) {
  try {
    const now = new Date().toISOString();
    const isFinal = status === "completed" || status === "failed";

    if (!isFinal) {
      const upsertData: AiRemedialJobUpsert = {
        id_mahasiswa: idMahasiswa,
        id_modul: idModul,
        id_attempt_ke: idAttemptKe,
        status,
        weak_areas: weakAreas ? JSON.parse(JSON.stringify(weakAreas)) : null,
        generated_count: generatedCount ?? 0,
        error_message: errorMessage ?? null,
        created_at: now,
        completed_at: null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from("ai_remedial_generation_job")
        .upsert(upsertData, {
          onConflict: "id_mahasiswa,id_modul,id_attempt_ke",
        });
    } else {
      const updateData: AiRemedialJobUpdate = {
        status,
        generated_count: generatedCount ?? 0,
        error_message: errorMessage ?? null,
        completed_at: now,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from("ai_remedial_generation_job")
        .update(updateData)
        .eq("id_mahasiswa", idMahasiswa)
        .eq("id_modul", idModul)
        .eq("id_attempt_ke", idAttemptKe);
    }
  } catch (err) {
    console.warn("[logGenerationJob] Job logging skipped:", err);
  }
}

export async function POST(request: NextRequest) {
  let bodyData: { idModul?: number; idAttemptKe?: number } = {};
  try {
    bodyData = await request.json();
    const { idModul, idAttemptKe } = bodyData as { idModul: number; idAttemptKe: number };

    console.log("[generate-ai-remedial] Starting for idModul:", idModul, "idAttemptKe:", idAttemptKe);

    if (!idModul || !idAttemptKe) {
      return NextResponse.json(
        { error: "idModul dan idAttemptKe diperlukan" },
        { status: 400 },
      );
    }

    const supabaseAdmin = getAdminClient();

    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[generate-ai-remedial] No auth header");
      return NextResponse.json(
        { error: "Token autentikasi tidak ditemukan" },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.log("[generate-ai-remedial] Auth error:", authError);
      return NextResponse.json(
        { error: "Tidak terautentikasi" },
        { status: 401 },
      );
    }

    // Get user row to find the mahasiswa ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userRow, error: userError } = await (supabaseAdmin as any)
      .from("user")
      .select("id_mahasiswa")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || !userRow?.id_mahasiswa) {
      console.log("[generate-ai-remedial] User row error:", userError);
      return NextResponse.json(
        { error: "Profil mahasiswa tidak ditemukan" },
        { status: 404 },
      );
    }

    console.log("[generate-ai-remedial] Found idMahasiswa:", userRow.id_mahasiswa);

    const idMahasiswa = userRow.id_mahasiswa;

    // Get module info for passScore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: modul } = await (supabaseAdmin as any)
      .from("modul")
      .select("parameter_nilai, nama_modul, teks_materi")
      .eq("id_modul", idModul)
      .single();

    const passScore = Number(modul?.parameter_nilai ?? 80);

    const input: MaterialGenerationInput = {
      idMahasiswa,
      idModul,
      passScore,
    };

    console.log("[generate-ai-remedial] Input:", input);

    // Log job start
    await logGenerationJob(supabaseAdmin, idMahasiswa, idModul, idAttemptKe, "processing");

    // Generate materials
    const result = await generateLearningMaterials(input);

    console.log("[generate-ai-remedial] Weak areas:", result.weakAreas?.length, "Generated materials:", result.generatedMaterials?.length);

    // Save AI-generated materials to database
    const savedCount = await saveAiRemedialMaterials(
      supabaseAdmin,
      idMahasiswa,
      idModul,
      idAttemptKe,
      result.weakAreas,
      result.generatedMaterials,
      modul ? { namaModul: modul.nama_modul, teksMateri: modul.teks_materi } : null,
    );

    // Log job completion
    await logGenerationJob(
      supabaseAdmin,
      idMahasiswa,
      idModul,
      idAttemptKe,
      "completed",
      result.weakAreas,
      savedCount,
    );

    return NextResponse.json({
      success: true,
      savedCount,
      weakAreas: result.weakAreas,
      generatedMaterials: result.generatedMaterials,
    });
  } catch (error) {
    console.error("Generate AI remedial error:", error);
    
    // Try to log failure
    try {
      const { idModul, idAttemptKe } = bodyData as { idModul?: number; idAttemptKe?: number };
      if (!idModul || !idAttemptKe) return;
      const supabaseAdmin = getAdminClient();
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: userRow } = await (supabaseAdmin as any)
            .from("user")
            .select("id_mahasiswa")
            .eq("auth_user_id", user.id)
            .single();
          if (userRow?.id_mahasiswa) {
            await logGenerationJob(
              supabaseAdmin,
              userRow.id_mahasiswa,
              idModul,
              idAttemptKe,
              "failed",
              undefined,
              0,
              String(error),
            );
          }
        }
      }
    } catch {}

    return NextResponse.json(
      { error: "Gagal menghasilkan materi remedial AI", detail: String(error) },
      { status: 500 },
    );
  }
}
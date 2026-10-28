import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateLearningMaterials, type MaterialGenerationInput } from "@/lib/aiMaterialGenerator";

function getAdminClient() {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idModul } = body as { idModul: number };

    if (!idModul) {
      return NextResponse.json(
        { error: "idModul diperlukan" },
        { status: 400 },
      );
    }

    const supabaseAdmin = getAdminClient();

    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
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
      return NextResponse.json(
        { error: "Tidak terautentikasi" },
        { status: 401 },
      );
    }

    // Get user row to find the mahasiswa ID
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("user")
      .select("id_mahasiswa")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || !userRow?.id_mahasiswa) {
      return NextResponse.json(
        { error: "Profil mahasiswa tidak ditemukan" },
        { status: 404 },
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("mahasiswa")
      .select("id_mahasiswa")
      .eq("id_mahasiswa", userRow.id_mahasiswa)
      .single();

    if (profileError || !profile?.id_mahasiswa) {
      return NextResponse.json(
        { error: "Profil mahasiswa tidak ditemukan" },
        { status: 404 },
      );
    }

    const { data: modul } = await supabaseAdmin
      .from("modul")
      .select("parameter_nilai")
      .eq("id_modul", idModul)
      .single();

    const passScore = Number(modul?.parameter_nilai ?? 80);

    const input: MaterialGenerationInput = {
      idMahasiswa: profile.id_mahasiswa,
      idModul,
      passScore,
    };

    const result = await generateLearningMaterials(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate materials error:", error);
    return NextResponse.json(
      { error: "Gagal menghasilkan materi", detail: String(error) },
      { status: 500 },
    );
  }
}
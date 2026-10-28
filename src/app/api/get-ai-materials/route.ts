import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const { idModul, idMahasiswa, idAttemptKe } = body as { idModul: number; idMahasiswa: number; idAttemptKe?: number };

    if (!idModul || !idMahasiswa) {
      return NextResponse.json(
        { error: "idModul dan idMahasiswa diperlukan" },
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

    // Verify the user matches the requested mahasiswa
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userRow, error: userError } = await (supabaseAdmin as any)
      .from("user")
      .select("id_mahasiswa")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || !userRow?.id_mahasiswa || userRow.id_mahasiswa !== idMahasiswa) {
      return NextResponse.json(
        { error: "Tidak diizinkan mengakses materi mahasiswa lain" },
        { status: 403 },
      );
    }

    // Fetch AI-generated materials from database
    let query = supabaseAdmin
      .from("modul_remedial")
      .select("*")
      .eq("id_modul", idModul)
      .eq("id_mahasiswa", idMahasiswa)
      .eq("is_ai_generated", true)
      .order("urutan", { ascending: true });

    if (idAttemptKe) {
      query = query.eq("id_attempt_ke", idAttemptKe);
    }

    const { data: aiMaterials, error } = await query;

    if (error) {
      console.error("Gagal mengambil materi AI:", error);
      return NextResponse.json(
        { error: "Gagal mengambil materi AI", detail: error.message },
        { status: 500 },
      );
    }

    // Transform to match GeneratedMaterial type
    const materials = (aiMaterials ?? []).map((m, idx) => {
      // Parse source_material jika ada (text JSON dari DB)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let parsedSource: Record<string, any> = {};
      if (typeof m.source_material === "string" && m.source_material) {
        try { parsedSource = JSON.parse(m.source_material); } catch { /* ignore */ }
      } else if (m.source_material && typeof m.source_material === "object") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parsedSource = m.source_material as Record<string, any>;
      }

      // Deteksi tipe dari judul sebagai fallback jika source_material tidak ada
      const judul = (m.judul ?? "").toLowerCase();
      let tipe: "ringkasan" | "penjelasan" | "contoh_soal" | "tips" = 
        (parsedSource?.tipe as "ringkasan" | "penjelasan" | "contoh_soal" | "tips") ?? "penjelasan";
      if (!parsedSource?.tipe) {
        if (judul.includes("ringkasan")) tipe = "ringkasan";
        else if (judul.includes("contoh soal") || judul.includes("pembahasan")) tipe = "contoh_soal";
        else if (judul.includes("tips")) tipe = "tips";
      }

      return {
        id: String(m.id_remedial ?? idx),
        judul: m.judul,
        tipe,
        konten: m.konten,
        idSubTopik: m.id_sub_topik ?? 0,
        prioritas: parsedSource?.prioritas ?? (idx + 1),
        source: {
          soal_salah: parsedSource?.soal_salah,
          sumber: parsedSource?.sumber,
          kemiripan: parsedSource?.kemiripan,
          topik: parsedSource?.topik,
        },
      };
    });

    return NextResponse.json({ materials });
  } catch (error) {
    console.error("Get AI materials error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil materi AI", detail: String(error) },
      { status: 500 },
    );
  }
}
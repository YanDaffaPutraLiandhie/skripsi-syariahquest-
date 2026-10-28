// Simpan sebagai: app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "Mahasiswa" | "Dosen" | "Admin";

const ROLE_CONFIG: Record<Role, { table: string; nameCol: string; idCol: string }> = {
  Mahasiswa: { table: "mahasiswa", nameCol: "nama_mahasiswa", idCol: "id_mahasiswa" },
  Dosen: { table: "dosen", nameCol: "nama_dosen", idCol: "id_dosen" },
  Admin: { table: "admin", nameCol: "nama_admin", idCol: "id_admin" },
};

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Body tidak valid." }, { status: 400 });
  }

  const { email, password, name, role: requestedRole } = body;

  if (!email || !password || !name) {
    return NextResponse.json({ message: "Data registrasi tidak lengkap." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ message: "Password minimal 6 karakter." }, { status: 400 });
  }
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return NextResponse.json({ message: "Email tidak valid." }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim() || name.length > 100) {
    return NextResponse.json({ message: "Nama tidak valid." }, { status: 400 });
  }

  // Tanpa role = Mahasiswa
  const role = (requestedRole ?? "Mahasiswa") as Role;
  if (!(role in ROLE_CONFIG)) {
    return NextResponse.json({ message: "Role tidak valid." }, { status: 400 });
  }

  // Admin & Dosen hanya boleh dibuat saat development (npm run dev).
  // Di production, hanya Mahasiswa yang bisa mendaftar lewat endpoint publik ini.
  const isDev = process.env.NODE_ENV === "development";
  if (role !== "Mahasiswa" && !isDev) {
    return NextResponse.json(
      { message: "Pendaftaran role ini tidak diizinkan." },
      { status: 403 }
    );
  }

  const cfg = ROLE_CONFIG[role];

  // 1. Akun Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
  });

  if (authError || !authData?.user) {
    return NextResponse.json(
      { message: authError?.message || "Gagal membuat akun." },
      { status: 400 }
    );
  }
  const authUserId = authData.user.id;

  // 2. Baris profil sesuai role
  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from(cfg.table)
    .insert({ [cfg.nameCol]: name.trim() } as Record<string, string>)
    .select(cfg.idCol)
    .single();

  if (roleError || !roleRow) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    return NextResponse.json(
      { message: `Gagal membuat profil ${role.toLowerCase()}.` },
      { status: 500 }
    );
  }
  const roleId = (roleRow as any)[cfg.idCol];

  // 3. Baris tabel user
  const { error: userError } = await supabaseAdmin.from("user").insert({
    auth_user_id: authUserId,
    [cfg.idCol]: roleId,
    is_aktif: true,
  });

  if (userError) {
    // Rollback lengkap: profil + akun Auth
    await supabaseAdmin.from(cfg.table).delete().eq(cfg.idCol, roleId);
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    return NextResponse.json({ message: "Gagal menyimpan data user." }, { status: 500 });
  }

  return NextResponse.json({ message: "Akun berhasil dibuat." }, { status: 201 });
}
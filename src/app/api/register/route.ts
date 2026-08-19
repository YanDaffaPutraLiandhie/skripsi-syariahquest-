import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password, name, role } = body;

  if (!email || !password || !name || !role) {
    return NextResponse.json({ message: "Data registrasi tidak lengkap." }, { status: 400 });
  }

  const { data, error: signError } = await supabaseAdmin.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`,
    },
  });

  if (signError) {
    return NextResponse.json({ message: signError.message }, { status: 400 });
  }

  const user = data.user;
  if (!user) {
    return NextResponse.json({ message: "Gagal membuat akun." }, { status: 500 });
  }

  if (role === "Mahasiswa") {
    const { data: mahasiswa, error: mahasiswaError } = await supabaseAdmin
      .from("mahasiswa")
      .insert({ nama_mahasiswa: name })
      .select("id_mahasiswa")
      .single();

    if (mahasiswaError || !mahasiswa) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return NextResponse.json({ message: "Gagal membuat profil mahasiswa." }, { status: 500 });
    }

    const { error: userError } = await supabaseAdmin.from("user").insert({
      auth_user_id: user.id,
      id_mahasiswa: mahasiswa.id_mahasiswa,
    });

    if (userError) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return NextResponse.json({ message: "Gagal menyimpan data user." }, { status: 500 });
    }
  } else if (role === "Dosen") {
    const { data: dosen, error: dosenError } = await supabaseAdmin
      .from("dosen")
      .insert({ nama_dosen: name })
      .select("id_dosen")
      .single();

    if (dosenError || !dosen) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return NextResponse.json({ message: "Gagal membuat profil dosen." }, { status: 500 });
    }

    const { error: userError } = await supabaseAdmin.from("user").insert({
      auth_user_id: user.id,
      id_dosen: dosen.id_dosen,
    });

    if (userError) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return NextResponse.json({ message: "Gagal menyimpan data user." }, { status: 500 });
    }
  } else {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    return NextResponse.json({ message: "Role tidak valid." }, { status: 400 });
  }

  return NextResponse.json({ message: "Akun berhasil dibuat." }, { status: 201 });
}

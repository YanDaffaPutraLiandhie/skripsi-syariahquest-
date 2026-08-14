import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Konfigurasi server belum lengkap: cek SUPABASE_SERVICE_ROLE_KEY di .env.local'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// POST /api/admin/impersonate
// Body: { userId: number, role: 'Mahasiswa' | 'Dosen' }
//
// PENTING (keamanan): route ini HANYA boleh dipanggil oleh admin yang
// sedang login. Saat ini belum ada pengecekan sesi admin di sini —
// tambahkan verifikasi token/role admin sebelum dipakai di production,
// supaya endpoint ini tidak bisa dipanggil sembarang orang untuk
// membajak akun user manapun.
export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getAdminClient()
    const { userId, role } = await req.json()

    if (!userId || !role) {
      return NextResponse.json(
        { message: 'userId dan role wajib diisi' },
        { status: 400 }
      )
    }

    // 1. Cari auth_user_id dari tabel `user`
    const { data: userRow, error: userError } = await supabaseAdmin
      .from('user')
      .select('auth_user_id, is_aktif')
      .eq('id_user', userId)
      .single()

    if (userError || !userRow?.auth_user_id) {
      return NextResponse.json(
        { message: userError?.message || 'User tidak ditemukan' },
        { status: 404 }
      )
    }

    if (userRow.is_aktif === false) {
      return NextResponse.json(
        { message: 'User ini sedang nonaktif' },
        { status: 403 }
      )
    }

    // 2. Ambil email user dari Supabase Auth
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(userRow.auth_user_id)

    if (authError || !authUser?.user?.email) {
      return NextResponse.json(
        { message: authError?.message || 'Email user tidak ditemukan' },
        { status: 404 }
      )
    }

    // 3. Tentukan halaman tujuan sesuai role
    const redirectPath =
  role === 'Dosen' ? '/Dosen/Dashboard' : role === 'Mahasiswa' ? '/dashboard' : '/'

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin

    // 4. Generate magic link — ini yang memungkinkan admin membuka
    // dashboard user tersebut tanpa perlu tahu passwordnya.
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: authUser.user.email,
        options: {
          redirectTo: `${siteUrl}${redirectPath}`,
        },
      })

    if (linkError || !linkData) {
      return NextResponse.json(
        { message: linkError?.message || 'Gagal membuat link akses' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      link: linkData.properties.action_link,
    })
  } catch (error: any) {
    console.error('IMPERSONATE ERROR:', error)
    return NextResponse.json(
      { message: error?.message || 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
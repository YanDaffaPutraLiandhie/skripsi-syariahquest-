import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Konfigurasi Supabase server belum lengkap. Pastikan SUPABASE_SERVICE_ROLE_KEY ada di .env.local'
    )
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getAdminClient()
    console.log(
  'Service Role Key tersedia:',
  !!process.env.SUPABASE_SERVICE_ROLE_KEY
)

    // Ambil data dari form
    const body = await req.json()

    const {
      nama,
      email,
      password,
      role,
    } = body

    // Validasi data
    if (!nama || !email || !password || !role) {
      return NextResponse.json(
        {
          success: false,
          message: 'Nama, email, password, dan role wajib diisi',
        },
        { status: 400 }
      )
    }

    // Validasi role
    if (
      role !== 'Mahasiswa' &&
      role !== 'Dosen' &&
      role !== 'Admin'
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Role tidak valid',
        },
        { status: 400 }
      )
    }

    // =====================================================
    // 1. BUAT USER DI SUPABASE AUTH
    // =====================================================

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          success: false,
          message:
            authError?.message ||
            'Gagal membuat akun Supabase Auth',
        },
        { status: 400 }
      )
    }

    const authUserId = authData.user.id

    // Variabel untuk menyimpan ID role
    let idMahasiswa: number | null = null
    let idDosen: number | null = null
    let idAdmin: number | null = null

    // =====================================================
    // 2. BUAT DATA BERDASARKAN ROLE
    // =====================================================

    if (role === 'Mahasiswa') {
      const {
        data: mahasiswa,
        error: mahasiswaError,
      } = await supabaseAdmin
        .from('mahasiswa')
        .insert({
          nama_mahasiswa: nama,
        })
        .select('id_mahasiswa')
        .single()

      if (mahasiswaError || !mahasiswa) {
        // Hapus Auth jika insert mahasiswa gagal
        await supabaseAdmin.auth.admin.deleteUser(
          authUserId
        )

        return NextResponse.json(
          {
            success: false,
            message:
              mahasiswaError?.message ||
              'Gagal membuat data mahasiswa',
          },
          { status: 400 }
        )
      }

      idMahasiswa = mahasiswa.id_mahasiswa
    }

    if (role === 'Dosen') {
      const {
        data: dosen,
        error: dosenError,
      } = await supabaseAdmin
        .from('dosen')
        .insert({
          nama_dosen: nama,
        })
        .select('id_dosen')
        .single()

      if (dosenError || !dosen) {
        await supabaseAdmin.auth.admin.deleteUser(
          authUserId
        )

        return NextResponse.json(
          {
            success: false,
            message:
              dosenError?.message ||
              'Gagal membuat data dosen',
          },
          { status: 400 }
        )
      }

      idDosen = dosen.id_dosen
    }
if (role === 'Admin') {
  console.log('Mencoba insert ke tabel admin...')
  console.log('Nama admin:', nama)
  console.log(
    'Service Role Key tersedia:',
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const {
    data: admin,
    error: adminError,
  } = await supabaseAdmin
    .from('admin')
    .insert({
      nama_admin: nama,
    })
    .select('id_admin')
    .single()

  console.log('Hasil insert admin:', {
    data: admin,
    error: adminError,
  })

  if (adminError || !admin) {
    console.error('ADMIN INSERT ERROR:', adminError)

    await supabaseAdmin.auth.admin.deleteUser(
      authUserId
    )

    return NextResponse.json(
      {
        success: false,
        message:
          adminError?.message ||
          'Gagal membuat data admin',
      },
      { status: 400 }
    )
  }

  idAdmin = admin.id_admin
}

    // =====================================================
    // 3. BUAT DATA DI TABEL USER
    // =====================================================

    const {
      data: userData,
      error: userError,
    } = await supabaseAdmin
      .from('user')
      .insert({
        auth_user_id: authUserId,
        id_mahasiswa: idMahasiswa,
        id_dosen: idDosen,
        id_admin: idAdmin,
      })
      .select('id_user')
      .single()

    if (userError || !userData) {
      // Rollback data role
      if (idMahasiswa) {
        await supabaseAdmin
          .from('mahasiswa')
          .delete()
          .eq(
            'id_mahasiswa',
            idMahasiswa
          )
      }

      if (idDosen) {
        await supabaseAdmin
          .from('dosen')
          .delete()
          .eq(
            'id_dosen',
            idDosen
          )
      }

      if (idAdmin) {
        await supabaseAdmin
          .from('admin')
          .delete()
          .eq(
            'id_admin',
            idAdmin
          )
      }

      // Hapus akun Auth
      await supabaseAdmin.auth.admin.deleteUser(
        authUserId
      )

      return NextResponse.json(
        {
          success: false,
          message:
            userError?.message ||
            'Gagal membuat data user',
        },
        { status: 400 }
      )
    }

    // =====================================================
    // 4. BERHASIL
    // =====================================================

    return NextResponse.json(
      {
        success: true,
        message: 'User berhasil ditambahkan',
        user: {
          id_user: userData.id_user,
          auth_user_id: authUserId,
          id_mahasiswa: idMahasiswa,
          id_dosen: idDosen,
          id_admin: idAdmin,
          role,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error(
      'CREATE USER ERROR:',
      error
    )

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Terjadi kesalahan pada server',
      },
      { status: 500 }
    )
  }
}
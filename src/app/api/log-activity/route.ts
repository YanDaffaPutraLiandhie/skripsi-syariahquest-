import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Konfigurasi Supabase belum lengkap')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getAdminClient()

    // Ambil token login dari request
    const authHeader = req.headers.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Token autentikasi tidak ditemukan',
        },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()

    // Verifikasi user yang sedang login
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User tidak terautentikasi',
        },
        { status: 401 }
      )
    }

    // Ambil data user berdasarkan auth_user_id
    const {
      data: userData,
      error: userError,
    } = await supabaseAdmin
      .from('user')
      .select('id_user, id_dosen, id_mahasiswa, id_admin')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      console.error('USER LOG ERROR:', userError)

      return NextResponse.json(
        {
          success: false,
          message: 'Data user tidak ditemukan',
        },
        { status: 404 }
      )
    }

    // log_activity sekarang mencatat Dosen MAUPUN Mahasiswa.
    // Admin tetap tidak dicatat (sesuai desain awal).
    if (userData.id_admin) {
      return NextResponse.json(
        {
          success: false,
          message: 'Admin tidak dicatat di log_activity',
        },
        { status: 403 }
      )
    }

    let namaPelaku: string | null = null
    let role: 'Dosen' | 'Mahasiswa' | null = null

    if (userData.id_dosen) {
      const { data: dosen, error: dosenError } = await supabaseAdmin
        .from('dosen')
        .select('nama_dosen')
        .eq('id_dosen', userData.id_dosen)
        .single()

      if (dosenError || !dosen) {
        console.error('DOSEN LOG ERROR:', dosenError)

        return NextResponse.json(
          {
            success: false,
            message: 'Data dosen tidak ditemukan',
          },
          { status: 404 }
        )
      }

      namaPelaku = dosen.nama_dosen
      role = 'Dosen'
    } else if (userData.id_mahasiswa) {
      const { data: mahasiswa, error: mahasiswaError } = await supabaseAdmin
        .from('mahasiswa')
        .select('nama_mahasiswa')
        .eq('id_mahasiswa', userData.id_mahasiswa)
        .single()

      if (mahasiswaError || !mahasiswa) {
        console.error('MAHASISWA LOG ERROR:', mahasiswaError)

        return NextResponse.json(
          {
            success: false,
            message: 'Data mahasiswa tidak ditemukan',
          },
          { status: 404 }
        )
      }

      namaPelaku = mahasiswa.nama_mahasiswa
      role = 'Mahasiswa'
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Role user tidak dikenali',
        },
        { status: 403 }
      )
    }

    const body = await req.json()

    const {
      fitur,
      jenis_aktivitas,
      keterangan,
      status,
    } = body

    if (!fitur || !jenis_aktivitas) {
      return NextResponse.json(
        {
          success: false,
          message: 'Fitur dan jenis aktivitas wajib diisi',
        },
        { status: 400 }
      )
    }

    // INSERT LOG — pakai kolom nama_pelaku + role
    // (nama_dosen sudah di-rename jadi nama_pelaku lewat migration)
    const {
      data: log,
      error: logError,
    } = await supabaseAdmin
      .from('log_activity')
      .insert({
        nama_pelaku: namaPelaku,
        role,
        fitur,
        jenis_aktivitas,
        keterangan: keterangan || null,
        status: status || 'Sukses',
        waktu: new Date().toISOString(),
      })
      .select()
      .single()

    if (logError) {
      console.error('INSERT LOG ERROR:', logError)

      return NextResponse.json(
        {
          success: false,
          message: logError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Aktivitas berhasil dicatat',
        data: log,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('LOG ACTIVITY ERROR:', error)

    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Terjadi kesalahan server',
      },
      { status: 500 }
    )
  }
}
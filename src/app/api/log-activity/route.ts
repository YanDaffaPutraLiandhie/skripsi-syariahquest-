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

    // Hanya Dosen yang dicatat di log_activity
    if (!userData.id_dosen) {
      return NextResponse.json(
        {
          success: false,
          message: 'User ini bukan Dosen',
        },
        { status: 403 }
      )
    }

    // Ambil nama Dosen
    const {
      data: dosen,
      error: dosenError,
    } = await supabaseAdmin
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

    // INSERT LOG
    const {
      data: log,
      error: logError,
    } = await supabaseAdmin
      .from('log_activity')
      .insert({
        // Nama kolom tabel log_activity adalah nama_pelaku
        nama_pelaku: dosen.nama_dosen,
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
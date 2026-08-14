import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Konfigurasi Supabase belum lengkap. Pastikan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY tersedia.'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function GET() {
  try {
    const supabaseAdmin = getAdminClient()

    // Hitung jumlah mahasiswa
    const { count: mahasiswaCount, error: mahasiswaError } =
      await supabaseAdmin
        .from('mahasiswa')
        .select('id_mahasiswa', {
          count: 'exact',
          head: true,
        })

    if (mahasiswaError) {
      console.error('STATS MAHASISWA ERROR:', mahasiswaError)

      return NextResponse.json(
        {
          success: false,
          message: mahasiswaError.message,
        },
        { status: 400 }
      )
    }

    // Hitung jumlah dosen
    const { count: dosenCount, error: dosenError } =
      await supabaseAdmin
        .from('dosen')
        .select('id_dosen', {
          count: 'exact',
          head: true,
        })

    if (dosenError) {
      console.error('STATS DOSEN ERROR:', dosenError)

      return NextResponse.json(
        {
          success: false,
          message: dosenError.message,
        },
        { status: 400 }
      )
    }

    // Hitung jumlah modul
    const { count: modulCount, error: modulError } =
      await supabaseAdmin
        .from('modul')
        .select('id_modul', {
          count: 'exact',
          head: true,
        })

    if (modulError) {
      console.error('STATS MODUL ERROR:', modulError)

      return NextResponse.json(
        {
          success: false,
          message: modulError.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      mahasiswa: mahasiswaCount ?? 0,
      dosen: dosenCount ?? 0,
      modul: modulCount ?? 0,
    })
  } catch (error: any) {
    console.error('GET STATS ERROR:', error)

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Terjadi kesalahan saat mengambil statistik',
      },
      { status: 500 }
    )
  }
}
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

/*
====================================================
GET
Mengambil semua data modul + nama level
====================================================
*/

export async function GET() {
  try {
    const supabaseAdmin = getAdminClient()

    const { data, error } = await supabaseAdmin
      .from('modul')
      .select(`
        id_modul,
        nama_modul,
        id_level,
        video_url,
        teks_materi,
        dokumen_pendukung,
        level (
          id_level,
          nama_level
        )
      `)
      .order('id_modul', {
        ascending: true,
      })

    if (error) {
      console.error('GET MODULE ERROR:', error)

      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: 400,
        }
      )
    }

    return NextResponse.json(
      {
        success: true,
        modules: data ?? [],
      },
      {
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('GET MODULE SERVER ERROR:', error)

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Terjadi kesalahan server',
      },
      {
        status: 500,
      }
    )
  }
}


/*
====================================================
POST
Menambahkan modul baru
====================================================
*/

export async function POST(
  req: NextRequest
) {
  try {
    const supabaseAdmin = getAdminClient()

    const body = await req.json()

    const {
      nama_modul,
      id_level,
      video_url,
      teks_materi,
      dokumen_pendukung,
    } = body

    // Validasi
    if (!nama_modul || !id_level) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Nama modul dan level wajib diisi',
        },
        {
          status: 400,
        }
      )
    }

    // Pastikan level tersedia
    const {
      data: levelData,
      error: levelError,
    } = await supabaseAdmin
      .from('level')
      .select('id_level')
      .eq(
        'id_level',
        Number(id_level)
      )
      .single()

    if (levelError || !levelData) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Level yang dipilih tidak ditemukan',
        },
        {
          status: 400,
        }
      )
    }

    // Insert modul
    const {
      data,
      error,
    } = await supabaseAdmin
      .from('modul')
      .insert({
        nama_modul:
          nama_modul.trim(),

        id_level:
          Number(id_level),

        video_url:
          video_url?.trim() || null,

        teks_materi:
          teks_materi?.trim() || null,

        dokumen_pendukung:
          dokumen_pendukung?.trim() || null,
      })
      .select(`
        id_modul,
        nama_modul,
        id_level,
        video_url,
        teks_materi,
        dokumen_pendukung,
        level (
          id_level,
          nama_level
        )
      `)
      .single()

    if (error) {
      console.error(
        'INSERT MODULE ERROR:',
        error
      )

      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: 400,
        }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message:
          'Modul berhasil ditambahkan',
        module: data,
      },
      {
        status: 201,
      }
    )
  } catch (error: any) {
    console.error(
      'CREATE MODULE ERROR:',
      error
    )

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Terjadi kesalahan server',
      },
      {
        status: 500,
      }
    )
  }
}
import {
  NextRequest,
  NextResponse,
} from 'next/server'

import { createClient } from '@supabase/supabase-js'


function getAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    throw new Error(
      'Konfigurasi Supabase server belum lengkap'
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
PATCH
Update modul
====================================================
*/

export async function PATCH(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const supabaseAdmin =
      getAdminClient()

    const {
      id,
    } = await context.params

    const idModul =
      Number(id)

    if (
      Number.isNaN(idModul)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'ID modul tidak valid',
        },
        {
          status: 400,
        }
      )
    }

    const body =
      await req.json()

    const {
      nama_modul,
      id_level,
      video_url,
      teks_materi,
      dokumen_pendukung,
    } = body

    if (
      !nama_modul ||
      !id_level
    ) {
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

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from('modul')
        .update({
          nama_modul:
            nama_modul.trim(),

          id_level:
            Number(id_level),

          video_url:
            video_url?.trim() ||
            null,

          teks_materi:
            teks_materi?.trim() ||
            null,

          dokumen_pendukung:
            dokumen_pendukung?.trim() ||
            null,
        })
        .eq(
          'id_modul',
          idModul
        )
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
        'UPDATE MODULE ERROR:',
        error
      )

      return NextResponse.json(
        {
          success: false,
          message:
            error.message,
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
          'Modul berhasil diperbarui',
        module: data,
      }
    )
  } catch (error: any) {
    console.error(
      'UPDATE MODULE SERVER ERROR:',
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


/*
====================================================
DELETE
Hapus modul
====================================================
*/

export async function DELETE(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const supabaseAdmin =
      getAdminClient()

    const {
      id,
    } = await context.params

    const idModul =
      Number(id)

    if (
      Number.isNaN(idModul)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'ID modul tidak valid',
        },
        {
          status: 400,
        }
      )
    }

    const {
      error,
    } =
      await supabaseAdmin
        .from('modul')
        .delete()
        .eq(
          'id_modul',
          idModul
        )

    if (error) {
      console.error(
        'DELETE MODULE ERROR:',
        error
      )

      return NextResponse.json(
        {
          success: false,
          message:
            error.message,
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
          'Modul berhasil dihapus',
      }
    )
  } catch (error: any) {
    console.error(
      'DELETE MODULE SERVER ERROR:',
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
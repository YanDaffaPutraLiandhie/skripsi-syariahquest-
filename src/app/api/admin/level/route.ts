import { NextResponse } from 'next/server'
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
      'Konfigurasi Supabase belum lengkap'
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

export async function GET() {
  try {

    const supabaseAdmin =
      getAdminClient()

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from('level')
        .select(
          'id_level, nama_level'
        )
        .order(
          'id_level',
          {
            ascending: true,
          }
        )

    if (error) {

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
        levels:
          data || [],
      }
    )

  } catch (error: any) {

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Gagal mengambil data level',
      },
      {
        status: 500,
      }
    )

  }
}
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          message: 'Konfigurasi Supabase belum lengkap',
        },
        {
          status: 500,
        }
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    /*
    =========================================
    USER
    =========================================
    */

    const { data: users, error: userError } =
      await supabaseAdmin
        .from('user')
        .select(
          `
          id_user,
          id_mahasiswa,
          id_dosen,
          id_admin
          `
        )

    if (userError) {
      return NextResponse.json(
        {
          message: userError.message,
        },
        {
          status: 400,
        }
      )
    }

    /*
    =========================================
    MODUL
    =========================================
    */

    const {
      count: modulCount,
      error: modulError,
    } = await supabaseAdmin
      .from('modul')
      .select('*', {
        count: 'exact',
        head: true,
      })

    if (modulError) {
      console.error(
        'MODUL COUNT ERROR:',
        modulError
      )

      return NextResponse.json(
        {
          message: modulError.message,
        },
        {
          status: 400,
        }
      )
    }

    /*
    =========================================
    HITUNG ROLE
    =========================================
    */

    const mahasiswa =
      users?.filter(
        (u) => u.id_mahasiswa !== null
      ).length ?? 0

    const dosen =
      users?.filter(
        (u) => u.id_dosen !== null
      ).length ?? 0

    const admin =
      users?.filter(
        (u) => u.id_admin !== null
      ).length ?? 0

    return NextResponse.json({
      mahasiswa,
      dosen,
      admin,
      modul: modulCount ?? 0,
      total: users?.length ?? 0,
    })
  } catch (error: any) {
    console.error(error)

    return NextResponse.json(
      {
        message:
          error.message ??
          'Terjadi kesalahan server',
      },
      {
        status: 500,
      }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const { id } =
      await context.params

    const body =
      await request.json()

    const is_aktif =
      body.is_aktif

    if (
      typeof is_aktif !==
      'boolean'
    ) {
      return NextResponse.json(
        {
          message:
            'Nilai is_aktif harus boolean',
        },
        { status: 400 }
      )
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return NextResponse.json(
        {
          message:
            'Konfigurasi Supabase belum lengkap',
        },
        { status: 500 }
      )
    }

    const supabaseAdmin =
      createClient(
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
    UPDATE STATUS USER
    =========================================
    */

    const { data, error } =
      await supabaseAdmin
        .from('user')
        .update({
          is_aktif,
        })
        .eq(
          'id_user',
          Number(id)
        )
        .select(
          `
          id_user,
          is_aktif
          `
        )
        .single()

    if (error) {
      console.error(
        'UPDATE STATUS ERROR:',
        error
      )

      return NextResponse.json(
        {
          message:
            error.message,
          details:
            error.details,
          hint:
            error.hint,
          code:
            error.code,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message:
        'Status user berhasil diubah',

      user: data,
    })
  } catch (error: any) {
    console.error(
      'PATCH STATUS ERROR:',
      error
    )

    return NextResponse.json(
      {
        message:
          error?.message ||
          'Gagal mengubah status user',
      },
      { status: 500 }
    )
  }
}
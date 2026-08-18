import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  request: NextRequest
) {
  try {
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
        {
          status: 500,
        }
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

    const body =
      await request.json()

    const {
      id_user,
      is_aktif,
    } = body

    if (
      id_user === undefined ||
      is_aktif === undefined
    ) {
      return NextResponse.json(
        {
          message:
            'id_user dan is_aktif wajib diisi',
        },
        {
          status: 400,
        }
      )
    }

    /*
    =========================================
    UPDATE STATUS USER
    =========================================
    */

    const {
      data,
      error,
    } = await supabaseAdmin
      .from('user')
      .update({
        is_aktif:
          Boolean(is_aktif),
      })
      .eq(
        'id_user',
        id_user
      )
      .select(
        'id_user, is_aktif'
      )
      .single()

    if (error) {
      console.error(
        'UPDATE USER STATUS ERROR:',
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
        },
        {
          status: 400,
        }
      )
    }

    return NextResponse.json({
      success: true,

      message:
        Boolean(is_aktif)
          ? 'User berhasil diaktifkan'
          : 'User berhasil dinonaktifkan',

      data,
    })
  } catch (error: any) {
    console.error(
      'UPDATE STATUS EXCEPTION:',
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
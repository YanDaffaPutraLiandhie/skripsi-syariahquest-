import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          message:
            'NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum tersedia',
        },
        { status: 500 }
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
    1. AMBIL DATA USER
    =========================================
    */

    const { data: userRows, error: userError } =
      await supabaseAdmin
        .from('user')
        .select(
          `
          id_user,
          auth_user_id,
          id_mahasiswa,
          id_dosen,
          id_admin,
          is_aktif
          `
        )
        .order('id_user', {
          ascending: false,
        })

    if (userError) {
      console.error(
        'FETCH USER TABLE ERROR:',
        userError.message
      )

      return NextResponse.json(
        {
          message: userError.message,
          details: userError.details,
          hint: userError.hint,
          code: userError.code,
        },
        { status: 400 }
      )
    }

    /*
    =========================================
    2. AMBIL DATA MAHASISWA
    =========================================
    */

    const { data: mahasiswaData, error: mahasiswaError } =
      await supabaseAdmin
        .from('mahasiswa')
        .select(
          'id_mahasiswa, nama_mahasiswa'
        )

    if (mahasiswaError) {
      return NextResponse.json(
        {
          message:
            'Gagal mengambil data mahasiswa',
          details: mahasiswaError.message,
        },
        { status: 400 }
      )
    }

    /*
    =========================================
    3. AMBIL DATA DOSEN
    =========================================
    */

    const { data: dosenData, error: dosenError } =
      await supabaseAdmin
        .from('dosen')
        .select(
          'id_dosen, nama_dosen'
        )

    if (dosenError) {
      return NextResponse.json(
        {
          message:
            'Gagal mengambil data dosen',
          details: dosenError.message,
        },
        { status: 400 }
      )
    }

    /*
    =========================================
    4. AMBIL DATA ADMIN
    =========================================
    */

    const { data: adminData, error: adminError } =
      await supabaseAdmin
        .from('admin')
        .select(
          'id_admin, nama_admin'
        )

    if (adminError) {
      return NextResponse.json(
        {
          message:
            'Gagal mengambil data admin',
          details: adminError.message,
        },
        { status: 400 }
      )
    }

    /*
    =========================================
    5. BUAT MAP NAMA
    =========================================
    */

    const mahasiswaMap = new Map(
      (mahasiswaData ?? []).map(
        (item) => [
          item.id_mahasiswa,
          item.nama_mahasiswa,
        ]
      )
    )

    const dosenMap = new Map(
      (dosenData ?? []).map(
        (item) => [
          item.id_dosen,
          item.nama_dosen,
        ]
      )
    )

    const adminMap = new Map(
      (adminData ?? []).map(
        (item) => [
          item.id_admin,
          item.nama_admin,
        ]
      )
    )

    /*
    =========================================
    6. AMBIL USER AUTH
    =========================================
    */

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

    if (authError) {
      return NextResponse.json(
        {
          message:
            'Gagal mengambil data Auth',
          details: authError.message,
        },
        { status: 400 }
      )
    }

    const emailMap = new Map(
      authData.users.map(
        (item) => [
          item.id,
          item.email ?? '',
        ]
      )
    )

    /*
    =========================================
    7. GABUNGKAN DATA
    =========================================
    */

    const users = (userRows ?? []).map(
      (row) => {
        let nama = ''
        let role:
          | 'Mahasiswa'
          | 'Dosen'
          | 'Admin' =
          'Mahasiswa'

        if (row.id_admin) {
          nama =
            adminMap.get(
              row.id_admin
            ) ?? ''

          role = 'Admin'
        } else if (row.id_dosen) {
          nama =
            dosenMap.get(
              row.id_dosen
            ) ?? ''

          role = 'Dosen'
        } else if (row.id_mahasiswa) {
          nama =
            mahasiswaMap.get(
              row.id_mahasiswa
            ) ?? ''

          role = 'Mahasiswa'
        }

        return {
          id_user: row.id_user,

          auth_user_id:
            row.auth_user_id,

          nama,

          email:
            emailMap.get(
              row.auth_user_id
            ) ?? '',

          role,

          is_aktif:
            row.is_aktif ?? true,
        }
      }
    )

    return NextResponse.json({
      users,
    })
  } catch (error: any) {
    console.error(
      'GET USERS ERROR:',
      error
    )

    return NextResponse.json(
      {
        message:
          error?.message ||
          'Terjadi kesalahan server',
      },
      { status: 500 }
    )
  }
}
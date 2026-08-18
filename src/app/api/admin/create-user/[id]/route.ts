import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Konfigurasi server belum lengkap. Pastikan SUPABASE_SERVICE_ROLE_KEY ada di .env.local'
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

// GET /api/admin/users
export async function GET() {
  try {
    const supabaseAdmin = getAdminClient()

    // 1. Ambil data user
    const {
      data: userRows,
      error: userError,
    } = await supabaseAdmin
      .from('user')
      .select(
        'id_user, auth_user_id, id_mahasiswa, id_dosen, id_admin'
      )
      .order('id_user', {
        ascending: true,
      })

    if (userError) {
      console.error(
        'GET USERS ERROR:',
        userError
      )

      return NextResponse.json(
        {
          message: userError.message,
        },
        {
          status: 500,
        }
      )
    }

    const users = []

    // 2. Proses setiap user
    for (const user of userRows ?? []) {
      let nama = '-'

      let role:
        | 'Mahasiswa'
        | 'Dosen'
        | 'Admin' = 'Mahasiswa'

      // =========================
      // MAHASISWA
      // =========================

      if (user.id_mahasiswa) {
        role = 'Mahasiswa'

        const {
          data: mahasiswa,
          error: mahasiswaError,
        } = await supabaseAdmin
          .from('mahasiswa')
          .select('nama_mahasiswa')
          .eq(
            'id_mahasiswa',
            user.id_mahasiswa
          )
          .single()

        if (mahasiswaError) {
          console.error(
            'Gagal mengambil mahasiswa:',
            mahasiswaError
          )
        }

        nama =
          mahasiswa?.nama_mahasiswa ??
          '-'
      }

      // =========================
      // DOSEN
      // =========================

      else if (user.id_dosen) {
        role = 'Dosen'

        const {
          data: dosen,
          error: dosenError,
        } = await supabaseAdmin
          .from('dosen')
          .select('nama_dosen')
          .eq(
            'id_dosen',
            user.id_dosen
          )
          .single()

        if (dosenError) {
          console.error(
            'Gagal mengambil dosen:',
            dosenError
          )
        }

        nama =
          dosen?.nama_dosen ??
          '-'
      }

      // =========================
      // ADMIN
      // =========================

      else if (user.id_admin) {
        role = 'Admin'

        const {
          data: admin,
          error: adminError,
        } = await supabaseAdmin
          .from('admin')
          .select('nama_admin')
          .eq(
            'id_admin',
            user.id_admin
          )
          .single()

        if (adminError) {
          console.error(
            'Gagal mengambil admin:',
            adminError
          )
        }

        nama =
          admin?.nama_admin ??
          '-'
      }

      // =========================
      // AMBIL EMAIL DARI AUTH
      // =========================

      let email = '-'

      if (user.auth_user_id) {
        const {
          data: authUser,
          error: authError,
        } =
          await supabaseAdmin.auth.admin.getUserById(
            user.auth_user_id
          )

        if (authError) {
          console.error(
            'Gagal mengambil email Auth:',
            authError
          )
        }

        email =
          authUser.user?.email ??
          '-'
      }

      // =========================
      // MASUKKAN KE HASIL
      // =========================

      users.push({
        id_user: user.id_user,
        nama,
        email,
        role,
      })
    }

    return NextResponse.json({
      users,
    })

  } catch (error: any) {
    console.error(
      'GET USERS EXCEPTION:',
      error
    )

    return NextResponse.json(
      {
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
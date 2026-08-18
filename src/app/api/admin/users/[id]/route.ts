import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Konfigurasi Supabase server belum lengkap. Pastikan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY tersedia di .env.local'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/*
====================================================
PATCH
UPDATE DATA USER
URL:
PATCH /api/admin/users/[id]
====================================================
*/

export async function PATCH(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const supabaseAdmin = getAdminClient()

    const { id } = await context.params
    const idUser = Number(id)

    if (!idUser || Number.isNaN(idUser)) {
      return NextResponse.json(
        {
          success: false,
          message: 'ID user tidak valid',
        },
        { status: 400 }
      )
    }

    const body = await req.json()

    const {
      nama,
      email,
    } = body

    if (!nama || !email) {
      return NextResponse.json(
        {
          success: false,
          message: 'Nama dan email wajib diisi',
        },
        { status: 400 }
      )
    }

    /*
    ================================================
    1. CARI USER
    ================================================
    */

    const {
      data: userRow,
      error: userError,
    } = await supabaseAdmin
      .from('user')
      .select(
        'id_user, auth_user_id, id_mahasiswa, id_dosen, id_admin'
      )
      .eq('id_user', idUser)
      .single()

    if (userError || !userRow) {
      console.error(
        'USER TIDAK DITEMUKAN:',
        userError
      )

      return NextResponse.json(
        {
          success: false,
          message:
            userError?.message ||
            'User tidak ditemukan',
        },
        { status: 404 }
      )
    }

    /*
    ================================================
    2. UPDATE NAMA SESUAI ROLE
    ================================================
    */

    let updateError = null

    // ADMIN
    if (userRow.id_admin) {
      const {
        error,
      } = await supabaseAdmin
        .from('admin')
        .update({
          nama_admin: nama,
        })
        .eq(
          'id_admin',
          userRow.id_admin
        )

      updateError = error
    }

    // DOSEN
    else if (userRow.id_dosen) {
      const {
        error,
      } = await supabaseAdmin
        .from('dosen')
        .update({
          nama_dosen: nama,
        })
        .eq(
          'id_dosen',
          userRow.id_dosen
        )

      updateError = error
    }

    // MAHASISWA
    else if (userRow.id_mahasiswa) {
      const {
        error,
      } = await supabaseAdmin
        .from('mahasiswa')
        .update({
          nama_mahasiswa: nama,
        })
        .eq(
          'id_mahasiswa',
          userRow.id_mahasiswa
        )

      updateError = error
    }

    if (updateError) {
      console.error(
        'UPDATE NAMA ERROR:',
        updateError
      )

      return NextResponse.json(
        {
          success: false,
          message: updateError.message,
        },
        { status: 400 }
      )
    }

    /*
    ================================================
    3. UPDATE EMAIL SUPABASE AUTH
    ================================================
    */

    if (userRow.auth_user_id) {
      const {
        error: authError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userRow.auth_user_id,
          {
            email: email,
          }
        )

      if (authError) {
        console.error(
          'UPDATE EMAIL ERROR:',
          authError
        )

        return NextResponse.json(
          {
            success: false,
            message: authError.message,
          },
          { status: 400 }
        )
      }
    }

    /*
    ================================================
    4. RESPONSE BERHASIL
    ================================================
    */

    return NextResponse.json(
      {
        success: true,
        message: 'Data user berhasil diperbarui',
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error(
      'PATCH USER ERROR:',
      error
    )

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Terjadi kesalahan server',
      },
      { status: 500 }
    )
  }
}


/*
====================================================
DELETE
HAPUS USER
URL:
DELETE /api/admin/users/[id]
====================================================
*/

export async function DELETE(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const supabaseAdmin = getAdminClient()

    const { id } = await context.params
    const idUser = Number(id)

    if (!idUser || Number.isNaN(idUser)) {
      return NextResponse.json(
        {
          success: false,
          message: 'ID user tidak valid',
        },
        { status: 400 }
      )
    }

    /*
    ================================================
    1. CARI USER SEBELUM DIHAPUS
    ================================================
    */

    const {
      data: userRow,
      error: userError,
    } = await supabaseAdmin
      .from('user')
      .select(
        'id_user, auth_user_id, id_mahasiswa, id_dosen, id_admin'
      )
      .eq('id_user', idUser)
      .single()

    if (userError || !userRow) {
      return NextResponse.json(
        {
          success: false,
          message:
            userError?.message ||
            'User tidak ditemukan',
        },
        { status: 404 }
      )
    }

    /*
    ================================================
    2. HAPUS DATA USER
    ================================================
    */

    const {
      error: deleteUserError,
    } = await supabaseAdmin
      .from('user')
      .delete()
      .eq(
        'id_user',
        idUser
      )

    if (deleteUserError) {
      console.error(
        'DELETE USER TABLE ERROR:',
        deleteUserError
      )

      return NextResponse.json(
        {
          success: false,
          message:
            deleteUserError.message,
        },
        { status: 400 }
      )
    }

    /*
    ================================================
    3. HAPUS DATA ROLE
    ================================================
    */

    if (userRow.id_admin) {
      const {
        error,
      } = await supabaseAdmin
        .from('admin')
        .delete()
        .eq(
          'id_admin',
          userRow.id_admin
        )

      if (error) {
        console.error(
          'DELETE ADMIN ERROR:',
          error
        )
      }
    }

    else if (userRow.id_dosen) {
      const {
        error,
      } = await supabaseAdmin
        .from('dosen')
        .delete()
        .eq(
          'id_dosen',
          userRow.id_dosen
        )

      if (error) {
        console.error(
          'DELETE DOSEN ERROR:',
          error
        )
      }
    }

    else if (userRow.id_mahasiswa) {
      const {
        error,
      } = await supabaseAdmin
        .from('mahasiswa')
        .delete()
        .eq(
          'id_mahasiswa',
          userRow.id_mahasiswa
        )

      if (error) {
        console.error(
          'DELETE MAHASISWA ERROR:',
          error
        )
      }
    }

    /*
    ================================================
    4. HAPUS SUPABASE AUTH
    ================================================
    */

    if (userRow.auth_user_id) {
      const {
        error: authDeleteError,
      } =
        await supabaseAdmin.auth.admin.deleteUser(
          userRow.auth_user_id
        )

      if (authDeleteError) {
        console.error(
          'DELETE AUTH ERROR:',
          authDeleteError
        )
      }
    }

    /*
    ================================================
    5. RESPONSE
    ================================================
    */

    return NextResponse.json(
      {
        success: true,
        message: 'User berhasil dihapus',
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error(
      'DELETE USER ERROR:',
      error
    )

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Terjadi kesalahan server',
      },
      { status: 500 }
    )
  }
}
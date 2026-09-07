'use client'

import {
  FormEvent,
  useState,
  Suspense,
} from 'react'

import {
  useRouter,
  useSearchParams,
} from 'next/navigation'

import { supabase } from '../../lib/supabase'
import { logActivity } from '../../lib/logActivity'

import './login.css'

// =====================================================
// LOGIN CONTENT
// =====================================================

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Contoh:
  //
  // /login?redirect=%2Fadmin
  //
  // redirectUrl = /admin

  const redirectUrl =
    searchParams.get('redirect')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ===================================================
  // HANDLE LOGIN
  // ===================================================

  async function handleLogin(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    if (loading) {
      return
    }

    setError('')
    setLoading(true)

    try {
      // =================================================
      // 1. LOGIN SUPABASE
      // =================================================

      console.log('================================')
      console.log('MEMULAI LOGIN')
      console.log('EMAIL:', email)
      console.log('================================')

      const {
        data,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      // =================================================
      // LOGIN ERROR
      // =================================================

      if (loginError) {
        console.error(
          'LOGIN ERROR:',
          loginError
        )

        setError(
          loginError.message
        )

        setLoading(false)

        return
      }

      // =================================================
      // USER TIDAK DITEMUKAN
      // =================================================

      if (!data.user) {
        console.error(
          'USER AUTH TIDAK DITEMUKAN'
        )

        setError(
          'User tidak ditemukan.'
        )

        setLoading(false)

        return
      }

      console.log(
        'LOGIN SUPABASE BERHASIL'
      )

      console.log(
        'AUTH USER ID:',
        data.user.id
      )

      // =================================================
      // 2. CEK SESSION
      // =================================================

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error(
          'SESSION ERROR:',
          sessionError
        )

        setError(
          `Gagal mendapatkan session: ${sessionError.message}`
        )

        setLoading(false)

        return
      }

      if (!sessionData.session) {
        console.error(
          'SESSION TIDAK TERSEDIA'
        )

        setError(
          'Login berhasil tetapi session belum tersedia.'
        )

        setLoading(false)

        return
      }

      console.log(
        'SESSION BERHASIL DIDAPATKAN'
      )

      console.log(
        'SESSION USER:',
        sessionData.session.user.id
      )

      // =================================================
      // 3. AMBIL DATA USER
      // =================================================

      const {
        data: userData,
        error: userError,
      } = await supabase
        .from('user')
        .select(
          `
          id_user,
          id_mahasiswa,
          id_dosen,
          id_admin,
          is_aktif
          `
        )
        .eq(
          'auth_user_id',
          data.user.id
        )
        .maybeSingle()

      if (userError) {
        console.error(
          'USER QUERY ERROR:',
          userError
        )

        setError(
          `Gagal membaca data user: ${userError.message}`
        )

        setLoading(false)

        return
      }

      // =================================================
      // DATA USER TIDAK ADA
      // =================================================

      if (!userData) {
        console.error(
          'DATA USER TIDAK DITEMUKAN'
        )

        await supabase.auth.signOut()

        setError(
          'Data user tidak ditemukan. Pastikan akun sudah terdaftar di sistem.'
        )

        setLoading(false)

        return
      }

      console.log(
        '================================'
      )

      console.log(
        'DATA USER:',
        userData
      )

      console.log(
        '================================'
      )

      // =================================================
      // 4. CEK STATUS AKUN
      // =================================================

      if (!userData.is_aktif) {
        console.log(
          'AKUN TIDAK AKTIF'
        )

        await supabase.auth.signOut()

        setError(
          'Akun Anda sedang dinonaktifkan. Silakan hubungi administrator.'
        )

        setLoading(false)

        return
      }

      // =================================================
      // 5. ADMIN
      // =================================================

      if (userData.id_admin) {
        console.log(
          '================================'
        )

        console.log(
          'ROLE: ADMIN'
        )

        console.log(
          'TARGET: /admin'
        )

        console.log(
          '================================'
        )

        /*
         * ADMIN TIDAK MEMANGGIL logActivity().
         *
         * Karena log_activity hanya untuk Dosen.
         */

        setLoading(false)

        /*
         * Gunakan window.location.href sementara
         * untuk memastikan browser benar-benar
         * melakukan request baru ke /admin.
         */

        window.location.href = '/admin'

        return
      }

      // =================================================
      // 6. DOSEN
      // =================================================

      if (userData.id_dosen) {
        console.log(
          '================================'
        )

        console.log(
          'ROLE: DOSEN'
        )

        console.log(
          'TARGET: /Dosen/Dashboard'
        )

        console.log(
          '================================'
        )

        /*
         * HANYA DOSEN yang dicatat ke
         * log_activity.
         */

        try {
          await logActivity({
            fitur: 'Login',
            jenis_aktivitas: 'Login',
            keterangan:
              'Berhasil login ke dashboard dosen',
          })

          console.log(
            'LOG ACTIVITY DOSEN BERHASIL'
          )
        } catch (logError) {
          /*
           * Kalau logging gagal, login Dosen
           * tetap dilanjutkan.
           */

          console.warn(
            'LOG ACTIVITY DOSEN GAGAL:',
            logError
          )
        }

        setLoading(false)

        window.location.href =
          '/Dosen/Dashboard'

        return
      }

      

          // =================================================
      // 7. MAHASISWA
      // =================================================

      if (userData.id_mahasiswa) {
        console.log(
          '================================'
        )

        console.log(
          'ROLE: MAHASISWA'
        )

        // Reset inRoom status when logging in
        try {
          await supabase
            .from("mahasiswa")
            .update({ inRoom: false })
            .eq("id_mahasiswa", userData.id_mahasiswa);

          await supabase
            .from("room_player")
            .delete()
            .eq("id_user", data.user.id);
        } catch (e) {
          console.error("Gagal reset inRoom saat login", e);
        }

        // ===============================================
        // VALIDASI REDIRECT
        // ===============================================

        let destination = '/dashboard'

        if (
          redirectUrl &&
          redirectUrl.startsWith('/') &&
          !redirectUrl.startsWith('//')
        ) {
          destination = redirectUrl
        }

        console.log(
          'TARGET:',
          destination
        )

        console.log(
          '================================'
        )

        /*
         * MAHASISWA sekarang DICATAT ke log_activity,
         * tapi HANYA untuk event Login — aktivitas
         * mahasiswa lainnya (jawab kuis, buka modul, dll)
         * TIDAK ikut dicatat.
         */

        try {
          await logActivity({
            fitur: 'Login',
            jenis_aktivitas: 'Login',
            keterangan:
              'Berhasil login ke dashboard mahasiswa',
          })

          console.log(
            'LOG ACTIVITY MAHASISWA BERHASIL'
          )
        } catch (logError) {
          /*
           * Kalau logging gagal, login Mahasiswa
           * tetap dilanjutkan — sama seperti pola
           * yang sudah dipakai di branch Dosen.
           */

          console.warn(
            'LOG ACTIVITY MAHASISWA GAGAL:',
            logError
          )
        }

        setLoading(false)

        window.location.href =
          destination

        return
      }


      // =================================================
      // 8. ROLE TIDAK DITEMUKAN
      // =================================================

      console.error(
        'ROLE USER TIDAK DITEMUKAN'
      )

      await supabase.auth.signOut()

      setError(
        'Role user belum ditentukan. Hubungi administrator.'
      )

      setLoading(false)

    } catch (error) {
      console.error(
        'LOGIN EXCEPTION:',
        error
      )

      if (
        error instanceof Error
      ) {
        setError(
          error.message
        )
      } else {
        setError(
          'Terjadi kesalahan saat proses login.'
        )
      }

      setLoading(false)
    }
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <div className="login-card">

      {/* ===============================================
          ILLUSTRATION
      =============================================== */}

      <div className="login-illustration">

        <img
          src="/images/board-logo.png"
          alt="Board Game Illustration"
          className="illustration-img"
        />

      </div>

      {/* ===============================================
          LOGIN FORM
      =============================================== */}

      <div className="login-form-side">

        <h1 className="login-title">
          Log in
        </h1>

        <form
          onSubmit={handleLogin}
          className="login-form"
        >

          {/* EMAIL */}

          <div className="login-field">

            <label htmlFor="email">
              Login, email or phone number
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
              autoComplete="email"
            />

          </div>

          {/* PASSWORD */}

          <div className="login-field">

            <div className="login-field-row">

              <label htmlFor="password">
                Password
              </label>

            </div>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              autoComplete="current-password"
            />

          </div>

          {/* FORGOT PASSWORD */}

          <div className="login-links-row">

            <a
              href="/forgot-password"
              className="login-link forgot"
            >
              forgot password?
            </a>

          </div>

          {/* ERROR */}

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          {/* BUTTON */}

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading
              ? 'Memproses...'
              : 'Log in'}
          </button>

          {/* REGISTER */}

          <button
            type="button"
            className="login-register-btn"
            disabled={loading}
            onClick={() =>
              router.push('/register')
            }
          >
            Belum punya akun? Daftar
          </button>

        </form>

      </div>

    </div>
  )
}

// =====================================================
// LOGIN PAGE
// =====================================================

export default function LoginPage() {
  return (
    <main className="login-page">

      <Suspense
        fallback={
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
            }}
          >
            Memuat...
          </div>
        }
      >
        <LoginContent />
      </Suspense>

    </main>
  )
}
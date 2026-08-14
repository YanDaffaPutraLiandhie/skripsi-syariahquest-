'use client'

import { FormEvent, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import './login.css'

// PISAHKAN FORM KE KOMPONEN SENDIRI AGAR BISA DIBUNGKUS SUSPENSE
function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') // <-- Mengambil ?redirect= dari URL

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setError('')
    setLoading(true)

    // Login ke Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('User tidak ditemukan')
      setLoading(false)
      return
    }

    // Cari data user berdasarkan auth_user_id
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('id_user, id_mahasiswa, id_dosen, id_admin')
      .eq('auth_user_id', data.user.id)
      .single()

    if (userError) {
      console.error('USER QUERY ERROR:', userError)
      setError(`Error: ${userError.message}`)
      setLoading(false)
      return
    }

    // Cek role Admin
    if (userData.id_admin) {
      router.push('/admin')
    }
    // Cek role Dosen
    else if (userData.id_dosen) {
      router.push('/Dosen/Dashboard')
    }
    // Cek role Mahasiswa
    else if (userData.id_mahasiswa) {
      // LOGIKA REDIRECT YANG BENAR:
      if (redirectUrl) {
        router.push(redirectUrl) // Masuk ke arena/join/...
      } else {
        router.push('/dashboard') // Default kalau login manual
      }
    }
    // Jika role belum ditentukan
    else {
      setError('Role user belum ditentukan')
    }

    setLoading(false)
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="login-card">
      <div className="login-illustration">
        <img 
          src="/images/board-logo.png" 
          alt="Board Game Illustration" 
          className="illustration-img"
        />
      </div>

      <div className="login-form-side">
        <h1 className="login-title">Log in</h1>

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="email">Login, email or phone number</label>
            <input
              id="email"
              type="email"
              placeholder=""
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <div className="login-field-row">
              <label htmlFor="password">Password</label>
            </div>
            <input
              id="password"
              type="password"
              placeholder=""
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="login-links-row">
            <a href="/register" className="login-link">Register?</a>
            <a href="/forgot-password" className="login-link forgot">forgot password?</a>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Memproses...' : 'Log in'}
          </button>

          <div className="login-divider">
            <span>or login with</span>
          </div>

          <div className="login-social-row">
            <button type="button" className="login-social-button" onClick={handleGoogleLogin}>
              <GoogleIcon />
            </button>
            <button type="button" className="login-social-button">
              <MailIcon />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// BUNGKUS DENGAN SUSPENSE
export default function LoginPage() {
  return (
    <main className="login-page">
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Memuat...</div>}>
        <LoginContent />
      </Suspense>
    </main>
  )
}

/* =========================================
   ICONS
========================================= */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.5 27 35.5 24 35.5c-5.2 0-9.6-3.4-11.2-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.5 36 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#50427E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  )
}
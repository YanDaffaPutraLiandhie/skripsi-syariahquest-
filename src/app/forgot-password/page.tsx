'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

// IMPORT CSS DARI FOLDER LOGIN BIAR DESAINNYA KEMBAR 100%
import '../login/login.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleResetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    // Kirim email reset password via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Pastikan URL ini sesuai dengan origin aplikasimu (localhost atau domain asli nanti)
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Tautan reset password telah dikirim ke email kamu! Silakan cek kotak masuk atau folder spam.')
    }

    setLoading(false)
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-illustration">
          <img
            src="/images/board-logo.png"
            alt="Forgot Password Illustration"
            className="illustration-img"
          />
        </div>

        <div className="login-form-side">
          <h1 className="login-title">Reset Password</h1>

          {/* Teks Instruksi */}
          <p style={{ textAlign: 'center', marginBottom: '24px', color: '#6B7280', fontSize: '14px' }}>
            Masukkan email yang terdaftar. Kami akan mengirimkan tautan untuk membuat password baru.
          </p>

          <form onSubmit={handleResetPassword} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="email@contoh.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && <p className="login-error">{error}</p>}
            {message && <p style={{ margin: '0 0 14px', color: '#059669', fontSize: '13px', textAlign: 'center', fontWeight: 'bold' }}>{message}</p>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>

            <div className="login-divider">
              <span>atau</span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Link href="/login" className="login-link">
                Kembali ke halaman Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
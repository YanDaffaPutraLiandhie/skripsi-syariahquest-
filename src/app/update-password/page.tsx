'use client'

import { FormEvent, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// IMPORT CSS LOGIN LAGI BIAR SERAGAM
import '../login/login.css'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Opsional: Cek apakah user benar-benar sedang dalam sesi recovery
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('Sesi tidak valid atau telah kedaluwarsa. Silakan minta tautan reset baru.')
      }
    })
  }, [])

  async function handleUpdatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    // Update password di Supabase
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Password berhasil diubah! Mengarahkan ke halaman login...')
      // Beri jeda 2 detik biar user bisa baca pesan suksesnya
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }

    setLoading(false)
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-illustration">
          <img 
            src="/images/board-logo.png" 
            alt="Update Password Illustration" 
            className="illustration-img"
          />
        </div>

        <div className="login-form-side">
          <h1 className="login-title">Password Baru</h1>

          <p style={{ textAlign: 'center', marginBottom: '24px', color: '#6B7280', fontSize: '14px' }}>
            Silakan masukkan password baru kamu di bawah ini.
          </p>

          <form onSubmit={handleUpdatePassword} className="login-form">
            <div className="login-field">
              <label htmlFor="password">Password Baru</label>
              <input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && <p className="login-error">{error}</p>}
            {message && <p style={{ margin: '0 0 14px', color: '#059669', fontSize: '13px', textAlign: 'center', fontWeight: 'bold' }}>{message}</p>}

            <button type="submit" className="login-submit" disabled={loading || !!error.includes('kedaluwarsa')}>
              {loading ? 'Menyimpan...' : 'Simpan Password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
// Simpan sebagai: app/register/page.tsx
'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import Swal from 'sweetalert2'
import '../login/login.css'

export default function RegisterPage() {
    const router = useRouter()
    const [nama, setNama] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    async function handleRegister(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (loading) return

        setError('')

        if (!nama.trim()) {
            setError('Nama lengkap wajib diisi.')
            return
        }
        if (!email.trim()) {
            setError('Email wajib diisi.')
            return
        }
        if (password.length < 6) {
            setError('Password minimal 6 karakter.')
            return
        }
        if (password !== confirmPassword) {
            setError('Konfirmasi password tidak sama.')
            return
        }

        setLoading(true)

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    name: nama.trim(),
                    role: 'Mahasiswa',
                }),
            })
            const result = await response.json()

            if (!response.ok) {
                setError(result.message || 'Gagal membuat akun. Silakan coba lagi.')
                setLoading(false)
                return
            }

            setNama('')
            setEmail('')
            setPassword('')
            setConfirmPassword('')

            await Swal.fire({
                icon: 'success',
                title: 'Registrasi berhasil',
                text: 'Akun Anda sudah aktif. Silakan login untuk melanjutkan.',
                confirmButtonText: 'Ke halaman login',
                confirmButtonColor: '#50427E',
            })
            router.push('/login')
        } catch (registrationError) {
            console.error('REGISTER EXCEPTION:', registrationError)
            setError('Terjadi kesalahan saat proses registrasi.')
            setLoading(false)
        }
    }

    return (
        <main className="login-page">
            <div className="login-card">
                <div className="login-illustration">
                    <img
                        src="/images/board-logo.png"
                        alt="Board Game Illustration"
                        className="illustration-img"
                    />
                </div>

                <div className="login-form-side">
                    <h1 className="login-title">Daftar</h1>
                    <form onSubmit={handleRegister} className="login-form">
                        <div className="login-field">
                            <label htmlFor="nama">Nama Lengkap</label>
                            <input
                                id="nama"
                                type="text"
                                value={nama}
                                onChange={(e) => setNama(e.target.value)}
                                required
                                maxLength={100}
                                autoComplete="name"
                            />
                        </div>

                        <div className="login-field">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className="login-field">
                            <label htmlFor="password">Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword((visible) => !visible)}
                                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                    aria-pressed={showPassword}
                                    title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                >
                                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                </button>
                            </div>
                        </div>

                        <div className="login-field">
                            <label htmlFor="confirmPassword">Konfirmasi Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                                    aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                                    aria-pressed={showConfirmPassword}
                                    title={showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                                >
                                    {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                </button>
                            </div>
                        </div>

                        <div className="login-links-row">
                            <Link href="/login" className="login-link">
                                Sudah punya akun? Masuk
                            </Link>
                        </div>

                        {error && (
                            <p className="login-error" role="alert">
                                {error}
                            </p>
                        )}
                        <button type="submit" className="login-submit" disabled={loading}>
                            {loading ? 'Memproses...' : 'Daftar'}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    )
}
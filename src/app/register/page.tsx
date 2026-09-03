
'use client'

import {
    FormEvent,
    useState,
} from 'react'

import { useRouter } from 'next/navigation'

import { supabase } from '../../lib/supabase'

import '../login/login.css'

// =====================================================
// REGISTER PAGE
// =====================================================
//
// Register khusus untuk role MAHASISWA.
//
// Alur:
// 1. Membuat akun Supabase Auth
// 2. Membuat data pada tabel mahasiswa
// 3. Membuat data pada tabel user
// 4. is_aktif = false
// 5. Logout agar mahasiswa tidak langsung login
// 6. Menunggu aktivasi Admin
//
// =====================================================

export default function RegisterPage() {
    const router = useRouter()

    const [nama, setNama] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] =
        useState('')

    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    // ===================================================
    // HANDLE REGISTER
    // ===================================================

    async function handleRegister(
        e: FormEvent<HTMLFormElement>
    ) {
        e.preventDefault()

        if (loading) {
            return
        }

        setError('')
        setSuccess('')

        // =================================================
        // VALIDASI INPUT
        // =================================================

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
            // =================================================
            // 1. DAFTAR AKUN SUPABASE AUTH
            // =================================================

            console.log('================================')
            console.log('MEMULAI REGISTER')
            console.log('EMAIL:', email.trim())
            console.log('================================')

            const {
                data,
                error: signUpError,
            } = await supabase.auth.signUp({
                email: email.trim(),
                password,
            })

            if (signUpError) {
                console.error('SIGNUP ERROR:', {
                    message: signUpError.message,
                    name: signUpError.name,
                    status: signUpError.status,
                })

                setError(signUpError.message)
                setLoading(false)

                return
            }

            if (!data.user) {
                console.error('USER AUTH TIDAK DIBUAT')

                setError(
                    'Gagal membuat akun. Silakan coba lagi.'
                )

                setLoading(false)

                return
            }

            console.log(
                'SIGNUP SUPABASE BERHASIL'
            )

            console.log(
                'AUTH USER ID:',
                data.user.id
            )

            // =================================================
            // 2. INSERT DATA MAHASISWA
            // =================================================

            console.log(
                'MEMBUAT DATA MAHASISWA...'
            )

            const {
                data: mahasiswaData,
                error: mahasiswaError,
            } = await supabase
                .from('mahasiswa')
                .insert({
                    nama_mahasiswa: nama.trim(),
                    total_xp: 0,
                    Nilai: 0,
                    total_poin: 0,
                    avatar_url:
                        '/images/avatars/avatar1.svg',
                    deskripsi: '',
                    arena_main: 0,
                    arena_menang: 0,
                    arena_jebakan: 0,
                    inRoom: false,
                })
                .select('id_mahasiswa')
                .single()

            // =================================================
            // ERROR INSERT MAHASISWA
            // =================================================

            if (mahasiswaError || !mahasiswaData) {
                console.error(
                    '================================'
                )

                console.error(
                    'INSERT MAHASISWA ERROR'
                )

                console.error({
                    message:
                        mahasiswaError?.message,
                    details:
                        mahasiswaError?.details,
                    hint:
                        mahasiswaError?.hint,
                    code:
                        mahasiswaError?.code,
                })

                console.error(
                    '================================'
                )

                setError(
                    `Gagal menyimpan data mahasiswa: ${mahasiswaError?.message ??
                    'Data mahasiswa tidak berhasil dibuat.'
                    }`
                )

                setLoading(false)

                return
            }

            console.log(
                'DATA MAHASISWA BERHASIL DIBUAT'
            )

            console.log(
                'ID MAHASISWA:',
                mahasiswaData.id_mahasiswa
            )

            // =================================================
            // 3. INSERT DATA USER
            // =================================================

            console.log(
                'MEMBUAT DATA USER...'
            )

            const {
                error: userError,
            } = await supabase
                .from('user')
                .insert({
                    auth_user_id: data.user.id,
                    id_mahasiswa:
                        mahasiswaData.id_mahasiswa,
                    is_aktif: false,
                })

            // =================================================
            // ERROR INSERT USER
            // =================================================

            if (userError) {
                console.error(
                    '================================'
                )

                console.error(
                    'INSERT USER ERROR'
                )

                console.error({
                    message:
                        userError.message,
                    details:
                        userError.details,
                    hint:
                        userError.hint,
                    code:
                        userError.code,
                })

                console.error(
                    '================================'
                )

                setError(
                    `Gagal menyimpan data akun: ${userError.message}`
                )

                setLoading(false)

                return
            }

            console.log(
                'DATA USER BERHASIL DIBUAT'
            )

            // =================================================
            // REGISTER SELESAI
            // =================================================

            console.log(
                '================================'
            )

            console.log(
                'REGISTER SELESAI'
            )

            console.log(
                'MENUNGGU AKTIVASI ADMIN'
            )

            console.log(
                '================================'
            )

            // =================================================
            // 4. LOGOUT
            // =================================================
            //
            // Agar user tidak otomatis login sebelum
            // diaktifkan oleh Admin.
            //
            // =================================================

            const {
                error: logoutError,
            } = await supabase.auth.signOut()

            if (logoutError) {
                console.error(
                    'LOGOUT SETELAH REGISTER ERROR:',
                    {
                        message:
                            logoutError.message,
                        name:
                            logoutError.name,
                        status:
                            logoutError.status,
                    }
                )
            }

            // =================================================
            // 5. TAMPILKAN PESAN BERHASIL
            // =================================================

            setSuccess(
                'Registrasi berhasil! Akun Anda akan aktif setelah diverifikasi oleh administrator.'
            )

            // Bersihkan form
            setNama('')
            setEmail('')
            setPassword('')
            setConfirmPassword('')

            setLoading(false)

            // =================================================
            // 6. KEMBALI KE LOGIN
            // =================================================

            setTimeout(() => {
                router.push('/login')
            }, 2500)

        } catch (error) {
            console.error(
                '================================'
            )

            console.error(
                'REGISTER EXCEPTION:',
                error
            )

            console.error(
                '================================'
            )

            if (error instanceof Error) {
                setError(error.message)
            } else {
                setError(
                    'Terjadi kesalahan saat proses registrasi.'
                )
            }

            setLoading(false)
        }
    }

    // ===================================================
    // UI
    // ===================================================

    return (
        <main className="login-page">

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
                    REGISTER FORM
                =============================================== */}

                <div className="login-form-side">

                    <h1 className="login-title">
                        Sign up
                    </h1>

                    <form
                        onSubmit={handleRegister}
                        className="login-form"
                    >

                        {/* NAMA LENGKAP */}

                        <div className="login-field">

                            <label htmlFor="nama">
                                Nama Lengkap
                            </label>

                            <input
                                id="nama"
                                type="text"
                                value={nama}
                                onChange={(e) =>
                                    setNama(e.target.value)
                                }
                                required
                                autoComplete="name"
                            />

                        </div>

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
                                autoComplete="new-password"
                            />

                        </div>

                        {/* CONFIRM PASSWORD */}

                        <div className="login-field">

                            <div className="login-field-row">

                                <label htmlFor="confirmPassword">
                                    Konfirmasi Password
                                </label>

                            </div>

                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(
                                        e.target.value
                                    )
                                }
                                required
                                autoComplete="new-password"
                            />

                        </div>

                        {/* BACK TO LOGIN */}

                        <div className="login-links-row">

                            <a
                                href="/login"
                                className="login-link forgot"
                            >
                                sudah punya akun? log in
                            </a>

                        </div>

                        {/* ERROR */}

                        {error && (
                            <p className="login-error">
                                {error}
                            </p>
                        )}

                        {/* SUCCESS */}

                        {success && (
                            <p className="login-success">
                                {success}
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
                                : 'Sign up'}
                        </button>

                    </form>

                </div>

            </div>

        </main>
    )
}


'use client'

import { useEffect, useRef, useState } from 'react'
import { Pencil, Check, X, User, AtSign, Mail, MapPin, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface AdminProfile {
  id_admin: number
  nama_admin: string
  username: string
  email: string
  avatar_url: string | null
  lokasi: string
}

export default function ProfilAdminPage() {
  const [profile, setProfile] = useState<AdminProfile>({
    id_admin: 0,
    nama_admin: '',
    username: '',
    email: '',
    avatar_url: null,
    lokasi: '',
  })

  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nama_admin: '',
    username: '',
    email: '',
  })

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    setLoading(true)

    try {
      const { data: authData } = await supabase.auth.getUser()
      const authUser = authData.user

      if (!authUser) {
        setLoading(false)
        return
      }

      // TODO: sesuaikan nama tabel/kolom dengan skema Supabase Anda
      const { data: userRow, error: userError } = await supabase
        .from('user')
        .select('id_admin')
        .eq('auth_user_id', authUser.id)
        .single()

      if (userError || !userRow?.id_admin) {
        console.error('FETCH USER ERROR:', userError)
        setLoading(false)
        return
      }

      const { data: adminRow, error: adminError } = await supabase
        .from('admin')
        .select('id_admin, nama_admin, username, avatar_url, lokasi')
        .eq('id_admin', userRow.id_admin)
        .single()

      if (adminError) {
        console.error('FETCH ADMIN ERROR:', adminError)
        setLoading(false)
        return
      }

      const merged: AdminProfile = {
        id_admin: adminRow.id_admin,
        nama_admin: adminRow.nama_admin ?? '',
        username: adminRow.username ?? '',
        email: authUser.email ?? '',
        avatar_url: adminRow.avatar_url ?? null,
        lokasi: adminRow.lokasi ?? '',
      }

      setProfile(merged)
      setForm({
        nama_admin: merged.nama_admin,
        username: merged.username,
        email: merged.email,
      })
      setLoading(false)
    } catch (err: any) {
      console.error('Gagal memuat profil (exception):', {
        name: err?.name,
        message: err?.message,
      })
      setLoading(false)
    }
  }

  function startEditing() {
    setForm({
      nama_admin: profile.nama_admin,
      username: profile.username,
      email: profile.email,
    })
    setAvatarFile(null)
    setAvatarPreview(null)
    setError('')
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setAvatarFile(null)
    setAvatarPreview(null)
    setError('')
  }

  function handleAvatarClick() {
    if (isEditing) {
      avatarInputRef.current?.click()
    }
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    try {
      let avatarUrl = profile.avatar_url

      // TODO: sesuaikan nama bucket Storage Anda di Supabase
      if (avatarFile) {
        const path = `admin/${profile.id_admin}-${Date.now()}-${avatarFile.name}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: publicUrl } = supabase.storage
          .from('avatars')
          .getPublicUrl(path)

        avatarUrl = publicUrl.publicUrl
      }

      // Update tabel admin (nama & username)
      const { error: updateError } = await supabase
        .from('admin')
        .update({
          nama_admin: form.nama_admin,
          username: form.username,
          avatar_url: avatarUrl,
        })
        .eq('id_admin', profile.id_admin)

      if (updateError) throw updateError

      // Update email lewat Supabase Auth (kalau berubah)
      if (form.email !== profile.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: form.email,
        })

        if (emailError) throw emailError
      }

      setProfile((prev) => ({
        ...prev,
        nama_admin: form.nama_admin,
        username: form.username,
        email: form.email,
        avatar_url: avatarUrl,
      }))

      setIsEditing(false)
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (err: any) {
      console.error('Gagal menyimpan profil:', err)
      setError(err.message || 'Gagal menyimpan perubahan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <p className="pt-10 text-center text-sm font-semibold text-[#4a3f7a]">
        Memuat profil...
      </p>
    )
  }

  return (
    <div className="space-y-6 pt-6">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a3f7a] to-[#3d3466] px-8 py-8 shadow-lg shadow-[#3d3466]/20 lg:px-10 lg:py-10">
        <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

        <div className="relative z-10 flex flex-wrap items-center gap-6">
          <div
            onClick={handleAvatarClick}
            className={`group relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-white/10 ring-4 ring-white/20 ${isEditing ? 'cursor-pointer' : ''
              }`}
          >
            {avatarPreview || profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview || profile.avatar_url || ''}
                alt="Foto profil"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white">
                {profile.nama_admin.charAt(0).toUpperCase() || 'A'}
              </div>
            )}

            {isEditing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                Ganti Foto
              </div>
            )}

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarSelect}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-white lg:text-3xl">
              {profile.nama_admin || 'Administrator'}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950">
                <ShieldCheck size={13} strokeWidth={2.5} />
                Administrator
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#c9c3e6]">
                <MapPin size={13} strokeWidth={2.5} />
                {profile.lokasi || 'Malang City'}
              </span>
            </div>
          </div>

          {!isEditing ? (
            <button
              onClick={startEditing}
              aria-label="Edit profil"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <Pencil size={17} />
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                aria-label="Simpan"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-amber-950 transition hover:bg-amber-300 disabled:opacity-60"
              >
                <Check size={17} />
              </button>
              <button
                onClick={cancelEditing}
                disabled={saving}
                aria-label="Batal"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-60"
              >
                <X size={17} />
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {/* FIELDS PANEL */}
      <div className="grid grid-cols-1 gap-4 rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-black/5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#4a3f7a]">
            <User size={14} strokeWidth={2.25} />
            Nama
          </label>
          <input
            type="text"
            value={form.nama_admin}
            readOnly={!isEditing}
            onChange={(e) =>
              setForm({ ...form, nama_admin: e.target.value })
            }
            className={`rounded-xl px-3.5 py-2.5 text-sm text-[#2b2540] outline-none ${isEditing
              ? 'bg-[#f4f2fa] ring-1 ring-[#c9c3e6] focus:ring-2 focus:ring-[#4a3f7a]'
              : 'bg-[#f8f7fd]'
              }`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#4a3f7a]">
            <AtSign size={14} strokeWidth={2.25} />
            Username
          </label>
          <input
            type="text"
            value={form.username}
            readOnly={!isEditing}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className={`rounded-xl px-3.5 py-2.5 text-sm text-[#2b2540] outline-none ${isEditing
              ? 'bg-[#f4f2fa] ring-1 ring-[#c9c3e6] focus:ring-2 focus:ring-[#4a3f7a]'
              : 'bg-[#f8f7fd]'
              }`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#4a3f7a]">
            <Mail size={14} strokeWidth={2.25} />
            Email
          </label>
          <input
            type="email"
            value={form.email}
            readOnly={!isEditing}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={`rounded-xl px-3.5 py-2.5 text-sm text-[#2b2540] outline-none ${isEditing
              ? 'bg-[#f4f2fa] ring-1 ring-[#c9c3e6] focus:ring-2 focus:ring-[#4a3f7a]'
              : 'bg-[#f8f7fd]'
              }`}
          />
        </div>
      </div>
    </div>
  )
}

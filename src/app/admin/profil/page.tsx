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
    return <p className="profile-loading">Memuat profil...</p>
  }

  return (
    <div>
      {/* HERO */}
      <div className="profile-hero">
        <div className="profile-top-row">
          <div className="profile-avatar-box" onClick={handleAvatarClick}>
            {avatarPreview || profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview || profile.avatar_url || ''}
                alt="Foto profil"
              />
            ) : (
              <div className="profile-avatar-placeholder">
                {profile.nama_admin.charAt(0).toUpperCase() || 'A'}
              </div>
            )}

            {isEditing && (
              <div className="profile-avatar-overlay">Ganti Foto</div>
            )}

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarSelect}
            />
          </div>

          <div className="profile-info-block">
            <h1>{profile.nama_admin || 'Administrator'}</h1>
            <div className="profile-info-meta">
              <span className="profile-role-badge">
                <ShieldCheck size={13} strokeWidth={2.5} />
                Administrator
              </span>
              <span className="profile-location">
                <MapPin size={13} strokeWidth={2.5} />
                {profile.lokasi || 'Malang City Hardcore'}
              </span>
            </div>
          </div>

          {!isEditing ? (
            <button
              className="profile-edit-btn"
              onClick={startEditing}
              aria-label="Edit profil"
            >
              <Pencil size={18} />
            </button>
          ) : (
            <div className="profile-edit-actions">
              <button
                className="profile-edit-btn confirm"
                onClick={handleSave}
                disabled={saving}
                aria-label="Simpan"
              >
                <Check size={18} />
              </button>
              <button
                className="profile-edit-btn cancel"
                onClick={cancelEditing}
                disabled={saving}
                aria-label="Batal"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="profile-error">{error}</p>}

      {/* FIELDS PANEL */}
      <div className="profile-fields-panel">
        <div className="profile-field">
          <label>
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
          />
        </div>

        <div className="profile-field">
          <label>
            <AtSign size={14} strokeWidth={2.25} />
            Username
          </label>
          <input
            type="text"
            value={form.username}
            readOnly={!isEditing}
            onChange={(e) =>
              setForm({ ...form, username: e.target.value })
            }
          />
        </div>

        <div className="profile-field">
          <label>
            <Mail size={14} strokeWidth={2.25} />
            Email
          </label>
          <input
            type="email"
            value={form.email}
            readOnly={!isEditing}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
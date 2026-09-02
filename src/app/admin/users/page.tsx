'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2, X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import Swal from 'sweetalert2'
import { supabase } from '@/lib/supabase'

interface UserRow {
  id_user: number
  nama: string
  email: string
  role: 'Mahasiswa' | 'Dosen' | 'Admin'
  is_aktif: boolean
}

interface Stats {
  mahasiswa: number
  dosen: number
  modul: number
}

const emptyForm = {
  nama: '',
  email: '',
  password: '',
  role: 'Mahasiswa' as UserRow['role'],
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const USERS_PER_PAGE = 10

export default function ManajemenUserPage() {
  const [stats, setStats] = useState<Stats>({
    mahasiswa: 0,
    dosen: 0,
    modul: 0,
  })

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Menandai baris mana yang sedang diproses "Buka sebagai user ini"
  const [viewingId, setViewingId] = useState<number | null>(null)

  // Pagination tabel — data tetap di-fetch sekaligus dari /api/admin/users,
  // pemotongan per halaman dilakukan di sisi client.
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchStats()
    fetchUsers()
  }, [])

  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE))

  // Kalau halaman aktif jadi tidak valid lagi (misal setelah user dihapus
  // dan halaman terakhir jadi kosong), mundur ke halaman terakhir yang ada.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE
    return users.slice(start, start + USERS_PER_PAGE)
  }, [users, currentPage])

  const rangeStart = users.length === 0 ? 0 : (currentPage - 1) * USERS_PER_PAGE + 1
  const rangeEnd = Math.min(currentPage * USERS_PER_PAGE, users.length)

  async function fetchStats() {
    try {
      // Dipindah ke API route server-side (service role) karena query count
      // langsung dari client bisa diblokir RLS dan diam-diam balik jadi 0.
      const res = await fetch('/api/admin/stats')
      const result = await res.json()

      if (!res.ok) {
        console.error('FETCH STATS ERROR:', result)
        return
      }

      setStats({
        mahasiswa: result.mahasiswa ?? 0,
        dosen: result.dosen ?? 0,
        modul: result.modul ?? 0,
      })
    } catch (error) {
      console.error('Gagal memuat statistik (exception):', error)
    }
  }

  async function fetchUsers() {
    setLoading(true)

    try {
      // Data digabung di server (tabel `user` + mahasiswa/dosen/admin + email
      // dari auth.users) karena email hanya bisa diakses lewat service role.
      const res = await fetch('/api/admin/users')
      const result = await res.json()

      if (!res.ok) {
        console.error('FETCH USERS ERROR:', result)
        setLoading(false)
        return
      }

      setUsers(result.users ?? [])
      setLoading(false)
    } catch (error: any) {
      console.error('Gagal memuat data user (exception):', {
        name: error?.name,
        message: error?.message,
      })
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }

  function openEditModal(user: UserRow) {
    setEditingId(user.id_user)
    setForm({
      nama: user.nama,
      email: user.email,
      password: '',
      role: user.role,
    })
    setFormError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setForm(emptyForm)
    setEditingId(null)
    setFormError('')
  }

  // =========================================
  // VALIDASI FORM
  // =========================================
  function validateForm(): string | null {
    if (!form.nama.trim()) {
      return 'Nama wajib diisi'
    }

    if (!form.email.trim()) {
      return 'Email wajib diisi'
    }

    if (!EMAIL_REGEX.test(form.email.trim())) {
      return 'Format email tidak valid'
    }

    // Cek duplikat email (kecuali email milik user yang sedang diedit)
    const emailTaken = users.some(
      (u) =>
        u.email.toLowerCase() === form.email.trim().toLowerCase() &&
        u.id_user !== editingId
    )
    if (emailTaken) {
      return 'Email ini sudah terdaftar, gunakan email lain'
    }

    if (!editingId) {
      // Validasi khusus saat menambah user baru
      if (!form.password || form.password.length < 6) {
        return 'Password minimal 6 karakter'
      }
    }

    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    const validationError = validateForm()
    if (validationError) {
      setFormError(validationError)
      return
    }

    setSaving(true)

    try {
      if (editingId) {
        // UPDATE user yang sudah ada — nama disimpan di tabel role terkait
        // (admin/dosen/mahasiswa), email di Supabase Auth. Jadi lewat API
        // route server-side, bukan langsung dari client.
        const res = await fetch(`/api/admin/users/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama: form.nama,
            email: form.email,
          }),
        })

        const result = await res.json()

        if (!res.ok) {
          throw new Error(result.message || 'Gagal memperbarui user')
        }
      } else {
        // TAMBAH user baru — lewat API route server-side (service role key),
        // karena signUp di client akan mengganti sesi login admin yang aktif.
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })

        const result = await res.json()

        if (!res.ok) {
          throw new Error(result.message || 'Gagal menambahkan user')
        }
      }

      await fetchUsers()
      await fetchStats()
      closeModal()
    } catch (error: any) {
      console.error('Gagal menyimpan user:', error)
      setFormError(error.message || 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(userId: number) {
    const result = await Swal.fire({
      title: 'Hapus User?',
      text: 'Data user dan data terkait akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      reverseButtons: true,
    })

    if (!result.isConfirmed) return

    try {
      // Tampilkan loading
      Swal.fire({
        title: 'Menghapus...',
        text: 'Sedang menghapus data user.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading()
        },
      })

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      const result = await res.json()

      // Berhasil sebagian
      if (res.status === 207) {
        setUsers((prev) => prev.filter((u) => u.id_user !== userId))
        await fetchStats()

        await Swal.fire({
          icon: 'warning',
          title: 'Berhasil Sebagian',
          text:
            result.message ||
            'User berhasil dihapus, tetapi sebagian data terkait gagal dihapus.',
          confirmButtonColor: '#50427E',
        })

        return
      }

      // Gagal
      if (!res.ok) {
        throw new Error(result.message || 'Gagal menghapus user')
      }

      // Update tabel setelah berhasil
      setUsers((prev) => prev.filter((u) => u.id_user !== userId))
      await fetchStats()

      // Alert berhasil
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Data user berhasil dihapus.',
        confirmButtonColor: '#50427E',
      })
    } catch (error: any) {
      console.error(
        'Gagal menghapus user:',
        JSON.stringify({
          message: error?.message,
        })
      )

      Swal.close()

      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.message || 'Gagal menghapus user.',
        confirmButtonColor: '#50427E',
      })
    }
  }

  // =========================================
  // TOGGLE AKTIF / NONAKTIF
  // =========================================
  async function handleToggleAktif(user: UserRow) {
    const newStatus = !user.is_aktif

    // Update optimis di UI
    setUsers((prev) =>
      prev.map((u) =>
        u.id_user === user.id_user ? { ...u, is_aktif: newStatus } : u
      )
    )

    try {
      const res = await fetch(`/api/admin/users/${user.id_user}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_aktif: newStatus }),
      })

      const result = await res.json()

      if (!res.ok) {
        console.error('TOGGLE STATUS ERROR RESPONSE:', result)
        throw new Error(result.message || 'Gagal mengubah status user')
      }
    } catch (error: any) {
      console.error('Gagal mengubah status user:', {
        message: error?.message,
      })
      // Rollback kalau gagal
      setUsers((prev) =>
        prev.map((u) =>
          u.id_user === user.id_user ? { ...u, is_aktif: user.is_aktif } : u
        )
      )
    }
  }

  // =========================================
  // "BUKA SEBAGAI USER INI" — tanpa perlu tahu password user
  // =========================================
  async function handleViewAsUser(user: UserRow) {
    if (user.role === 'Admin') {
      await Swal.fire({
        icon: 'info',
        title: 'Tidak Dapat Membuka Sesi',
        text: 'Admin tidak dapat membuka sesi sebagai sesama Admin.',
        confirmButtonColor: '#50427E',
      })
      return
    }

    if (!user.is_aktif) {
      await Swal.fire({
        icon: 'warning',
        title: 'User Tidak Aktif',
        text: 'User ini sedang nonaktif. Aktifkan terlebih dahulu sebelum membuka sesinya.',
        confirmButtonColor: '#50427E',
      })
      return
    }

    setViewingId(user.id_user)

    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id_user,
          role: user.role,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.message || 'Gagal membuka sesi user')
      }

      window.open(result.link, '_blank', 'noopener,noreferrer')

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: `Halaman ${user.role} berhasil dibuka di tab baru.`,
        confirmButtonColor: '#50427E',
      })
    } catch (error: any) {
      console.error('Gagal membuka sesi sebagai user:', error)

      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.message || 'Gagal membuka sesi user.',
        confirmButtonColor: '#50427E',
      })
    } finally {
      setViewingId(null)
    }
  }
  return (
    <>
      {/* BANNER */}
      <div className="page-banner">
        <h1>Manajemen User</h1>
      </div>

      {/* STATS CARDS */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-inner">
            <h2>Mahasiswa</h2>
            <p>{stats.mahasiswa}</p>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-inner">
            <h2>Dosen</h2>
            <p>{stats.dosen}</p>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-inner">
            <h2>Modul</h2>
            <p>{stats.modul}</p>
          </div>
        </div>
      </div>

      {/* ADD USER BUTTON */}
      <div className="admin-action-row">
        <button className="btn-add-user" onClick={openAddModal}>
          + User
        </button>
      </div>

      {/* TABLE */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="admin-table-empty">
                  Memuat data...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-table-empty">
                  Belum ada data user
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr key={user.id_user}>
                  <td>{user.nama}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <button
                      type="button"
                      className={`status-toggle ${user.is_aktif ? 'active' : ''
                        }`}
                      onClick={() => handleToggleAktif(user)}
                      aria-label={
                        user.is_aktif
                          ? 'Nonaktifkan user'
                          : 'Aktifkan user'
                      }
                    >
                      <span className="status-toggle-knob" />
                    </button>
                    <span
                      className={`status-label ${user.is_aktif ? 'label-aktif' : 'label-nonaktif'
                        }`}
                    >
                      {user.is_aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      {user.role !== 'Admin' && (
                        <button
                          className="icon-action view-as"
                          onClick={() => handleViewAsUser(user)}
                          disabled={viewingId === user.id_user}
                          aria-label={`Buka dashboard ${user.nama} tanpa login`}
                          title="Buka Halaman User"
                        >
                          <ExternalLink size={16} />
                        </button>
                      )}
                      <button
                        className="icon-action edit"
                        onClick={() => openEditModal(user)}
                        aria-label="Edit user"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-action delete"
                        onClick={() => handleDelete(user.id_user)}
                        aria-label="Hapus user"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && users.length > 0 && (
          <div className="admin-pagination">
            <span className="admin-pagination-info">
              Menampilkan {rangeStart}–{rangeEnd} dari {users.length} user
            </span>

            <div className="admin-pagination-controls">
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="pagination-page-label">
                Halaman {currentPage} dari {totalPages}
              </span>

              <button
                type="button"
                className="pagination-btn"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                aria-label="Halaman berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit User' : 'Tambah User'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="modal-field">
                <label>Nama</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) =>
                    setForm({ ...form, nama: e.target.value })
                  }
                  required
                />
              </div>

              <div className="modal-field">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  required
                />
              </div>

              {!editingId && (
                <div className="modal-field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    minLength={6}
                    required
                  />
                </div>
              )}

              <div className="modal-field">
                <label>Role</label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as UserRow['role'],
                    })
                  }
                  disabled={!!editingId}
                >
                  <option value="Mahasiswa">Mahasiswa</option>
                  <option value="Dosen">Dosen</option>
                  <option value="Admin">Admin</option>
                </select>
                {editingId && (
                  <p className="modal-field-hint">
                    Role tidak bisa diubah lewat form ini
                  </p>
                )}
              </div>

              {formError && <p className="modal-error">{formError}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={closeModal}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-modal-save"
                  disabled={saving}
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
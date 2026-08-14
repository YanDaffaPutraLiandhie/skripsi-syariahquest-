'use client'

import { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, X, ImagePlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Swal from 'sweetalert2'

type JenisSyarat = 'jumlah_modul' | 'level_modul' | 'semua_modul' | 'board_game'

interface BadgeRow {
  id_badge: number
  nama_badge: string
  syarat: string
  icon_url: string | null
  jenis_syarat: JenisSyarat | null
  nilai_syarat: number | null
}

interface LevelOption {
  id_level: number
  nama_level: string
}

interface BadgeForm {
  nama_badge: string
  syarat: string
  iconFile: File | null
  iconPreview: string | null
  jenisSyarat: JenisSyarat
  nilaiSyaratJumlah: number
  nilaiSyaratLevel: number | null
}

const emptyForm: BadgeForm = {
  nama_badge: '',
  syarat: '',
  iconFile: null,
  iconPreview: null,
  jenisSyarat: 'jumlah_modul',
  nilaiSyaratJumlah: 1,
  nilaiSyaratLevel: null,
}

const JENIS_SYARAT_LABEL: Record<JenisSyarat, string> = {
  jumlah_modul: 'Jumlah Modul Selesai',
  level_modul: 'Level Modul Tertentu Selesai',
  semua_modul: 'Semua Modul Selesai',
  board_game: 'Menyelesaikan Board Game',
}

export default function ManajemenBadgesPage() {
  const [badges, setBadges] = useState<BadgeRow[]>([])
  const [levels, setLevels] = useState<LevelOption[]>([])
  const [loading, setLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showAllModal, setShowAllModal] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<BadgeForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const iconInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchBadges()
    fetchLevels()
  }, [])

  async function fetchLevels() {
    try {
      const { data, error } = await supabase
        .from('level')
        .select('id_level, nama_level')
        .order('id_level', { ascending: true })

      if (error) {
        console.error(
          'FETCH LEVEL ERROR:',
          JSON.stringify({ message: error.message })
        )
        return
      }

      const rows = data ?? []
      setLevels(rows)

      setForm((prev) =>
        prev.nilaiSyaratLevel === null && rows.length > 0
          ? { ...prev, nilaiSyaratLevel: rows[0].id_level }
          : prev
      )
    } catch (error: any) {
      console.error(
        'Gagal memuat data level (exception):',
        JSON.stringify({ message: error?.message })
      )
    }
  }

  async function fetchBadges() {
    setLoading(true)

    try {
      // TODO: sesuaikan nama tabel & kolom dengan skema Supabase Anda
      const { data, error } = await supabase
        .from('badges')
        .select('id_badge, nama_badge, syarat, icon_url, jenis_syarat, nilai_syarat')
        .order('id_badge', { ascending: true })

      if (error) {
        console.error('FETCH BADGES ERROR:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        setLoading(false)
        return
      }

      setBadges(data ?? [])
      setLoading(false)
    } catch (error: any) {
      console.error('Gagal memuat data badges (exception):', {
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
    setShowAddModal(true)
  }

  function openEditModal(badge: BadgeRow) {
    setEditingId(badge.id_badge)
    setForm({
      nama_badge: badge.nama_badge,
      syarat: badge.syarat,
      iconFile: null,
      iconPreview: badge.icon_url,
      jenisSyarat: badge.jenis_syarat ?? 'jumlah_modul',
      nilaiSyaratJumlah:
        badge.jenis_syarat === 'jumlah_modul' && badge.nilai_syarat
          ? badge.nilai_syarat
          : 1,
      nilaiSyaratLevel:
        badge.jenis_syarat === 'level_modul' && badge.nilai_syarat
          ? badge.nilai_syarat
          : levels[0]?.id_level ?? null,
    })
    setFormError('')
    setShowAddModal(true)
  }

  function closeModal() {
    setShowAddModal(false)
    setForm(emptyForm)
    setEditingId(null)
    setFormError('')
  }

  function handleIconClick() {
    iconInputRef.current?.click()
  }

  function handleIconSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    setForm((prev) => ({
      ...prev,
      iconFile: file,
      iconPreview: previewUrl,
    }))
  }

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setSaving(true)
  setFormError('')

  try {
    if (!form.nama_badge.trim()) {
      throw new Error('Nama badge wajib diisi')
    }

    if (
      form.jenisSyarat === 'level_modul' &&
      !form.nilaiSyaratLevel
    ) {
      throw new Error('Pilih level modul untuk syarat badge ini')
    }

    let iconUrl: string | null = editingId
      ? badges.find((b) => b.id_badge === editingId)?.icon_url ?? null
      : null

    // Upload icon jika ada file baru
    if (form.iconFile) {
      const path = `badges/${Date.now()}-${form.iconFile.name}`

      const { error: uploadError } = await supabase.storage
        .from('badge-icons')
        .upload(path, form.iconFile)

      if (uploadError) throw uploadError

      const { data: publicUrl } = supabase.storage
        .from('badge-icons')
        .getPublicUrl(path)

      iconUrl = publicUrl.publicUrl
    }

    const nilaiSyarat =
      form.jenisSyarat === 'jumlah_modul'
        ? form.nilaiSyaratJumlah
        : form.jenisSyarat === 'level_modul'
        ? form.nilaiSyaratLevel
        : null

    const payload = {
      nama_badge: form.nama_badge,
      syarat: form.syarat,
      icon_url: iconUrl,
      jenis_syarat: form.jenisSyarat,
      nilai_syarat: nilaiSyarat,
    }

    if (editingId) {
      // =========================
      // EDIT BADGE
      // =========================
      const { error } = await supabase
        .from('badges')
        .update(payload)
        .eq('id_badge', editingId)

      if (error) throw error

      await fetchBadges()
      closeModal()

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Badge berhasil diperbarui.',
        confirmButtonColor: '#50427E',
      })
    } else {
      // =========================
      // TAMBAH BADGE
      // =========================
      const { error } = await supabase
        .from('badges')
        .insert(payload)

      if (error) throw error

      await fetchBadges()
      closeModal()

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Badge berhasil ditambahkan.',
        confirmButtonColor: '#50427E',
      })
    }
  } catch (error: any) {
    console.error('Gagal menyimpan badge:', error)

    setFormError(error.message || 'Terjadi kesalahan')

    await Swal.fire({
      icon: 'error',
      title: 'Gagal',
      text: error.message || 'Terjadi kesalahan saat menyimpan badge.',
      confirmButtonColor: '#50427E',
    })
  } finally {
    setSaving(false)
  }
}

  async function handleDelete(id: number) {
  const result = await Swal.fire({
    title: 'Hapus Badge?',
    text: 'Data badge yang dihapus tidak dapat dikembalikan.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
  })

  if (!result.isConfirmed) return

  try {
    const { error } = await supabase
      .from('badges')
      .delete()
      .eq('id_badge', id)

    if (error) throw error

    setBadges((prev) =>
      prev.filter((b) => b.id_badge !== id)
    )

    await Swal.fire({
      icon: 'success',
      title: 'Berhasil',
      text: 'Badge berhasil dihapus.',
      confirmButtonColor: '#50427E',
    })
  } catch (error: any) {
    console.error('Gagal menghapus badge:', error)

    await Swal.fire({
      icon: 'error',
      title: 'Gagal',
      text:
        error?.message ||
        'Terjadi kesalahan saat menghapus badge.',
      confirmButtonColor: '#50427E',
    })
  }
}

  const previewBadges = badges.slice(0, 3)

  return (
    <>
      {/* BANNER */}
      <div className="page-banner">
        <h1>Manajemen Badges</h1>
      </div>

      <p className="badges-subtitle">
        Kelola pencapaian yang dapat diperoleh mahasiswa
      </p>

      {/* PREVIEW CARD */}
      <div className="badges-preview-row">
        <div className="badges-preview-card">
          <div className="badges-preview-icons">
            {previewBadges.length === 0 ? (
              <p className="badges-preview-empty">Belum ada badge</p>
            ) : (
              previewBadges.map((badge, index) => (
                <div
                  key={badge.id_badge}
                  className={`badges-preview-icon-wrap ${
                    index === 1 ? 'badges-preview-icon-large' : ''
                  }`}
                >
                  {badge.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={badge.icon_url} alt={badge.nama_badge} />
                  ) : (
                    <div className="badges-preview-icon-placeholder" />
                  )}
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            className="badges-lihat-semua"
            onClick={() => setShowAllModal(true)}
          >
            Lihat Semua
          </button>
        </div>

        {/* ADD BADGE BUTTON */}
        <div className="badges-action-col">
          <button className="btn-add-user" onClick={openAddModal}>
            + Badges
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Badges</th>
              <th>Syarat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="admin-table-empty">
                  Memuat data...
                </td>
              </tr>
            ) : badges.length === 0 ? (
              <tr>
                <td colSpan={3} className="admin-table-empty">
                  Belum ada data badge
                </td>
              </tr>
            ) : (
              badges.map((badge) => (
                <tr key={badge.id_badge}>
                  <td>
                    <div className="badges-table-name">
                      {badge.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={badge.icon_url} alt={badge.nama_badge} />
                      ) : (
                        <div className="badges-table-icon-placeholder" />
                      )}
                      <span>{badge.nama_badge}</span>
                    </div>
                  </td>
                  <td>
                    {badge.syarat}
                    {badge.jenis_syarat && (
                      <span className="badges-jenis-tag">
                        {JENIS_SYARAT_LABEL[badge.jenis_syarat]}
                        {badge.jenis_syarat === 'jumlah_modul' &&
                          badge.nilai_syarat &&
                          ` (${badge.nilai_syarat})`}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button
                        className="icon-action edit"
                        onClick={() => openEditModal(badge)}
                        aria-label="Edit badge"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-action delete"
                        onClick={() => handleDelete(badge.id_badge)}
                        aria-label="Hapus badge"
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
      </div>

      {/* ADD / EDIT MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Badge' : 'Tambah Badge'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {/* ICON UPLOAD */}
              <div className="modal-field">
                <label>Ikon Badge</label>
                <div
                  className="badge-icon-upload"
                  onClick={handleIconClick}
                >
                  {form.iconPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.iconPreview} alt="Preview icon" />
                  ) : (
                    <div className="badge-icon-upload-placeholder">
                      <ImagePlus size={26} />
                      <span>Unggah ikon</span>
                    </div>
                  )}
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleIconSelect}
                  />
                </div>
              </div>

              <div className="modal-field">
                <label>Nama Badge</label>
                <input
                  type="text"
                  value={form.nama_badge}
                  onChange={(e) =>
                    setForm({ ...form, nama_badge: e.target.value })
                  }
                  required
                />
              </div>

              <div className="modal-field">
                <label>Syarat (teks yang tampil ke mahasiswa)</label>
                <input
                  type="text"
                  value={form.syarat}
                  onChange={(e) =>
                    setForm({ ...form, syarat: e.target.value })
                  }
                  placeholder="Contoh: Menyelesaikan 2 Modul"
                />
              </div>

              {/* JENIS SYARAT (untuk sistem, otomatis trigger badge) */}
              <div className="modal-field">
                <label>Jenis Syarat (dipakai sistem untuk cek otomatis)</label>
                <select
                  value={form.jenisSyarat}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      jenisSyarat: e.target.value as JenisSyarat,
                    })
                  }
                >
                  {(Object.keys(JENIS_SYARAT_LABEL) as JenisSyarat[]).map(
                    (key) => (
                      <option key={key} value={key}>
                        {JENIS_SYARAT_LABEL[key]}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* NILAI SYARAT — berubah sesuai jenis yang dipilih */}
              {form.jenisSyarat === 'jumlah_modul' && (
                <div className="modal-field">
                  <label>Jumlah Modul yang Harus Diselesaikan</label>
                  <input
                    type="number"
                    min={1}
                    value={form.nilaiSyaratJumlah}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nilaiSyaratJumlah: Math.max(
                          1,
                          Number(e.target.value) || 1
                        ),
                      })
                    }
                  />
                </div>
              )}

              {form.jenisSyarat === 'level_modul' && (
                <div className="modal-field">
                  <label>Level Modul yang Harus Diselesaikan</label>
                  {levels.length === 0 ? (
                    <p className="modal-field-hint">
                      Belum ada data level di database
                    </p>
                  ) : (
                    <select
                      value={form.nilaiSyaratLevel ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          nilaiSyaratLevel: Number(e.target.value),
                        })
                      }
                    >
                      {levels.map((lvl) => (
                        <option key={lvl.id_level} value={lvl.id_level}>
                          {lvl.nama_level}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {form.jenisSyarat === 'semua_modul' && (
                <p className="modal-field-hint">
                  Badge ini otomatis diberikan begitu mahasiswa menyelesaikan
                  seluruh modul yang ada di sistem.
                </p>
              )}
              {form.jenisSyarat === 'board_game' && (
  <p className="modal-field-hint">
    Badge ini akan diberikan ketika mahasiswa berhasil
    menyelesaikan Board Game.
  </p>
)}

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

      {/* LIHAT SEMUA MODAL */}
      {showAllModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAllModal(false)}
        >
          <div
            className="modal-box badges-all-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Semua Badges</h3>
              <button
                className="modal-close"
                onClick={() => setShowAllModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {badges.length === 0 ? (
              <p className="badges-preview-empty">Belum ada badge</p>
            ) : (
              <div className="badges-all-grid">
                {badges.map((badge) => (
                  <div key={badge.id_badge} className="badges-all-item">
                    <div className="badges-all-icon-wrap">
                      {badge.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={badge.icon_url} alt={badge.nama_badge} />
                      ) : (
                        <div className="badges-preview-icon-placeholder" />
                      )}
                    </div>
                    <span>{badge.nama_badge}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

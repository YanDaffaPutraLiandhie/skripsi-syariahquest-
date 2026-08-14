'use client'

import { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, UploadCloud } from 'lucide-react'
import Swal from 'sweetalert2'
import { supabase } from '@/lib/supabase'

interface LevelOption {
  id_level: number
  nama_level: string
}

interface ModulRow {
  id_modul: number
  nama_modul: string
  id_level: number
  teks_materi: string | null
  video_url: string | null
  dokumen_pendukung: string | null
  thumbnail_url: string | null
  dibuat_oleh: string | null
  parameter_nilai: number | null
}

interface LevelStats {
  easy: number
  medium: number
  hard: number
}

interface ModulForm {
  idLevel: number | null
  namaModul: string
  teksMateri: string
  linkVideo: string
  parameterNilai: number
  dokumenFile: File | null
  thumbnailFile: File | null
  dokumenFileName: string
  thumbnailFileName: string
}

const emptyForm: ModulForm = {
  idLevel: null,
  namaModul: '',
  teksMateri: '',
  linkVideo: '',
  parameterNilai: 80,
  dokumenFile: null,
  thumbnailFile: null,
  dokumenFileName: '',
  thumbnailFileName: '',
}

// Pemetaan nama level -> class warna pill. Cocokkan case-insensitive
// supaya tetap jalan walau di database ditulis "easy"/"Easy"/"EASY".
function levelPillClass(namaLevel: string) {
  const lower = namaLevel.toLowerCase()
  if (lower.includes('easy')) return 'pill-easy'
  if (lower.includes('medium')) return 'pill-medium'
  if (lower.includes('hard')) return 'pill-hard'
  return 'pill-easy'
}

export default function ManajemenModulPage() {
  const [view, setView] = useState<'list' | 'form'>('list')

  const [levels, setLevels] = useState<LevelOption[]>([])
  const [stats, setStats] = useState<LevelStats>({
    easy: 0,
    medium: 0,
    hard: 0,
  })

  const [modules, setModules] = useState<ModulRow[]>([])
  const [loading, setLoading] = useState(true)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ModulForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Nama admin yang sedang login, dipakai otomatis untuk kolom `dibuat_oleh`
  const [currentAdminName, setCurrentAdminName] = useState<string>('Admin')

  const dokumenInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchLevels()
    fetchModules()
    fetchCurrentAdminName()
  }, [])

  async function fetchCurrentAdminName() {
    try {
      const { data: authData } = await supabase.auth.getUser()
      const authUser = authData.user
      if (!authUser) return

      // TODO: sesuaikan nama tabel/kolom dengan skema Supabase Anda
      const { data: userRow, error: userError } = await supabase
        .from('user')
        .select('id_admin')
        .eq('auth_user_id', authUser.id)
        .single()

      if (userError || !userRow?.id_admin) return

      const { data: adminRow, error: adminError } = await supabase
        .from('admin')
        .select('nama_admin')
        .eq('id_admin', userRow.id_admin)
        .single()

      if (adminError || !adminRow?.nama_admin) return

      setCurrentAdminName(adminRow.nama_admin)
    } catch (error: any) {
      console.error(
        'Gagal memuat nama admin (exception):',
        JSON.stringify({ message: error?.message })
      )
    }
  }

  async function fetchLevels() {
    try {
      const { data, error } = await supabase
        .from('level')
        .select('id_level, nama_level')
        .order('id_level', { ascending: true })

      if (error) {
        console.error(
          'FETCH LEVEL ERROR:',
          JSON.stringify({ message: error.message, code: error.code })
        )
        return
      }

      const rows: LevelOption[] = data ?? []
      setLevels(rows)

      setForm((prev) =>
        prev.idLevel === null && rows.length > 0
          ? { ...prev, idLevel: rows[0].id_level }
          : prev
      )
    } catch (error: any) {
      console.error(
        'Gagal memuat data level (exception):',
        JSON.stringify({ message: error?.message })
      )
    }
  }

  function getLevelName(idLevel: number) {
    return levels.find((l) => l.id_level === idLevel)?.nama_level ?? '-'
  }

  async function fetchModules() {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('modul')
        .select(
          'id_modul, nama_modul, id_level, teks_materi, video_url, dokumen_pendukung, thumbnail_url, dibuat_oleh, parameter_nilai'
        )
        .order('id_modul', { ascending: false })

      if (error) {
        console.error(
          'FETCH MODUL ERROR:',
          JSON.stringify(
            {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            },
            null,
            2
          )
        )
        setLoading(false)
        return
      }

      const rows: ModulRow[] = data ?? []
      setModules(rows)
      setLoading(false)
    } catch (error: any) {
      console.error(
        'Gagal memuat data modul (exception):',
        JSON.stringify({ name: error?.name, message: error?.message })
      )
      setLoading(false)
    }
  }

  // Hitung ulang statistik setiap kali modules ATAU levels berubah
  useEffect(() => {
    if (levels.length === 0) return

    function countByName(keyword: string) {
      return modules.filter((m) =>
        getLevelName(m.id_level).toLowerCase().includes(keyword)
      ).length
    }

    setStats({
      easy: countByName('easy'),
      medium: countByName('medium'),
      hard: countByName('hard'),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, levels])

  function openAddForm() {
    setEditingId(null)
    setForm({
      ...emptyForm,
      idLevel: levels[0]?.id_level ?? null,
    })
    setFormError('')
    setView('form')
  }

  function openEditForm(modul: ModulRow) {
    setEditingId(modul.id_modul)
    setForm({
      ...emptyForm,
      idLevel: modul.id_level,
      namaModul: modul.nama_modul,
      teksMateri: modul.teks_materi ?? '',
      linkVideo: modul.video_url ?? '',
      parameterNilai: modul.parameter_nilai ?? 80,
      thumbnailFileName: modul.thumbnail_url ? 'File sudah ada' : '',
      dokumenFileName: modul.dokumen_pendukung ? 'File sudah ada' : '',
    })
    setFormError('')
    setView('form')
  }

  function backToList() {
    setView('list')
    setForm(emptyForm)
    setEditingId(null)
    setFormError('')
  }

  function handleDokumenSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setForm((prev) => ({
      ...prev,
      dokumenFile: file,
      dokumenFileName: file.name,
    }))
  }

  function handleThumbnailSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setForm((prev) => ({
      ...prev,
      thumbnailFile: file,
      thumbnailFileName: file.name,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()

  // Konfirmasi sebelum simpan/update
  const result = await Swal.fire({
    title: editingId ? 'Update Modul?' : 'Tambah Modul?',
    text: editingId
      ? 'Perubahan data modul akan disimpan.'
      : 'Modul baru akan ditambahkan.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: editingId ? 'Ya, Update' : 'Ya, Simpan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#22c55e',
    cancelButtonColor: '#6b7280',
  })

  if (!result.isConfirmed) return

  setSaving(true)
  setFormError('')

  // DEBUG SEMENTARA
  const { data: sessionCheck } = await supabase.auth.getSession()
  console.log(
    'SESI SAAT SUBMIT:',
    sessionCheck.session ? 'ADA SESI (authenticated)' : 'TIDAK ADA SESI (anon)',
    sessionCheck.session?.user?.email
  )

  try {
    if (!form.namaModul.trim()) {
      throw new Error('Nama modul wajib diisi')
    }

    if (!form.idLevel) {
      throw new Error('Pilih level modul terlebih dahulu')
    }

    let dokumenUrl: string | null = null
    let thumbnailUrl: string | null = null

    if (form.dokumenFile) {
      const path = `dokumen/${Date.now()}-${form.dokumenFile.name}`

      const { error: uploadError } = await supabase.storage
        .from('modul-files')
        .upload(path, form.dokumenFile)

      if (uploadError) throw uploadError

      const { data: publicUrl } = supabase.storage
        .from('modul-files')
        .getPublicUrl(path)

      dokumenUrl = publicUrl.publicUrl
    }

    if (form.thumbnailFile) {
      const path = `thumbnail/${Date.now()}-${form.thumbnailFile.name}`

      const { error: uploadError } = await supabase.storage
        .from('modul-files')
        .upload(path, form.thumbnailFile)

      if (uploadError) throw uploadError

      const { data: publicUrl } = supabase.storage
        .from('modul-files')
        .getPublicUrl(path)

      thumbnailUrl = publicUrl.publicUrl
    }

    const payload: Record<string, any> = {
      nama_modul: form.namaModul,
      id_level: form.idLevel,
      teks_materi: form.teksMateri || null,
      video_url: form.linkVideo || null,
      parameter_nilai: form.parameterNilai,
    }

    if (dokumenUrl) payload.dokumen_pendukung = dokumenUrl
    if (thumbnailUrl) payload.thumbnail_url = thumbnailUrl

    if (editingId) {
      const { error } = await supabase
        .from('modul')
        .update(payload)
        .eq('id_modul', editingId)

      if (error) throw error
    } else {
      payload.dibuat_oleh = currentAdminName

      const { error } = await supabase
        .from('modul')
        .insert(payload)

      if (error) throw error
    }

    await fetchModules()

    await Swal.fire({
      icon: 'success',
      title: 'Berhasil',
      text: editingId
        ? 'Modul berhasil diperbarui.'
        : 'Modul berhasil ditambahkan.',
      confirmButtonColor: '#50427E',
    })

    backToList()
  } catch (error: any) {
    console.error(
      'Gagal menyimpan modul:',
      JSON.stringify(
        {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          name: error?.name,
        },
        null,
        2
      )
    )

    Swal.fire({
      icon: 'error',
      title: 'Gagal',
      text: error.message || 'Terjadi kesalahan saat menyimpan modul.',
      confirmButtonColor: '#50427E',
    })

    setFormError(error.message || 'Terjadi kesalahan')
  } finally {
    setSaving(false)
  }
}

 async function handleDelete(id: number) {
  const result = await Swal.fire({
    title: 'Hapus Modul?',
    text: 'Data yang dihapus tidak dapat dikembalikan.',
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
      .from('modul')
      .delete()
      .eq('id_modul', id)

    if (error) throw error

    setModules((prev) =>
      prev.filter((b) => b.id_modul !== id)
    )

    Swal.fire({
      icon: 'success',
      title: 'Berhasil',
      text: 'Modul berhasil dihapus.',
      confirmButtonColor: '#50427E',
    })
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Gagal',
      text: 'Terjadi kesalahan saat menghapus modul.',
      confirmButtonColor: '#50427E',
    })
  }
}
  /* =========================================
     VIEW: FORM TAMBAH / EDIT MODUL
  ========================================= */

  if (view === 'form') {
    return (
      <div className="modul-form-panel">
        {/* TOP ROW: parameter nilai + level modul */}
        <div className="modul-form-top-row">
          <div className="modul-white-card modul-parameter-card">
            <h3>Set Parameter Nilai</h3>
            <div className="modul-parameter-value">
              <input
                type="number"
                min={0}
                max={100}
                value={form.parameterNilai}
                onChange={(e) =>
                  setForm({
                    ...form,
                    parameterNilai: Number(e.target.value),
                  })
                }
              />
              <span>%</span>
            </div>
          </div>

          <div className="modul-white-card modul-level-card">
            <h3>Level Modul</h3>
            <div className="modul-level-pills">
              {levels.length === 0 ? (
                <p className="modul-level-empty">
                  Belum ada data level di database
                </p>
              ) : (
                levels.map((lvl) => (
                  <button
                    key={lvl.id_level}
                    type="button"
                    className={`level-pill ${levelPillClass(
                      lvl.nama_level
                    )} ${form.idLevel === lvl.id_level ? 'active' : ''}`}
                    onClick={() =>
                      setForm({ ...form, idLevel: lvl.id_level })
                    }
                  >
                    {lvl.nama_level}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* NAMA MODUL */}
          <div className="modul-form-field">
            <label>Nama Modul</label>
            <input
              type="text"
              className="modul-pill-input input-green"
              value={form.namaModul}
              onChange={(e) =>
                setForm({ ...form, namaModul: e.target.value })
              }
              required
            />
          </div>

          {/* TEKS MATERI */}
          <div className="modul-form-field">
            <label>Teks Materi</label>
            <textarea
              className="modul-textarea-input"
              value={form.teksMateri}
              onChange={(e) =>
                setForm({ ...form, teksMateri: e.target.value })
              }
              rows={5}
              placeholder="Tulis isi materi pembelajaran di sini..."
            />
          </div>

          {/* LINK VIDEO */}
          <div className="modul-form-field">
            <label>Link Vidio Pembelajaran</label>
            <input
              type="url"
              className="modul-pill-input input-orange"
              placeholder="https://..."
              value={form.linkVideo}
              onChange={(e) =>
                setForm({ ...form, linkVideo: e.target.value })
              }
            />
          </div>

          {/* UPLOAD FILES */}
          <div className="modul-upload-grid">
            <div>
              <label className="modul-upload-label">
                Dokumen Pembelajaran (Doc/Pdf)
              </label>
              <div
                className="modul-dropzone dropzone-blue"
                onClick={() => dokumenInputRef.current?.click()}
              >
                <UploadCloud size={28} />
                <span>
                  {form.dokumenFileName || 'Unggah File disini'}
                </span>
                <input
                  ref={dokumenInputRef}
                  type="file"
                  accept=".doc,.docx,.pdf"
                  hidden
                  onChange={handleDokumenSelect}
                />
              </div>
            </div>

            <div>
              <label className="modul-upload-label">Thumbnail Modul</label>
              <div
                className="modul-dropzone dropzone-yellow"
                onClick={() => thumbnailInputRef.current?.click()}
              >
                {form.thumbnailFileName ? (
                  <span>{form.thumbnailFileName}</span>
                ) : (
                  <>
                    <UploadCloud size={28} />
                    <span>Unggah File disini</span>
                  </>
                )}
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleThumbnailSelect}
                />
              </div>
            </div>
          </div>

          {formError && <p className="modul-form-error">{formError}</p>}

          {/* ACTIONS */}
          <div className="modul-form-actions">
            <button
              type="button"
              className="btn-modul-batal"
              onClick={backToList}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-modul-simpan"
              disabled={saving}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  /* =========================================
     VIEW: DAFTAR MODUL
  ========================================= */

  return (
    <>
      {/* BANNER */}
      <div className="page-banner">
        <h1>Manajemen Modul</h1>
      </div>

      {/* LEVEL STAT CARDS */}
      <div className="modul-stats-grid">
        <div className="modul-stat-card modul-easy">
          <h2>Easy</h2>
          <p>{stats.easy}</p>
        </div>

        <div className="modul-stat-card modul-medium">
          <h2>Medium</h2>
          <p>{stats.medium}</p>
        </div>

        <div className="modul-stat-card modul-hard">
          <h2>Hard</h2>
          <p>{stats.hard}</p>
        </div>
      </div>

      {/* ADD MODUL BUTTON */}
      <div className="admin-action-row">
        <button className="btn-add-user" onClick={openAddForm}>
          + Modul
        </button>
      </div>

      {/* TABLE */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nama Modul</th>
              <th>Level</th>
              <th>Dibuat oleh</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="admin-table-empty">
                  Memuat data...
                </td>
              </tr>
            ) : modules.length === 0 ? (
              <tr>
                <td colSpan={4} className="admin-table-empty">
                  Belum ada data modul
                </td>
              </tr>
            ) : (
              modules.map((modul) => (
                <tr key={modul.id_modul}>
                  <td>{modul.nama_modul}</td>
                  <td>{getLevelName(modul.id_level)}</td>
                  <td>{modul.dibuat_oleh || '-'}</td>
                  <td>
                    <div className="admin-table-actions">
                      <button
                        className="icon-action edit"
                        onClick={() => openEditForm(modul)}
                        aria-label="Edit modul"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-action delete"
                        onClick={() => handleDelete(modul.id_modul)}
                        aria-label="Hapus modul"
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
    </>
  )
}

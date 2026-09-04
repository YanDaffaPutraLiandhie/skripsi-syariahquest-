'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Trash2, UploadCloud, ChevronLeft, ChevronRight } from 'lucide-react'
import Swal from 'sweetalert2'
import { supabase } from '@/lib/supabase'

interface LevelOption {
  id_level: number
  nama_level: string
}

interface DosenOption {
  id_dosen: number
  nama_dosen: string
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

// Pemetaan nama level -> warna pill. Cocokkan case-insensitive
// supaya tetap jalan walau di database ditulis "easy"/"Easy"/"EASY".
function levelPillColor(namaLevel: string) {
  const lower = namaLevel.toLowerCase()
  if (lower.includes('easy')) return 'bg-emerald-500'
  if (lower.includes('medium')) return 'bg-amber-400'
  if (lower.includes('hard')) return 'bg-red-600'
  return 'bg-[#8a80b8]'
}

export default function ManajemenModulPage() {
  const [view, setView] = useState<'list' | 'form'>('list')

  const [levels, setLevels] = useState<LevelOption[]>([])
  const [dosen, setDosen] = useState<DosenOption[]>([])
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

  const [currentAdminName, setCurrentAdminName] = useState<string>('Admin')

  const dokumenInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  const MODULES_PER_PAGE = 10
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchLevels()
    fetchDosen()
    fetchModules()
    fetchCurrentAdminName()
  }, [])

  async function fetchDosen() {
    try {
      const { data, error } = await supabase
        .from('dosen')
        .select('id_dosen, nama_dosen')
        .order('nama_dosen', { ascending: true })

      if (error) {
        console.error(
          'FETCH DOSEN ERROR:',
          JSON.stringify({
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          }, null, 2)
        )
        return
      }

      setDosen(data ?? [])
    } catch (error: any) {
      console.error(
        'Gagal memuat data dosen:',
        JSON.stringify({ message: error?.message })
      )
    }
  }

  async function fetchCurrentAdminName() {
    try {
      const { data: authData } = await supabase.auth.getUser()
      const authUser = authData.user
      if (!authUser) return

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

  function getPembuatName(dibuatOleh: string | null) {
    if (!dibuatOleh) return '-'

    const dosenRow = dosen.find(
      (d) => String(d.id_dosen) === String(dibuatOleh)
    )

    if (dosenRow) {
      return dosenRow.nama_dosen
    }

    return dibuatOleh
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

  const totalPages = Math.max(1, Math.ceil(modules.length / MODULES_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const paginatedModules = useMemo(() => {
    const start = (currentPage - 1) * MODULES_PER_PAGE
    return modules.slice(start, start + MODULES_PER_PAGE)
  }, [modules, currentPage])

  const rangeStart =
    modules.length === 0 ? 0 : (currentPage - 1) * MODULES_PER_PAGE + 1
  const rangeEnd = Math.min(currentPage * MODULES_PER_PAGE, modules.length)

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

    const result = await Swal.fire({
      title: editingId ? 'Update Modul?' : 'Tambah Modul?',
      text: editingId
        ? 'Perubahan data modul akan disimpan.'
        : 'Modul baru akan ditambahkan.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: editingId ? 'Ya, Update' : 'Ya, Simpan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#4a3f7a',
      cancelButtonColor: '#6b7280',
    })

    if (!result.isConfirmed) return

    setSaving(true)
    setFormError('')

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
        confirmButtonColor: '#4a3f7a',
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
        confirmButtonColor: '#4a3f7a',
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

      setModules((prev) => prev.filter((b) => b.id_modul !== id))

      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Modul berhasil dihapus.',
        confirmButtonColor: '#4a3f7a',
      })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Terjadi kesalahan saat menghapus modul.',
        confirmButtonColor: '#4a3f7a',
      })
    }
  }

  /* =========================================
     VIEW: FORM TAMBAH / EDIT MODUL
  ========================================= */

  if (view === 'form') {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {/* TOP ROW: parameter nilai + level modul */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] p-5">
            <h3 className="mb-2 text-center text-sm font-bold text-[#3d3466]">
              Set Parameter Nilai
            </h3>
            <div className="flex items-center justify-center gap-2">
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
                className="w-24 rounded-xl border border-[#4a3f7a]/20 bg-white px-3 py-2 text-center text-xl font-black text-[#3d3466] outline-none focus:border-[#4a3f7a] focus:ring-2 focus:ring-[#4a3f7a]/20"
              />
              <span className="text-xl font-black text-[#3d3466]">%</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] p-5">
            <h3 className="mb-3 text-center text-sm font-bold text-[#3d3466]">
              Level Modul
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {levels.length === 0 ? (
                <p className="text-xs text-[#a79fd6]">
                  Belum ada data level di database
                </p>
              ) : (
                levels.map((lvl) => (
                  <button
                    key={lvl.id_level}
                    type="button"
                    onClick={() => setForm({ ...form, idLevel: lvl.id_level })}
                    className={`rounded-full px-6 py-2 text-sm font-bold text-white shadow-sm transition-all ${levelPillColor(
                      lvl.nama_level
                    )} ${form.idLevel === lvl.id_level
                      ? 'opacity-100 scale-105 ring-2 ring-offset-2 ring-[#4a3f7a]'
                      : 'opacity-40 hover:opacity-80'
                      }`}
                  >
                    {lvl.nama_level}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-black/5">
          {/* NAMA MODUL */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-bold text-[#3d3466]">
              Nama Modul
            </label>
            <input
              type="text"
              value={form.namaModul}
              onChange={(e) => setForm({ ...form, namaModul: e.target.value })}
              required
              className="h-12 w-full rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] px-4 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20"
            />
          </div>

          {/* TEKS MATERI */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-bold text-[#3d3466]">
              Teks Materi
            </label>
            <textarea
              value={form.teksMateri}
              onChange={(e) => setForm({ ...form, teksMateri: e.target.value })}
              rows={5}
              placeholder="Tulis isi materi pembelajaran di sini..."
              className="w-full resize-none rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] px-4 py-3 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20"
            />
          </div>

          {/* LINK VIDEO */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-bold text-[#3d3466]">
              Link Video Pembelajaran
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={form.linkVideo}
              onChange={(e) => setForm({ ...form, linkVideo: e.target.value })}
              className="h-12 w-full rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] px-4 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20"
            />
          </div>

          {/* UPLOAD FILES */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#3d3466]">
                Dokumen Pembelajaran (Doc/PDF)
              </label>
              <div
                onClick={() => dokumenInputRef.current?.click()}
                className="flex h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sky-300 bg-[#f8f7fd] text-center transition hover:bg-[#f0edf9]"
              >
                <UploadCloud size={28} className="text-[#4a3f7a]" />
                <span className="px-4 text-sm font-bold text-[#4a3f7a]">
                  {form.dokumenFileName || 'Unggah file di sini'}
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
              <label className="mb-2 block text-sm font-bold text-[#3d3466]">
                Thumbnail Modul
              </label>
              <div
                onClick={() => thumbnailInputRef.current?.click()}
                className="flex h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-300 bg-[#f8f7fd] text-center transition hover:bg-[#f0edf9]"
              >
                <UploadCloud size={28} className="text-[#4a3f7a]" />
                <span className="px-4 text-sm font-bold text-[#4a3f7a]">
                  {form.thumbnailFileName || 'Unggah file di sini'}
                </span>
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

          {formError && (
            <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600 ring-1 ring-red-200">
              {formError}
            </p>
          )}

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 border-t border-[#f0edf9] pt-4">
            <button
              type="button"
              onClick={backToList}
              className="rounded-full border border-[#e4e2ee] bg-white px-7 py-3 text-sm font-bold text-[#4a3f7a] transition hover:bg-[#f8f7fd]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-amber-400 px-8 py-3 text-sm font-bold text-amber-950 shadow-md shadow-amber-900/20 transition hover:bg-amber-300 disabled:opacity-50"
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
    <div className="space-y-6">
      {/* BANNER */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a3f7a] to-[#3d3466] px-8 py-7 shadow-lg shadow-[#3d3466]/20 lg:px-10 lg:py-8">
        <h1 className="text-2xl font-bold text-white lg:text-3xl">
          Manajemen Modul
        </h1>
      </div>

      {/* LEVEL STAT CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="text-sm font-bold text-emerald-600">Easy</h2>
          <p className="mt-1 text-3xl font-black text-[#3d3466]">{stats.easy}</p>
        </div>
        <div className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="text-sm font-bold text-amber-500">Medium</h2>
          <p className="mt-1 text-3xl font-black text-[#3d3466]">{stats.medium}</p>
        </div>
        <div className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="text-sm font-bold text-red-600">Hard</h2>
          <p className="mt-1 text-3xl font-black text-[#3d3466]">{stats.hard}</p>
        </div>
      </div>

      {/* ADD MODUL BUTTON */}
      <div className="flex justify-end">
        <button
          onClick={openAddForm}
          className="rounded-full bg-amber-400 px-6 py-2.5 text-sm font-bold text-amber-950 shadow-sm shadow-amber-900/20 transition hover:bg-amber-300"
        >
          + Modul
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0edf9] text-xs font-bold uppercase tracking-wide text-[#8b84a5]">
                <th className="px-5 py-3">Nama Modul</th>
                <th className="px-5 py-3">Level</th>
                <th className="px-5 py-3">Dibuat oleh</th>
                <th className="px-5 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0edf9]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm font-semibold text-[#4a3f7a]">
                    Memuat data...
                  </td>
                </tr>
              ) : modules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-[#a79fd6]">
                    Belum ada data modul
                  </td>
                </tr>
              ) : (
                paginatedModules.map((modul) => (
                  <tr key={modul.id_modul} className="transition hover:bg-[#f8f7fd]">
                    <td className="px-5 py-3.5 font-semibold text-[#2b2540]">
                      {modul.nama_modul}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${levelPillColor(
                          getLevelName(modul.id_level)
                        )}`}
                      >
                        {getLevelName(modul.id_level)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#6e6a85]">
                      {getPembuatName(modul.dibuat_oleh)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditForm(modul)}
                          aria-label="Edit modul"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f2fa] text-[#4a3f7a] transition hover:bg-[#e9e5f7]"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(modul.id_modul)}
                          aria-label="Hapus modul"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100"
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

        {!loading && modules.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0edf9] px-5 py-4">
            <span className="text-xs font-medium text-[#8b84a5]">
              Menampilkan {rangeStart}–{rangeEnd} dari {modules.length} modul
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Halaman sebelumnya"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f2fa] text-[#4a3f7a] transition hover:bg-[#e9e5f7] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-xs font-semibold text-[#3d3466]">
                Halaman {currentPage} dari {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Halaman berikutnya"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f2fa] text-[#4a3f7a] transition hover:bg-[#e9e5f7] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
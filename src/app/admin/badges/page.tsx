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

const inputClass =
  'h-11 w-full rounded-xl border border-[#e4e2ee] bg-[#f8f7fd] px-3.5 text-sm font-medium text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20'

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

      if (form.jenisSyarat === 'level_modul' && !form.nilaiSyaratLevel) {
        throw new Error('Pilih level modul untuk syarat badge ini')
      }

      let iconUrl: string | null = editingId
        ? badges.find((b) => b.id_badge === editingId)?.icon_url ?? null
        : null

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
          confirmButtonColor: '#4a3f7a',
        })
      } else {
        const { error } = await supabase.from('badges').insert(payload)

        if (error) throw error

        await fetchBadges()
        closeModal()

        await Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Badge berhasil ditambahkan.',
          confirmButtonColor: '#4a3f7a',
        })
      }
    } catch (error: any) {
      console.error('Gagal menyimpan badge:', error)

      setFormError(error.message || 'Terjadi kesalahan')

      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.message || 'Terjadi kesalahan saat menyimpan badge.',
        confirmButtonColor: '#4a3f7a',
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

      setBadges((prev) => prev.filter((b) => b.id_badge !== id))

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Badge berhasil dihapus.',
        confirmButtonColor: '#4a3f7a',
      })
    } catch (error: any) {
      console.error('Gagal menghapus badge:', error)

      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error?.message || 'Terjadi kesalahan saat menghapus badge.',
        confirmButtonColor: '#4a3f7a',
      })
    }
  }

  const previewBadges = badges.slice(0, 3)

  return (
    <div className="space-y-6">
      {/* BANNER */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a3f7a] to-[#3d3466] px-8 py-7 shadow-lg shadow-[#3d3466]/20 lg:px-10 lg:py-8">
        <h1 className="text-2xl font-bold text-white lg:text-3xl">
          Manajemen Badges
        </h1>
        <p className="mt-1 text-sm text-[#c9c3e6]">
          Kelola pencapaian yang dapat diperoleh mahasiswa
        </p>
      </div>

      {/* PREVIEW CARD */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4 rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-1 items-center gap-4">
            {previewBadges.length === 0 ? (
              <p className="text-sm text-[#a79fd6]">Belum ada badge</p>
            ) : (
              previewBadges.map((badge, index) => (
                <div
                  key={badge.id_badge}
                  className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f4f2fa] ring-2 ring-white shadow-sm ${index === 1 ? 'h-16 w-16' : 'h-12 w-12'
                    }`}
                >
                  {badge.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={badge.icon_url}
                      alt={badge.nama_badge}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#e4e2ee]" />
                  )}
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAllModal(true)}
            className="shrink-0 rounded-full border border-[#e4e2ee] bg-white px-4 py-2 text-xs font-bold text-[#4a3f7a] transition hover:bg-[#f8f7fd]"
          >
            Lihat Semua
          </button>
        </div>

        {/* ADD BADGE BUTTON */}
        <button
          onClick={openAddModal}
          className="shrink-0 rounded-full bg-amber-400 px-6 py-2.5 text-sm font-bold text-amber-950 shadow-sm shadow-amber-900/20 transition hover:bg-amber-300"
        >
          + Badges
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0edf9] text-xs font-bold uppercase tracking-wide text-[#8b84a5]">
                <th className="px-5 py-3">Badges</th>
                <th className="px-5 py-3">Syarat</th>
                <th className="px-5 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0edf9]">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-sm font-semibold text-[#4a3f7a]">
                    Memuat data...
                  </td>
                </tr>
              ) : badges.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-sm text-[#a79fd6]">
                    Belum ada data badge
                  </td>
                </tr>
              ) : (
                badges.map((badge) => (
                  <tr key={badge.id_badge} className="transition hover:bg-[#f8f7fd]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {badge.icon_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={badge.icon_url}
                            alt={badge.nama_badge}
                            className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-black/5"
                          />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-full bg-[#f4f2fa]" />
                        )}
                        <span className="font-semibold text-[#2b2540]">
                          {badge.nama_badge}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[#6e6a85]">
                      {badge.syarat}
                      {badge.jenis_syarat && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-[#f4f2fa] px-2.5 py-1 text-[11px] font-bold text-[#4a3f7a]">
                          {JENIS_SYARAT_LABEL[badge.jenis_syarat]}
                          {badge.jenis_syarat === 'jumlah_modul' &&
                            badge.nilai_syarat &&
                            ` (${badge.nilai_syarat})`}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(badge)}
                          aria-label="Edit badge"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f2fa] text-[#4a3f7a] transition hover:bg-[#e9e5f7]"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(badge.id_badge)}
                          aria-label="Hapus badge"
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
      </div>

      {/* ADD / EDIT MODAL */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#3d3466]">
                {editingId ? 'Edit Badge' : 'Tambah Badge'}
              </h3>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#8b84a5] transition hover:bg-[#f4f2fa]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ICON UPLOAD */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
                  Ikon Badge
                </label>
                <div
                  onClick={handleIconClick}
                  className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#c9c3e6] bg-[#f8f7fd] transition hover:bg-[#f0edf9]"
                >
                  {form.iconPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.iconPreview}
                      alt="Preview icon"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#4a3f7a]">
                      <ImagePlus size={22} />
                      <span className="text-[10px] font-semibold">Unggah</span>
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

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
                  Nama Badge
                </label>
                <input
                  type="text"
                  value={form.nama_badge}
                  onChange={(e) => setForm({ ...form, nama_badge: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
                  Syarat (teks yang tampil ke mahasiswa)
                </label>
                <input
                  type="text"
                  value={form.syarat}
                  onChange={(e) => setForm({ ...form, syarat: e.target.value })}
                  placeholder="Contoh: Menyelesaikan 2 Modul"
                  className={inputClass}
                />
              </div>

              {/* JENIS SYARAT */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
                  Jenis Syarat (dipakai sistem untuk cek otomatis)
                </label>
                <select
                  value={form.jenisSyarat}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      jenisSyarat: e.target.value as JenisSyarat,
                    })
                  }
                  className={inputClass}
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

              {form.jenisSyarat === 'jumlah_modul' && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
                    Jumlah Modul yang Harus Diselesaikan
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.nilaiSyaratJumlah}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nilaiSyaratJumlah: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className={inputClass}
                  />
                </div>
              )}

              {form.jenisSyarat === 'level_modul' && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
                    Level Modul yang Harus Diselesaikan
                  </label>
                  {levels.length === 0 ? (
                    <p className="text-xs text-[#a79fd6]">
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
                      className={inputClass}
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
                <p className="text-xs text-[#a79fd6]">
                  Badge ini otomatis diberikan begitu mahasiswa menyelesaikan
                  seluruh modul yang ada di sistem.
                </p>
              )}
              {form.jenisSyarat === 'board_game' && (
                <p className="text-xs text-[#a79fd6]">
                  Badge ini akan diberikan ketika mahasiswa berhasil
                  menyelesaikan Board Game.
                </p>
              )}

              {formError && (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600 ring-1 ring-red-200">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-[#f0edf9] pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-[#e4e2ee] bg-white px-6 py-2.5 text-sm font-bold text-[#4a3f7a] transition hover:bg-[#f8f7fd]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-amber-400 px-6 py-2.5 text-sm font-bold text-amber-950 shadow-sm shadow-amber-900/20 transition hover:bg-amber-300 disabled:opacity-50"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowAllModal(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#3d3466]">Semua Badges</h3>
              <button
                onClick={() => setShowAllModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#8b84a5] transition hover:bg-[#f4f2fa]"
              >
                <X size={18} />
              </button>
            </div>

            {badges.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#a79fd6]">
                Belum ada badge
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {badges.map((badge) => (
                  <div
                    key={badge.id_badge}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-[#f8f7fd] p-4 text-center"
                  >
                    <div className="h-16 w-16 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5">
                      {badge.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={badge.icon_url}
                          alt={badge.nama_badge}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-[#e4e2ee]" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#3d3466]">
                      {badge.nama_badge}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
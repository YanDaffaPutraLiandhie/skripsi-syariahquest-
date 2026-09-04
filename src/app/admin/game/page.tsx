'use client'

import { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, X, ImagePlus, Undo2, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Swal from 'sweetalert2'

interface PetakPosisi {
  nomor: number
  x: number // persentase (0-100) dari lebar gambar
  y: number // persentase (0-100) dari tinggi gambar
}

interface GameRow {
  id_game: number
  nama_game: string
  deskripsi: string
  thumbnail_url: string | null
  jumlah_petak: number
  posisi_petak: PetakPosisi[]
  is_aktif: boolean
}

interface GameStats {
  total: number
  aktif: number
  nonaktif: number
}

interface GameForm {
  nama_game: string
  deskripsi: string
  boardFile: File | null
  boardPreview: string | null
  jumlahPetak: number
  posisiPetak: PetakPosisi[]
  is_aktif: boolean
}

const emptyForm: GameForm = {
  nama_game: '',
  deskripsi: '',
  boardFile: null,
  boardPreview: null,
  jumlahPetak: 20,
  posisiPetak: [],
  is_aktif: true,
}

const BOARD_MIN_WIDTH = 600
const BOARD_MIN_HEIGHT = 600
const BOARD_MAX_WIDTH = 4000
const BOARD_MAX_HEIGHT = 4000

function loadImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(objectUrl)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Gagal membaca gambar'))
    }

    img.src = objectUrl
  })
}

function validateBoardImage(width: number, height: number): string | null {
  if (width < BOARD_MIN_WIDTH || height < BOARD_MIN_HEIGHT) {
    return `Resolusi gambar terlalu kecil (${width}×${height}px). Minimal ${BOARD_MIN_WIDTH}×${BOARD_MIN_HEIGHT}px supaya tidak pecah saat ditampilkan.`
  }

  if (width > BOARD_MAX_WIDTH || height > BOARD_MAX_HEIGHT) {
    return `Resolusi gambar terlalu besar (${width}×${height}px). Maksimal ${BOARD_MAX_WIDTH}×${BOARD_MAX_HEIGHT}px.`
  }

  return null
}

export default function ManajemenGamePage() {
  const [games, setGames] = useState<GameRow[]>([])
  const [stats, setStats] = useState<GameStats>({
    total: 0,
    aktif: 0,
    nonaktif: 0,
  })
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<GameForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [boardImageError, setBoardImageError] = useState('')
  const [checkingImage, setCheckingImage] = useState(false)

  const boardInputRef = useRef<HTMLInputElement>(null)
  const boardImageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchGames()
  }, [])

  async function fetchGames() {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('game')
        .select(
          'id_game, nama_game, deskripsi, thumbnail_url, jumlah_petak, posisi_petak, is_aktif'
        )
        .order('id_game', { ascending: false })

      if (error) {
        console.error('FETCH GAME ERROR:', JSON.stringify(error, null, 2))
        setLoading(false)
        return
      }

      const rows: GameRow[] = (data ?? []).map((g: any) => ({
        ...g,
        posisi_petak: g.posisi_petak ?? [],
      }))
      setGames(rows)

      setStats({
        total: rows.length,
        aktif: rows.filter((g) => g.is_aktif).length,
        nonaktif: rows.filter((g) => !g.is_aktif).length,
      })

      setLoading(false)
    } catch (error: any) {
      console.error(
        'Gagal memuat data game (exception):',
        JSON.stringify({ name: error?.name, message: error?.message })
      )
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
    setBoardImageError('')
    setShowModal(true)
  }

  function openEditModal(game: GameRow) {
    setEditingId(game.id_game)
    setForm({
      nama_game: game.nama_game,
      deskripsi: game.deskripsi,
      boardFile: null,
      boardPreview: game.thumbnail_url,
      jumlahPetak: game.jumlah_petak || 20,
      posisiPetak: game.posisi_petak || [],
      is_aktif: game.is_aktif,
    })
    setFormError('')
    setBoardImageError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setForm(emptyForm)
    setEditingId(null)
    setFormError('')
    setBoardImageError('')
  }

  function handleBoardClick() {
    boardInputRef.current?.click()
  }

  async function handleBoardSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setBoardImageError('')
    setCheckingImage(true)

    try {
      const { width, height } = await loadImageDimensions(file)
      const validationError = validateBoardImage(width, height)

      if (validationError) {
        setBoardImageError(validationError)
        setCheckingImage(false)
        if (boardInputRef.current) boardInputRef.current.value = ''
        return
      }

      setForm((prev) => ({
        ...prev,
        boardFile: file,
        boardPreview: URL.createObjectURL(file),
        posisiPetak: [],
      }))
    } catch (error: any) {
      setBoardImageError(error.message || 'Gagal membaca gambar')
      if (boardInputRef.current) boardInputRef.current.value = ''
    } finally {
      setCheckingImage(false)
    }
  }

  function handleBoardEditorClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!boardImageRef.current) return
    if (form.posisiPetak.length >= form.jumlahPetak) return

    const rect = boardImageRef.current.getBoundingClientRect()
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100

    const nextNomor = form.posisiPetak.length + 1

    setForm((prev) => ({
      ...prev,
      posisiPetak: [
        ...prev.posisiPetak,
        {
          nomor: nextNomor,
          x: Math.round(xPercent * 100) / 100,
          y: Math.round(yPercent * 100) / 100,
        },
      ],
    }))
  }

  function handleUndoPin() {
    setForm((prev) => ({
      ...prev,
      posisiPetak: prev.posisiPetak.slice(0, -1),
    }))
  }

  function handleResetPin() {
    const confirmed = window.confirm('Hapus semua titik petak yang sudah ditandai?')
    if (!confirmed) return

    setForm((prev) => ({ ...prev, posisiPetak: [] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    try {
      if (!form.nama_game.trim()) {
        throw new Error('Nama game wajib diisi')
      }

      if (form.jumlahPetak < 2) {
        throw new Error('Jumlah petak minimal 2')
      }

      const boardAlreadyExists = editingId
        ? games.find((g) => g.id_game === editingId)?.thumbnail_url
        : null

      if (!form.boardFile && !boardAlreadyExists) {
        throw new Error('Gambar board wajib diupload')
      }

      if (form.posisiPetak.length !== form.jumlahPetak) {
        throw new Error(
          `Tandai semua petak dulu di atas gambar (${form.posisiPetak.length}/${form.jumlahPetak} titik)`
        )
      }

      let boardUrl: string | null = editingId
        ? games.find((g) => g.id_game === editingId)?.thumbnail_url ?? null
        : null

      if (form.boardFile) {
        const path = `game/${Date.now()}-${form.boardFile.name}`
        const { error: uploadError } = await supabase.storage
          .from('game-thumbnails')
          .upload(path, form.boardFile)

        if (uploadError) throw uploadError

        const { data: publicUrl } = supabase.storage
          .from('game-thumbnails')
          .getPublicUrl(path)

        boardUrl = publicUrl.publicUrl
      }

      const payload = {
        nama_game: form.nama_game,
        deskripsi: form.deskripsi,
        thumbnail_url: boardUrl,
        jumlah_petak: form.jumlahPetak,
        posisi_petak: form.posisiPetak,
        is_aktif: form.is_aktif,
      }

      if (editingId) {
        const { error } = await supabase
          .from('game')
          .update(payload)
          .eq('id_game', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase.from('game').insert(payload)
        if (error) throw error
      }

      await fetchGames()
      closeModal()

      await Swal.fire({
        icon: 'success',
        title: editingId ? 'Berhasil Diperbarui' : 'Berhasil Ditambahkan',
        text: editingId
          ? 'Data game berhasil diperbarui.'
          : 'Data game berhasil ditambahkan.',
        confirmButtonColor: '#4a3f7a',
      })
    } catch (error: any) {
      console.error('Gagal menyimpan game:', error)
      setFormError(error.message || 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAktif(game: GameRow) {
    const newStatus = !game.is_aktif

    setGames((prev) =>
      prev.map((g) =>
        g.id_game === game.id_game ? { ...g, is_aktif: newStatus } : g
      )
    )

    try {
      const { error } = await supabase
        .from('game')
        .update({ is_aktif: newStatus })
        .eq('id_game', game.id_game)

      if (error) throw error

      setStats((prev) => ({
        ...prev,
        aktif: newStatus ? prev.aktif + 1 : prev.aktif - 1,
        nonaktif: newStatus ? prev.nonaktif - 1 : prev.nonaktif + 1,
      }))
    } catch (error) {
      console.error('Gagal mengubah status game:', error)
      setGames((prev) =>
        prev.map((g) =>
          g.id_game === game.id_game ? { ...g, is_aktif: game.is_aktif } : g
        )
      )
    }
  }

  async function handleDelete(id: number) {
    const result = await Swal.fire({
      title: 'Hapus Game?',
      text: 'Data game yang dihapus tidak dapat dikembalikan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    })

    if (!result.isConfirmed) return

    try {
      const { error } = await supabase.from('game').delete().eq('id_game', id)

      if (error) throw error

      await fetchGames()

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Data game berhasil dihapus.',
        confirmButtonColor: '#4a3f7a',
      })
    } catch (error: any) {
      console.error('Gagal menghapus game:', error)

      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error?.message || 'Terjadi kesalahan saat menghapus game.',
        confirmButtonColor: '#4a3f7a',
      })
    }
  }

  const pinsRemaining = form.jumlahPetak - form.posisiPetak.length

  const inputClass =
    'h-11 w-full rounded-xl border border-[#e4e2ee] bg-[#f8f7fd] px-3.5 text-sm font-medium text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20'

  return (
    <div className="space-y-6">
      {/* BANNER */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a3f7a] to-[#3d3466] px-8 py-7 shadow-lg shadow-[#3d3466]/20 lg:px-10 lg:py-8">
        <h1 className="text-2xl font-bold text-white lg:text-3xl">
          Manajemen Game
        </h1>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="text-sm font-bold text-[#4a3f7a]">Total Game</h2>
          <p className="mt-1 text-3xl font-black text-[#3d3466]">{stats.total}</p>
        </div>
        <div className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="text-sm font-bold text-emerald-600">Aktif</h2>
          <p className="mt-1 text-3xl font-black text-emerald-600">{stats.aktif}</p>
        </div>
        <div className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="text-sm font-bold text-rose-500">Nonaktif</h2>
          <p className="mt-1 text-3xl font-black text-rose-500">{stats.nonaktif}</p>
        </div>
      </div>

      {/* ADD GAME BUTTON */}
      <div className="flex justify-end">
        <button
          onClick={openAddModal}
          className="rounded-full bg-amber-400 px-6 py-2.5 text-sm font-bold text-amber-950 shadow-sm shadow-amber-900/20 transition hover:bg-amber-300"
        >
          + Game
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0edf9] text-xs font-bold uppercase tracking-wide text-[#8b84a5]">
                <th className="px-5 py-3">Nama Game</th>
                <th className="px-5 py-3">Deskripsi</th>
                <th className="px-5 py-3">Petak</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0edf9]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm font-semibold text-[#4a3f7a]">
                    Memuat data...
                  </td>
                </tr>
              ) : games.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#a79fd6]">
                    Belum ada data game
                  </td>
                </tr>
              ) : (
                games.map((game) => (
                  <tr key={game.id_game} className="transition hover:bg-[#f8f7fd]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {game.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={game.thumbnail_url}
                            alt={game.nama_game}
                            className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-black/5"
                          />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-xl bg-[#f4f2fa]" />
                        )}
                        <span className="font-semibold text-[#2b2540]">
                          {game.nama_game}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-[220px] truncate px-5 py-3.5 text-[#6e6a85]">
                      {game.deskripsi}
                    </td>
                    <td className="px-5 py-3.5 text-[#6e6a85]">
                      {game.jumlah_petak} petak
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleAktif(game)}
                        aria-label={
                          game.is_aktif ? 'Nonaktifkan game' : 'Aktifkan game'
                        }
                        className={`mr-2 inline-flex h-6 w-11 items-center rounded-full transition ${game.is_aktif ? 'bg-emerald-500' : 'bg-[#e4e2ee]'
                          }`}
                      >
                        <span
                          className={`h-5 w-5 rounded-full bg-white shadow transition ${game.is_aktif ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                        />
                      </button>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${game.is_aktif
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-rose-50 text-rose-700 ring-rose-200'
                          }`}
                      >
                        {game.is_aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(game)}
                          aria-label="Edit game"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f2fa] text-[#4a3f7a] transition hover:bg-[#e9e5f7]"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(game.id_game)}
                          aria-label="Hapus game"
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
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#3d3466]">
                {editingId ? 'Edit Game' : 'Tambah Game'}
              </h3>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#8b84a5] transition hover:bg-[#f4f2fa]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
                  Nama Game
                </label>
                <input
                  type="text"
                  value={form.nama_game}
                  onChange={(e) => setForm({ ...form, nama_game: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
                  Deskripsi
                </label>
                <input
                  type="text"
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  placeholder="Deskripsi singkat tema game"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
                  Jumlah Petak
                </label>
                <input
                  type="number"
                  min={2}
                  max={100}
                  value={form.jumlahPetak}
                  onChange={(e) => {
                    const value = Math.max(2, Number(e.target.value) || 2)
                    setForm((prev) => ({
                      ...prev,
                      jumlahPetak: value,
                      posisiPetak: prev.posisiPetak.slice(0, value),
                    }))
                  }}
                  className={inputClass}
                />
              </div>

              {/* UPLOAD BOARD */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
                  Gambar Board (dipakai untuk thumbnail & papan main)
                </label>
                <p className="mb-2 text-xs text-[#a79fd6]">
                  Resolusi minimal {BOARD_MIN_WIDTH}×{BOARD_MIN_HEIGHT}px,
                  maksimal {BOARD_MAX_WIDTH}×{BOARD_MAX_HEIGHT}px. Rasio bebas
                  (landscape, portrait, atau persegi).
                </p>

                {!form.boardPreview ? (
                  <div
                    onClick={handleBoardClick}
                    className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#c9c3e6] bg-[#f8f7fd] text-center transition hover:bg-[#f0edf9]"
                  >
                    {checkingImage ? (
                      <span className="text-sm font-semibold text-[#4a3f7a]">
                        Memeriksa ukuran gambar...
                      </span>
                    ) : (
                      <>
                        <ImagePlus size={26} className="text-[#4a3f7a]" />
                        <span className="text-sm font-semibold text-[#4a3f7a]">
                          Unggah gambar board
                        </span>
                      </>
                    )}
                    <input
                      ref={boardInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleBoardSelect}
                    />
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleBoardClick}
                      disabled={checkingImage}
                      className="mb-3 rounded-full border border-[#e4e2ee] bg-white px-4 py-2 text-xs font-bold text-[#4a3f7a] transition hover:bg-[#f8f7fd] disabled:opacity-50"
                    >
                      {checkingImage ? 'Memeriksa...' : 'Ganti gambar'}
                    </button>
                    <input
                      ref={boardInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleBoardSelect}
                    />

                    {/* BOARD EDITOR — klik berurutan untuk pin petak */}
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs text-[#8b84a5]">
                        Klik di atas gambar secara berurutan untuk menandai
                        posisi petak 1 sampai {form.jumlahPetak}.
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${pinsRemaining === 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-[#f4f2fa] text-[#4a3f7a]'
                          }`}
                      >
                        {form.posisiPetak.length} / {form.jumlahPetak} petak
                      </span>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl ring-1 ring-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.boardPreview}
                        alt="Board preview"
                        className="w-full select-none"
                        draggable={false}
                      />

                      <div
                        ref={boardImageRef}
                        onClick={handleBoardEditorClick}
                        className="absolute inset-0"
                        style={{
                          cursor: pinsRemaining > 0 ? 'crosshair' : 'not-allowed',
                        }}
                      >
                        {form.posisiPetak.map((pin) => (
                          <div
                            key={pin.nomor}
                            className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md ${pin.nomor === 1
                              ? 'bg-emerald-500'
                              : pin.nomor === form.jumlahPetak
                                ? 'bg-red-600'
                                : 'bg-[#4a3f7a]'
                              }`}
                            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                          >
                            {pin.nomor}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={handleUndoPin}
                        disabled={form.posisiPetak.length === 0}
                        className="flex items-center gap-1.5 rounded-full border border-[#e4e2ee] bg-white px-3.5 py-1.5 text-xs font-bold text-[#4a3f7a] transition hover:bg-[#f8f7fd] disabled:opacity-40"
                      >
                        <Undo2 size={14} />
                        Undo Titik Terakhir
                      </button>
                      <button
                        type="button"
                        onClick={handleResetPin}
                        disabled={form.posisiPetak.length === 0}
                        className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-40"
                      >
                        <RotateCcw size={14} />
                        Reset Semua Titik
                      </button>
                    </div>
                  </>
                )}

                {boardImageError && (
                  <p className="mt-2 text-xs font-semibold text-rose-600">
                    {boardImageError}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
                  Status
                </label>
                <select
                  value={form.is_aktif ? 'aktif' : 'nonaktif'}
                  onChange={(e) =>
                    setForm({ ...form, is_aktif: e.target.value === 'aktif' })
                  }
                  className={inputClass}
                >
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>

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
    </div>
  )
}
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

// =========================================
// STANDAR UKURAN GAMBAR BOARD
// =========================================
// Tidak dibatasi harus persegi — bebas rasio apapun (landscape, portrait,
// dsb) supaya admin bisa pakai tema board yang bentuknya beragam. Yang
// dibatasi cuma resolusinya, supaya gambarnya tidak pecah/blur saat
// ditampilkan besar di halaman mahasiswa, dan tidak kebesaran ukuran filenya.
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
      // TODO: sesuaikan nama tabel & kolom dengan skema Supabase Anda.
      // `posisi_petak` diasumsikan kolom jsonb yang isinya array
      // [{ nomor, x, y }, ...] dengan x,y dalam persen (0-100).
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
        posisiPetak: [], // gambar baru -> reset pin lama, tidak relevan lagi
      }))
    } catch (error: any) {
      setBoardImageError(error.message || 'Gagal membaca gambar')
      if (boardInputRef.current) boardInputRef.current.value = ''
    } finally {
      setCheckingImage(false)
    }
  }

  // =========================================
  // BOARD EDITOR — klik berurutan untuk pin posisi petak
  // =========================================
  function handleBoardEditorClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!boardImageRef.current) return

    // Sudah mencapai jumlah petak yang ditentukan, jangan tambah lagi
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

      // TODO: sesuaikan nama bucket Storage Anda di Supabase
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
            await fetchGames()
      closeModal()

      await Swal.fire({
        icon: 'success',
        title: editingId ? 'Berhasil Diperbarui' : 'Berhasil Ditambahkan',
        text: editingId
          ? 'Data game berhasil diperbarui.'
          : 'Data game berhasil ditambahkan.',
        confirmButtonColor: '#50427E',
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
    const { error } = await supabase
      .from('game')
      .delete()
      .eq('id_game', id)

    if (error) throw error

    await fetchGames()

    await Swal.fire({
      icon: 'success',
      title: 'Berhasil',
      text: 'Data game berhasil dihapus.',
      confirmButtonColor: '#50427E',
    })
  } catch (error: any) {
    console.error('Gagal menghapus game:', error)

    await Swal.fire({
      icon: 'error',
      title: 'Gagal',
      text: error?.message || 'Terjadi kesalahan saat menghapus game.',
      confirmButtonColor: '#50427E',
    })
  }
}
  const pinsRemaining = form.jumlahPetak - form.posisiPetak.length

  return (
    <>
      {/* BANNER */}
      <div className="page-banner">
        <h1>Manajemen Game</h1>
      </div>

      {/* STAT CARDS */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-inner">
            <h2>Total Game</h2>
            <p>{stats.total}</p>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-inner">
            <h2>Aktif</h2>
            <p className="stat-aktif">{stats.aktif}</p>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-inner">
            <h2>Nonaktif</h2>
            <p className="stat-nonaktif">{stats.nonaktif}</p>
          </div>
        </div>
      </div>

      {/* ADD GAME BUTTON */}
      <div className="admin-action-row">
        <button className="btn-add-user" onClick={openAddModal}>
          + Game
        </button>
      </div>

      {/* TABLE */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nama Game</th>
              <th>Deskripsi</th>
              <th>Petak</th>
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
            ) : games.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-table-empty">
                  Belum ada data game
                </td>
              </tr>
            ) : (
              games.map((game) => (
                <tr key={game.id_game}>
                  <td>
                    <div className="game-table-name">
                      {game.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={game.thumbnail_url}
                          alt={game.nama_game}
                        />
                      ) : (
                        <div className="game-thumb-placeholder" />
                      )}
                      <span>{game.nama_game}</span>
                    </div>
                  </td>
                  <td className="game-deskripsi-cell">{game.deskripsi}</td>
                  <td>{game.jumlah_petak} petak</td>
                  <td>
                    <button
                      type="button"
                      className={`status-toggle ${
                        game.is_aktif ? 'active' : ''
                      }`}
                      onClick={() => handleToggleAktif(game)}
                      aria-label={
                        game.is_aktif ? 'Nonaktifkan game' : 'Aktifkan game'
                      }
                    >
                      <span className="status-toggle-knob" />
                    </button>
                    <span
                      className={`status-label ${
                        game.is_aktif ? 'label-aktif' : 'label-nonaktif'
                      }`}
                    >
                      {game.is_aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button
                        className="icon-action edit"
                        onClick={() => openEditModal(game)}
                        aria-label="Edit game"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-action delete"
                        onClick={() => handleDelete(game.id_game)}
                        aria-label="Hapus game"
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
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-box game-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{editingId ? 'Edit Game' : 'Tambah Game'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="modal-field">
                <label>Nama Game</label>
                <input
                  type="text"
                  value={form.nama_game}
                  onChange={(e) =>
                    setForm({ ...form, nama_game: e.target.value })
                  }
                  required
                />
              </div>

              <div className="modal-field">
                <label>Deskripsi</label>
                <input
                  type="text"
                  value={form.deskripsi}
                  onChange={(e) =>
                    setForm({ ...form, deskripsi: e.target.value })
                  }
                  placeholder="Deskripsi singkat tema game"
                />
              </div>

              <div className="modal-field">
                <label>Jumlah Petak</label>
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
                      // kalau jumlah dikurangi di bawah pin yang sudah ada,
                      // potong kelebihannya supaya tetap konsisten
                      posisiPetak: prev.posisiPetak.slice(0, value),
                    }))
                  }}
                />
              </div>

              {/* UPLOAD BOARD */}
              <div className="modal-field">
                <label>Gambar Board (dipakai untuk thumbnail & papan main)</label>
                <p className="board-size-hint">
                  Resolusi minimal {BOARD_MIN_WIDTH}×{BOARD_MIN_HEIGHT}px,
                  maksimal {BOARD_MAX_WIDTH}×{BOARD_MAX_HEIGHT}px. Rasio
                  bebas (landscape, portrait, atau persegi).
                </p>

                {!form.boardPreview ? (
                  <div
                    className="badge-icon-upload game-thumb-upload"
                    onClick={handleBoardClick}
                  >
                    <div className="badge-icon-upload-placeholder">
                      {checkingImage ? (
                        <span>Memeriksa ukuran gambar...</span>
                      ) : (
                        <>
                          <ImagePlus size={26} />
                          <span>Unggah gambar board</span>
                        </>
                      )}
                    </div>
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
                      className="board-change-image-btn"
                      onClick={handleBoardClick}
                      disabled={checkingImage}
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
                    <div className="board-editor-header">
                      <p>
                        Klik di atas gambar secara berurutan untuk menandai
                        posisi petak 1 sampai {form.jumlahPetak}.
                      </p>
                      <span
                        className={`board-editor-counter ${
                          pinsRemaining === 0 ? 'complete' : ''
                        }`}
                      >
                        {form.posisiPetak.length} / {form.jumlahPetak} petak
                      </span>
                    </div>

                    <div className="board-editor-wrapper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.boardPreview}
                        alt="Board preview"
                        className="board-editor-img"
                        draggable={false}
                      />

                      <div
                        ref={boardImageRef}
                        className="board-editor-click-layer"
                        onClick={handleBoardEditorClick}
                        style={{
                          cursor:
                            pinsRemaining > 0 ? 'crosshair' : 'not-allowed',
                        }}
                      >
                        {form.posisiPetak.map((pin) => (
                          <div
                            key={pin.nomor}
                            className={`board-pin ${
                              pin.nomor === 1
                                ? 'board-pin-start'
                                : pin.nomor === form.jumlahPetak
                                ? 'board-pin-finish'
                                : ''
                            }`}
                            style={{
                              left: `${pin.x}%`,
                              top: `${pin.y}%`,
                            }}
                          >
                            {pin.nomor}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="board-editor-actions">
                      <button
                        type="button"
                        className="board-editor-btn"
                        onClick={handleUndoPin}
                        disabled={form.posisiPetak.length === 0}
                      >
                        <Undo2 size={14} />
                        Undo Titik Terakhir
                      </button>
                      <button
                        type="button"
                        className="board-editor-btn danger"
                        onClick={handleResetPin}
                        disabled={form.posisiPetak.length === 0}
                      >
                        <RotateCcw size={14} />
                        Reset Semua Titik
                      </button>
                    </div>
                  </>
                )}

                {boardImageError && (
                  <p className="board-image-error">{boardImageError}</p>
                )}
              </div>

              <div className="modal-field">
                <label>Status</label>
                <select
                  value={form.is_aktif ? 'aktif' : 'nonaktif'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      is_aktif: e.target.value === 'aktif',
                    })
                  }
                >
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
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

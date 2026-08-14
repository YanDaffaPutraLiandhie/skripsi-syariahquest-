'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Papa from 'papaparse'
import { Plus, Trash2, Download, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type AnswerKey = 'A' | 'B' | 'C' | 'D'

interface SoalEntry {
  id: string
  soal: string
  jawabanA: string
  jawabanB: string
  jawabanC: string
  jawabanD: string
  kunciJawaban: AnswerKey | null
}

interface ModulOption {
  id_modul: number
  nama_modul: string
}

function makeEmptyEntry(): SoalEntry {
  return {
    id: crypto.randomUUID(),
    soal: '',
    jawabanA: '',
    jawabanB: '',
    jawabanC: '',
    jawabanD: '',
    kunciJawaban: null,
  }
}

function BankSoalContent() {
  const router = useRouter()

  const searchParams = useSearchParams()
  const idModulParam = searchParams.get('id_modul')
  const selectedModulId = idModulParam ? Number(idModulParam) : null

  const [namaModul, setNamaModul] = useState<string>('')
  const [loadingModul, setLoadingModul] = useState(true)

  const [modulList, setModulList] = useState<ModulOption[]>([])
  const [loadingModulList, setLoadingModulList] = useState(true)
  const [searchModul, setSearchModul] = useState('')

  const [soalEntries, setSoalEntries] = useState<SoalEntry[]>([
    makeEmptyEntry(),
  ])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [importing, setImporting] = useState(false)

  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedModulId) {
      fetchModulName(selectedModulId)
    } else {
      setLoadingModul(false)
      fetchModulList()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModulId])

  async function fetchModulName(idModul: number) {
    setLoadingModul(true)
    try {
      const { data, error } = await supabase
        .from('modul')
        .select('nama_modul')
        .eq('id_modul', idModul)
        .single()

      if (error) {
        console.error(
          'FETCH MODUL NAME ERROR:',
          JSON.stringify({ message: error.message, code: error.code })
        )
        setLoadingModul(false)
        return
      }

      setNamaModul(data?.nama_modul ?? '')
      setLoadingModul(false)
    } catch (error: any) {
      console.error(
        'Gagal memuat nama modul (exception):',
        JSON.stringify({ message: error?.message })
      )
      setLoadingModul(false)
    }
  }

  async function fetchModulList() {
    setLoadingModulList(true)
    try {
      const { data, error } = await supabase
        .from('modul')
        .select('id_modul, nama_modul')
        .order('nama_modul', { ascending: true })

      if (error) {
        console.error(
          'FETCH MODUL LIST ERROR:',
          JSON.stringify({ message: error.message, code: error.code })
        )
        setLoadingModulList(false)
        return
      }

      setModulList(data ?? [])
      setLoadingModulList(false)
    } catch (error: any) {
      console.error(
        'Gagal memuat daftar modul (exception):',
        JSON.stringify({ message: error?.message })
      )
      setLoadingModulList(false)
    }
  }

  function pilihModul(idModul: number) {
    router.push(`/admin/bank-soal?id_modul=${idModul}`)
  }

  function gantiModul() {
    router.push('/admin/bank-soal')
  }

  function updateEntry(id: string, patch: Partial<SoalEntry>) {
    setSoalEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    )
  }

  function addEntry() {
    setSoalEntries((prev) => [...prev, makeEmptyEntry()])
  }

  function removeEntry(id: string) {
    setSoalEntries((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((entry) => entry.id !== id)
    })
  }

  function handleImportClick() {
    importInputRef.current?.click()
  }

  function handleDownloadTemplate() {
    const headers = [
      'soal',
      'jawaban_a',
      'jawaban_b',
      'jawaban_c',
      'jawaban_d',
      'kunci_jawaban',
    ]

    const exampleRows = [
      [
        'Apa hukum riba dalam Islam?',
        'Haram',
        'Halal',
        'Makruh',
        'Mubah',
        'A',
      ],
      [
        "Siapa pendiri mazhab Syafi'i?",
        'Imam Malik',
        "Imam Syafi'i",
        'Imam Hanafi',
        'Imam Hambali',
        'B',
      ],
    ]

    const csv = Papa.unparse({ fields: headers, data: exampleRows })
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'template_bank_soal.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setFormError('')

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data

          if (!rows || rows.length === 0) {
            throw new Error(
              'File CSV kosong atau formatnya tidak sesuai (pastikan ada baris header)'
            )
          }

          const parsed: SoalEntry[] = rows.map((row) => {
            const normalizedKunci = (row.kunci_jawaban || row.kunci || '')
              .trim()
              .toUpperCase()

            const validKunci: AnswerKey | null = ['A', 'B', 'C', 'D'].includes(
              normalizedKunci
            )
              ? (normalizedKunci as AnswerKey)
              : null

            return {
              id: crypto.randomUUID(),
              soal: (row.soal || '').trim(),
              jawabanA: (row.jawaban_a || '').trim(),
              jawabanB: (row.jawaban_b || '').trim(),
              jawabanC: (row.jawaban_c || '').trim(),
              jawabanD: (row.jawaban_d || '').trim(),
              kunciJawaban: validKunci,
            }
          })

          const validRows = parsed.filter((entry) => entry.soal)

          if (validRows.length === 0) {
            throw new Error(
              'Tidak ada baris valid ditemukan. Pastikan kolom "soal" terisi.'
            )
          }

          setSoalEntries(validRows)
          setSuccessMessage(
            `${validRows.length} soal berhasil diimpor dari CSV`
          )
        } catch (err: any) {
          setFormError(err.message || 'Gagal memproses file CSV')
        } finally {
          setImporting(false)
          if (importInputRef.current) importInputRef.current.value = ''
        }
      },
      error: (err) => {
        setFormError(err.message || 'Gagal membaca file CSV')
        setImporting(false)
        if (importInputRef.current) importInputRef.current.value = ''
      },
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    setSuccessMessage('')

    try {
      if (!selectedModulId) {
        throw new Error(
          'Modul tidak ditemukan. Kembali dan pilih modul terlebih dahulu.'
        )
      }

      soalEntries.forEach((entry, index) => {
        const nomor = index + 1

        if (!entry.soal.trim()) {
          throw new Error(`Soal ke-${nomor}: teks soal wajib diisi`)
        }

        if (
          !entry.jawabanA.trim() ||
          !entry.jawabanB.trim() ||
          !entry.jawabanC.trim() ||
          !entry.jawabanD.trim()
        ) {
          throw new Error(
            `Soal ke-${nomor}: semua pilihan jawaban wajib diisi`
          )
        }

        if (!entry.kunciJawaban) {
          throw new Error(
            `Soal ke-${nomor}: pilih kunci jawaban terlebih dahulu`
          )
        }
      })

      const soalPayload = soalEntries.map((entry) => ({
        id_modul: selectedModulId,
        soal: entry.soal,
      }))

      const { data: insertedSoal, error: soalError } = await supabase
        .from('soal')
        .insert(soalPayload)
        .select('id_soal')

      if (soalError) throw soalError

      if (!insertedSoal || insertedSoal.length !== soalEntries.length) {
        throw new Error('Gagal mendapatkan id_soal setelah insert')
      }

      const jawabanPayload = soalEntries.flatMap((entry, index) => {
        const idSoal = insertedSoal[index].id_soal

        const options: { key: AnswerKey; text: string }[] = [
          { key: 'A', text: entry.jawabanA },
          { key: 'B', text: entry.jawabanB },
          { key: 'C', text: entry.jawabanC },
          { key: 'D', text: entry.jawabanD },
        ]

        return options.map((opt) => ({
          id_soal: idSoal,
          jawaban: opt.text,
          jawaban_benar: opt.key === entry.kunciJawaban,
        }))
      })

      const { error: jawabanError } = await supabase
        .from('jawaban')
        .insert(jawabanPayload)

      if (jawabanError) throw jawabanError

      setSuccessMessage(
        soalEntries.length > 1
          ? `${soalEntries.length} soal berhasil disimpan`
          : '1 soal berhasil disimpan'
      )
      setSoalEntries([makeEmptyEntry()])
    } catch (error: any) {
      console.error(
        'Gagal menyimpan soal:',
        JSON.stringify({
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
        })
      )
      setFormError(error.message || 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  // =========================================
  // LAYAR 1: PILIH MODUL
  // =========================================
  if (!selectedModulId) {
    const filteredModulList = modulList.filter((m) =>
      m.nama_modul.toLowerCase().includes(searchModul.toLowerCase())
    )

    return (
      <div className="bs-page">
        <div className="bs-header-card">
          <span className="bs-eyebrow">BANK SOAL</span>
          <h1 className="bs-title">Pilih Modul</h1>
          <p className="bs-subtitle">
            Pilih modul yang mau ditambahkan soalnya terlebih dahulu.
          </p>
        </div>

        <div className="bs-picker-search-wrap">
          <input
            type="text"
            className="bs-picker-search"
            placeholder="Cari nama modul..."
            value={searchModul}
            onChange={(e) => setSearchModul(e.target.value)}
          />
        </div>

        {loadingModulList ? (
          <p className="bs-empty-note">Memuat daftar modul...</p>
        ) : filteredModulList.length === 0 ? (
          <p className="bs-empty-note">
            {modulList.length === 0
              ? 'Belum ada modul. Tambahkan modul dulu di Manajemen Modul.'
              : 'Tidak ada modul yang cocok dengan pencarian.'}
          </p>
        ) : (
          <div className="bs-picker-grid">
            {filteredModulList.map((m) => (
              <button
                key={m.id_modul}
                type="button"
                className="bs-picker-card"
                onClick={() => pilihModul(m.id_modul)}
              >
                {m.nama_modul}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // =========================================
  // LAYAR 2: FORM SOAL
  // =========================================
  return (
    <div className="bs-page">
      {/* HEADER CARD */}
      <div className="bs-header-card">
        <div className="bs-header-top">
          <div>
            <span className="bs-eyebrow">BANK SOAL</span>
            <h1 className="bs-title">Form Soal</h1>
            <p className="bs-subtitle">
              Tambahkan soal pilihan ganda, pilih kunci jawaban, atau impor
              CSV untuk mempercepat proses.
              {namaModul && !loadingModul && (
                <>
                  {' '}
                  Modul: <strong>{namaModul}</strong>.
                </>
              )}
            </p>
          </div>

          <div className="bs-header-actions">
            <button
              type="button"
              className="bs-btn-import"
              onClick={handleImportClick}
              disabled={importing}
            >
              {importing ? 'Mengimpor...' : 'Impor Dokumen'}
            </button>

            <button
              type="button"
              className="bs-btn-template"
              onClick={handleDownloadTemplate}
            >
              <Download size={15} />
              Download Template
            </button>

            <input
              ref={importInputRef}
              type="file"
              accept=".csv"
              hidden
              onChange={handleImportFile}
            />
          </div>
        </div>

        <button type="button" className="bs-ganti-modul" onClick={gantiModul}>
          <ArrowLeft size={13} />
          Ganti Modul
        </button>
      </div>

      {/* KUNCI JAWABAN INFO CARD */}
      <div className="bs-info-card">
        <div className="bs-info-text">
          <span className="bs-eyebrow bs-eyebrow-light">KUNCI JAWABAN</span>
          <h2 className="bs-info-title">Sistem Pilih Jawaban</h2>
          <p className="bs-info-desc">
            Isi soal secara manual atau gunakan template CSV. Setiap soal
            dapat memiliki empat pilihan jawaban dengan satu kunci jawaban
            aktif.
          </p>
        </div>

        <div className="bs-info-circles">
          {(['A', 'B', 'C', 'D'] as AnswerKey[]).map((key) => (
            <span key={key} className="bs-circle bs-circle-ghost">
              {key}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* SOAL BLOCKS */}
        {soalEntries.map((entry, index) => (
          <div key={entry.id} className="bs-soal-card">
            <div className="bs-soal-card-header">
              <div>
                <span className="bs-eyebrow">SOAL {index + 1}</span>
                <h3 className="bs-soal-title">Detail Soal</h3>
              </div>

              <div className="bs-soal-header-right">
                <div className="bs-circle-group">
                  {(['A', 'B', 'C', 'D'] as AnswerKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`bs-circle bs-circle-select ${
                        entry.kunciJawaban === key ? 'active' : ''
                      }`}
                      onClick={() =>
                        updateEntry(entry.id, { kunciJawaban: key })
                      }
                    >
                      {key}
                    </button>
                  ))}
                </div>

                {soalEntries.length > 1 && (
                  <button
                    type="button"
                    className="bs-remove-btn"
                    onClick={() => removeEntry(entry.id)}
                    aria-label={`Hapus soal ${index + 1}`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="bs-field">
              <label>Soal</label>
              <input
                type="text"
                placeholder="Tulis soal di sini"
                value={entry.soal}
                onChange={(e) =>
                  updateEntry(entry.id, { soal: e.target.value })
                }
                required
              />
            </div>

            <div className="bs-field">
              <label>Jawaban Pilihan A</label>
              <input
                type="text"
                placeholder="Tulis jawaban pilihan A di sini"
                value={entry.jawabanA}
                onChange={(e) =>
                  updateEntry(entry.id, { jawabanA: e.target.value })
                }
                required
              />
            </div>

            <div className="bs-field">
              <label>Jawaban Pilihan B</label>
              <input
                type="text"
                placeholder="Tulis jawaban pilihan B di sini"
                value={entry.jawabanB}
                onChange={(e) =>
                  updateEntry(entry.id, { jawabanB: e.target.value })
                }
                required
              />
            </div>

            <div className="bs-field">
              <label>Jawaban Pilihan C</label>
              <input
                type="text"
                placeholder="Tulis jawaban pilihan C di sini"
                value={entry.jawabanC}
                onChange={(e) =>
                  updateEntry(entry.id, { jawabanC: e.target.value })
                }
                required
              />
            </div>

            <div className="bs-field">
              <label>Jawaban Pilihan D</label>
              <input
                type="text"
                placeholder="Tulis jawaban pilihan D di sini"
                value={entry.jawabanD}
                onChange={(e) =>
                  updateEntry(entry.id, { jawabanD: e.target.value })
                }
                required
              />
            </div>
          </div>
        ))}

        {/* BOTTOM ACTIONS ROW */}
        <div className="bs-bottom-row">
          <button type="button" className="bs-btn-add" onClick={addEntry}>
            <Plus size={16} />
            Tambah Soal
          </button>

          <button
            type="button"
            className="bs-btn-template-outline"
            onClick={handleDownloadTemplate}
          >
            <Download size={15} />
            Download Template
          </button>
        </div>

        {formError && <p className="bs-error">{formError}</p>}
        {successMessage && <p className="bs-success">{successMessage}</p>}

        {/* FINAL ACTIONS */}
        <div className="bs-final-actions">
          <button
            type="button"
            className="bs-btn-cancel"
            onClick={() => setSoalEntries([makeEmptyEntry()])}
          >
            Batal
          </button>
          <button type="submit" className="bs-btn-save" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function BankSoalPage() {
  return (
    <Suspense fallback={<p className="bs-empty-note">Memuat halaman...</p>}>
      <BankSoalContent />
    </Suspense>
  )
}

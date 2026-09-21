'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Papa from 'papaparse'
import { Plus, Trash2, Download, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseQuestionFile } from '@/lib/parseQuestionFile'

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

const inputClass =
  'w-full rounded-xl border border-[#e4e2ee] bg-[#f8f7fd] px-3.5 py-2.5 text-sm font-medium text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20'

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

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setFormError('')

    try {
      const rows = await parseQuestionFile(file)
      if (rows.length === 0) {
        throw new Error('File CSV/XLSX kosong atau formatnya tidak sesuai.')
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
      setSuccessMessage(`${validRows.length} soal berhasil diimpor.`)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal memproses file CSV/XLSX.'
      )
    } finally {
      setImporting(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
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
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a3f7a] to-[#3d3466] px-8 py-7 shadow-lg shadow-[#3d3466]/20 lg:px-10 lg:py-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#c9c3e6]">
            Bank Soal
          </span>
          <h1 className="mt-3 text-2xl font-bold text-white lg:text-3xl">
            Pilih Modul
          </h1>
          <p className="mt-1 text-sm text-[#c9c3e6]">
            Pilih modul yang mau ditambahkan soalnya terlebih dahulu.
          </p>
        </div>

        <input
          type="text"
          placeholder="Cari nama modul..."
          value={searchModul}
          onChange={(e) => setSearchModul(e.target.value)}
          className={`h-12 ${inputClass}`}
        />

        {loadingModulList ? (
          <p className="py-10 text-center text-sm font-semibold text-[#4a3f7a]">
            Memuat daftar modul...
          </p>
        ) : filteredModulList.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#a79fd6]">
            {modulList.length === 0
              ? 'Belum ada modul. Tambahkan modul dulu di Manajemen Modul.'
              : 'Tidak ada modul yang cocok dengan pencarian.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredModulList.map((m) => (
              <button
                key={m.id_modul}
                type="button"
                onClick={() => pilihModul(m.id_modul)}
                className="rounded-[20px] bg-white p-5 text-left text-sm font-bold text-[#3d3466] shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
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
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a3f7a] to-[#3d3466] px-8 py-7 shadow-lg shadow-[#3d3466]/20 lg:px-10 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#c9c3e6]">
              Bank Soal
            </span>
            <h1 className="mt-3 text-2xl font-bold text-white lg:text-3xl">
              Form Soal
            </h1>
            <p className="mt-1 max-w-xl text-sm text-[#c9c3e6]">
              Tambahkan soal pilihan ganda, pilih kunci jawaban, atau impor
              CSV untuk mempercepat proses.
              {namaModul && !loadingModul && (
                <> Modul: <strong className="text-white">{namaModul}</strong>.</>
              )}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={handleImportClick}
              disabled={importing}
              className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-60"
            >
              {importing ? 'Mengimpor...' : 'Impor Dokumen'}
            </button>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-amber-950 shadow-sm shadow-amber-900/20 transition hover:bg-amber-300"
            >
              <Download size={15} />
              Download Template
            </button>

            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              hidden
              onChange={handleImportFile}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={gantiModul}
          className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#c9c3e6] transition hover:text-white"
        >
          <ArrowLeft size={13} />
          Ganti Modul
        </button>
      </div>

      {/* KUNCI JAWABAN INFO CARD */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-[#a79fd6]">
            Kunci Jawaban
          </span>
          <h2 className="mt-1 text-base font-bold text-[#3d3466]">
            Sistem Pilih Jawaban
          </h2>
          <p className="mt-1 max-w-lg text-xs text-[#8b84a5]">
            Isi soal secara manual atau gunakan template CSV. Setiap soal
            dapat memiliki empat pilihan jawaban dengan satu kunci jawaban
            aktif.
          </p>
        </div>

        <div className="flex gap-2">
          {(['A', 'B', 'C', 'D'] as AnswerKey[]).map((key) => (
            <span
              key={key}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e2ee] text-sm font-bold text-[#a79fd6]"
            >
              {key}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SOAL BLOCKS */}
        {soalEntries.map((entry, index) => (
          <div
            key={entry.id}
            className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-black/5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-[#a79fd6]">
                  Soal {index + 1}
                </span>
                <h3 className="text-base font-bold text-[#3d3466]">Detail Soal</h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {(['A', 'B', 'C', 'D'] as AnswerKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateEntry(entry.id, { kunciJawaban: key })}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${entry.kunciJawaban === key
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-[#f4f2fa] text-[#4a3f7a] hover:bg-[#e9e5f7]'
                        }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>

                {soalEntries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    aria-label={`Hapus soal ${index + 1}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
                  Soal
                </label>
                <input
                  type="text"
                  placeholder="Tulis soal di sini"
                  value={entry.soal}
                  onChange={(e) => updateEntry(entry.id, { soal: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>

              {(['A', 'B', 'C', 'D'] as const).map((key) => {
                const field =
                  key === 'A' ? 'jawabanA' : key === 'B' ? 'jawabanB' : key === 'C' ? 'jawabanC' : 'jawabanD'

                return (
                  <div key={key}>
                    <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
                      Jawaban Pilihan {key}
                    </label>
                    <input
                      type="text"
                      placeholder={`Tulis jawaban pilihan ${key} di sini`}
                      value={entry[field]}
                      onChange={(e) => updateEntry(entry.id, { [field]: e.target.value })}
                      required
                      className={inputClass}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* BOTTOM ACTIONS ROW */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addEntry}
            className="flex items-center gap-1.5 rounded-full border border-[#e4e2ee] bg-white px-5 py-2.5 text-sm font-bold text-[#4a3f7a] transition hover:bg-[#f8f7fd]"
          >
            <Plus size={16} />
            Tambah Soal
          </button>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 rounded-full border border-[#e4e2ee] bg-white px-5 py-2.5 text-sm font-bold text-[#4a3f7a] transition hover:bg-[#f8f7fd]"
          >
            <Download size={15} />
            Download Template
          </button>
        </div>

        {formError && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600 ring-1 ring-red-200">
            {formError}
          </p>
        )}
        {successMessage && (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
            {successMessage}
          </p>
        )}

        {/* FINAL ACTIONS */}
        <div className="flex justify-end gap-3 border-t border-[#f0edf9] pt-4">
          <button
            type="button"
            onClick={() => setSoalEntries([makeEmptyEntry()])}
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

export default function BankSoalPage() {
  return (
    <Suspense
      fallback={
        <p className="py-10 text-center text-sm font-semibold text-[#4a3f7a]">
          Memuat halaman...
        </p>
      }
    >
      <BankSoalContent />
    </Suspense>
  )
}
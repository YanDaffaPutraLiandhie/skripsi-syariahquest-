'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Student {
  id: number
  name: string
}

const LEVEL_CONFIG: Record<
  string,
  { title: string; badge: string; badgeClass: string }
> = {
  easy: {
    title: 'Mahasiswa Easy',
    badge: 'E',
    badgeClass: 'easy-badge',
  },
  medium: {
    title: 'Mahasiswa Medium',
    badge: 'M',
    badgeClass: 'medium-badge',
  },
  hard: {
    title: 'Mahasiswa Hard',
    badge: 'H',
    badgeClass: 'hard-badge',
  },
}

// Sama persis dengan pemetaan id_level di dashboard admin utama
const LEVEL_ID_MAP: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
}

const PAGE_SIZE = 12

interface ProgressEntry {
  id_mahasiswa: number
  tanggal_selesai: string
  id_level: number
}

export default function LevelDetailPage() {
  const params = useParams<{ level: string }>()
  const router = useRouter()

  const levelKey = (params?.level ?? 'easy').toLowerCase()
  const config = LEVEL_CONFIG[levelKey] ?? LEVEL_CONFIG.easy
  const idLevel = LEVEL_ID_MAP[levelKey]

  const [page, setPage] = useState(1)
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPage(1)
    fetchStudentsForLevel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelKey])

  // =========================================================
  // Ambil SEMUA mahasiswa yang "level tertingginya saat ini"
  // sama dengan level yang sedang dibuka. Logic ini SENGAJA
  // disamakan persis dengan dashboard admin utama (AdminDashboardPage),
  // supaya angka di kartu ringkasan dan isi list di sini selalu nyambung.
  // =========================================================
  async function fetchStudentsForLevel() {
    setLoading(true)

    try {
      if (!idLevel) {
        throw new Error('Level tidak valid')
      }

      // 1. Ambil seluruh riwayat penyelesaian modul (yang sudah "selesai"),
      // sekaligus level modul yang bersangkutan lewat join embedded.
      const { data: progressRows, error: progressError } = await supabase
        .from('progress_modul')
        .select('id_mahasiswa, tanggal_selesai, modul:modul(id_level)')
        .eq('selesai', true)
        .order('tanggal_selesai', { ascending: true })

      if (progressError) {
        throw progressError
      }

      const entries: ProgressEntry[] = (progressRows ?? [])
        .filter((row: any) => row.modul?.id_level)
        .map((row: any) => ({
          id_mahasiswa: row.id_mahasiswa,
          tanggal_selesai: row.tanggal_selesai,
          id_level: row.modul.id_level,
        }))

      // 2. Level TERTINGGI yang sudah diselesaikan mahasiswa tertentu
      // (sampai sekarang) -- identik dengan helper di dashboard utama.
      function highestLevel(mahasiswaId: number): number | null {
        let highest: number | null = null

        for (const entry of entries) {
          if (entry.id_mahasiswa !== mahasiswaId) continue
          if (highest === null || entry.id_level > highest) {
            highest = entry.id_level
          }
        }

        return highest
      }

      const distinctMahasiswaIds = Array.from(
        new Set(entries.map((e) => e.id_mahasiswa))
      )

      // 3. Saring cuma yang level tertingginya = level yang sedang dibuka
      const matchingIds = distinctMahasiswaIds.filter(
        (id) => highestLevel(id) === idLevel
      )

      if (matchingIds.length === 0) {
        setAllStudents([])
        return
      }

      // 4. Ambil nama mahasiswa dari table MAHASISWA (bukan "user" --
      // itu bug lama, table "user" tidak punya kolom nama/id_level)
      const { data: mahasiswaRows, error: mahasiswaError } = await supabase
        .from('mahasiswa')
        .select('id_mahasiswa, nama_mahasiswa')
        .in('id_mahasiswa', matchingIds)
        .order('nama_mahasiswa', { ascending: true })

      if (mahasiswaError) {
        throw mahasiswaError
      }

      const studentData: Student[] = (mahasiswaRows ?? []).map((m: any) => ({
        id: m.id_mahasiswa,
        name: m.nama_mahasiswa,
      }))

      setAllStudents(studentData)
    } catch (error: any) {
      console.error(
        'Gagal memuat data mahasiswa:',
        JSON.stringify({
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
        })
      )
      setAllStudents([])
    } finally {
      setLoading(false)
    }
  }

  // Pagination dilakukan di sisi client (bukan lewat .range() Supabase),
  // karena "level tertinggi" itu hasil hitungan gabungan banyak baris,
  // bukan kolom yang bisa langsung difilter+range oleh database.
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE
  const students = allStudents.slice(from, to)
  const hasNextPage = to < allStudents.length

  function handleKembali() {
    if (page > 1) {
      setPage((prev) => prev - 1)
    } else {
      router.push('/admin')
    }
  }

  function handleNext() {
    if (hasNextPage) {
      setPage((prev) => prev + 1)
    }
  }

  return (
    <div className="level-detail-panel">
      {/* HEADER */}
      <div className="level-detail-header">
        <span className={`level-detail-badge ${config.badgeClass}`}>
          {config.badge}
        </span>

        <h1 className="level-detail-title">{config.title}</h1>
      </div>

      {/* STUDENT LIST */}
      <div className="student-rows">
        {loading ? (
          <div className="student-row">
            <span className="student-name-field">
              Memuat data mahasiswa...
            </span>
          </div>
        ) : students.length === 0 ? (
          <div className="student-row">
            <span className="student-name-field">
              Tidak ada mahasiswa pada level ini.
            </span>
          </div>
        ) : (
          students.map((student, index) => (
            <div className="student-row" key={student.id}>
              <span className="student-number">
                {(page - 1) * PAGE_SIZE + index + 1}
              </span>

              <span className="student-name-field">{student.name}</span>
            </div>
          ))
        )}
      </div>

      {/* ACTIONS */}
      <div className="level-detail-actions">
        <button className="btn-kembali" onClick={handleKembali}>
          Kembali
        </button>

        <button
          className="btn-next"
          onClick={handleNext}
          disabled={!hasNextPage}
        >
          Next
        </button>
      </div>
    </div>
  )
}

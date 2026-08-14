'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Student {
  id: string | number
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

const PAGE_SIZE = 12

export default function LevelDetailPage() {
  const params = useParams<{ level: string }>()
  const router = useRouter()

  const levelKey = (params?.level ?? 'easy').toLowerCase()
  const config = LEVEL_CONFIG[levelKey] ?? LEVEL_CONFIG.easy

  const [page, setPage] = useState(1)
  const [students, setStudents] = useState<Student[]>([])
  const [hasNextPage, setHasNextPage] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudents(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, levelKey])

  async function fetchStudents(currentPage: number) {
    setLoading(true)

    try {
      const from = (currentPage - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      // TODO: sesuaikan nama tabel & kolom dengan skema Supabase Anda
      // const { data, count, error } = await supabase
      //   .from('students')
      //   .select('id, name', { count: 'exact' })
      //   .eq('level', levelKey)
      //   .order('name', { ascending: true })
      //   .range(from, to)
      //
      // if (error) throw error
      //
      // setStudents(data ?? [])
      // setHasNextPage((count ?? 0) > to + 1)

      // Placeholder sementara (hapus setelah query supabase aktif)
      const placeholder: Student[] = Array.from(
        { length: PAGE_SIZE },
        (_, i) => ({
          id: from + i + 1,
          name: 'Player name',
        })
      )
      setStudents(placeholder)
      setHasNextPage(currentPage < 3) // contoh: batasi 3 halaman dummy

      setLoading(false)
    } catch (error) {
      console.error('Gagal memuat data mahasiswa:', error)
      setLoading(false)
    }
  }

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
        {students.map((student, index) => (
          <div className="student-row" key={student.id}>
            <span className="student-number">
              {(page - 1) * PAGE_SIZE + index + 1}
            </span>
            <span className="student-name-field">{student.name}</span>
          </div>
        ))}
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

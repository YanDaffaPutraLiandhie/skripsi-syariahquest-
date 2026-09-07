'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { supabase } from '@/lib/supabase'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
)

interface LevelSummary {
  easy: number
  medium: number
  hard: number
}

interface WeeklyProgress {
  label: string
  easy: number
  medium: number
  hard: number
}

interface TopPlayer {
  rank: number
  name: string
  score: number
}

interface ProgressEntry {
  id_mahasiswa: number
  tanggal_selesai: string
  id_level: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export default function AdminDashboardPage() {
  const [levelSummary, setLevelSummary] = useState<LevelSummary>({
    easy: 0,
    medium: 0,
    hard: 0,
  })

  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([])
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [hasProgressData, setHasProgressData] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)

    try {
      // 1. Ambil daftar level (id -> nama), urut dari termudah
      const { data: levelRows, error: levelError } = await supabase
        .from('level')
        .select('id_level, nama_level')
        .order('id_level', { ascending: true })

      if (levelError) {
        console.error(
          'FETCH LEVEL ERROR:',
          JSON.stringify({ message: levelError.message })
        )
        setLoading(false)
        return
      }

      const levelIdByName = (keyword: string) =>
        levelRows?.find((l) => l.nama_level.toLowerCase().includes(keyword))
          ?.id_level

      const easyId = levelIdByName('easy')
      const mediumId = levelIdByName('medium')
      const hardId = levelIdByName('hard')

      // 2. Ambil seluruh riwayat penyelesaian modul mahasiswa,
      // sekaligus level modul yang mereka selesaikan (lewat join embedded)
      const { data: progressRows, error: progressError } = await supabase
        .from('progress_modul')
        .select('id_mahasiswa, tanggal_selesai, modul:modul(id_level)')
        .eq('selesai', true)
        .order('tanggal_selesai', { ascending: true })

      if (progressError) {
        console.error(
          'FETCH PROGRESS MODUL ERROR:',
          JSON.stringify({ message: progressError.message })
        )
        // Sengaja TIDAK return di sini — walau data progress gagal
        // di-fetch, Top Players (yang datanya independen dari
        // progress_modul) tetap harus lanjut dicoba di bawah.
      }

      const entries: ProgressEntry[] = (progressRows ?? [])
        .filter((row: any) => row.modul?.id_level)
        .map((row: any) => ({
          id_mahasiswa: row.id_mahasiswa,
          tanggal_selesai: row.tanggal_selesai,
          id_level: row.modul.id_level,
        }))

      setHasProgressData(entries.length > 0)

      // Helper: level tertinggi (id_level terbesar) yang sudah diselesaikan
      // mahasiswa tertentu, dihitung sampai batas tanggal tertentu.
      function highestLevelAsOf(
        mahasiswaId: number,
        asOfDate: Date
      ): number | null {
        let highest: number | null = null

        for (const entry of entries) {
          if (entry.id_mahasiswa !== mahasiswaId) continue
          if (new Date(entry.tanggal_selesai) > asOfDate) continue

          if (highest === null || entry.id_level > highest) {
            highest = entry.id_level
          }
        }

        return highest
      }

      // Bagian ini (kartu Level Pembelajaran + chart mingguan) hanya
      // dihitung kalau memang ada data progress. Kalau kosong, dilewati
      // begitu saja — TAPI kode di bawahnya (Top Players) tetap lanjut
      // jalan, tidak ikut ke-skip.
      if (entries.length > 0) {
        const distinctMahasiswaIds = Array.from(
          new Set(entries.map((e) => e.id_mahasiswa))
        )

        // 3. Hitung ringkasan level SAAT INI (untuk kartu Level Pembelajaran)
        const now = new Date()
        let easyCount = 0
        let mediumCount = 0
        let hardCount = 0

        for (const id of distinctMahasiswaIds) {
          const level = highestLevelAsOf(id, now)
          if (level === easyId) easyCount++
          else if (level === mediumId) mediumCount++
          else if (level === hardId) hardCount++
        }

        setLevelSummary({
          easy: easyCount,
          medium: mediumCount,
          hard: hardCount,
        })

        // 4. Hitung snapshot 4 minggu terakhir (mundur 21, 14, 7, 0 hari
        // dari hari ini) untuk chart Aktivitas Belajar
        const weekOffsets = [21, 14, 7, 0]

        const weekly: WeeklyProgress[] = weekOffsets.map(
          (daysAgo, index) => {
            const boundaryDate = new Date(
              now.getTime() - daysAgo * MS_PER_DAY
            )

            let e = 0
            let m = 0
            let h = 0

            for (const id of distinctMahasiswaIds) {
              const level = highestLevelAsOf(id, boundaryDate)
              if (level === easyId) e++
              else if (level === mediumId) m++
              else if (level === hardId) h++
            }

            return {
              label: `Minggu ${index + 1}`,
              easy: e,
              medium: m,
              hard: h,
            }
          }
        )

        setWeeklyProgress(weekly)
      }

      // 5. Top players (leaderboard) berdasarkan total_xp
      // PENTING: ini SELALU dijalankan, tidak tergantung ada/tidaknya
      // data di progress_modul — sebelumnya ada bug di sini, kode ini
      // tidak pernah sempat jalan kalau progress_modul kosong.
      const { data: leaderboardRows, error: leaderboardError } =
        await supabase
          .from('mahasiswa')
          .select('nama_mahasiswa, total_xp')
          .order('total_xp', { ascending: false })
          .limit(3)

      if (leaderboardError) {
        console.error(
          'FETCH LEADERBOARD ERROR:',
          JSON.stringify({
            message: leaderboardError.message,
            details: leaderboardError.details,
            hint: leaderboardError.hint,
            code: leaderboardError.code,
          })
        )
      } else if (leaderboardRows) {
        setTopPlayers(
          leaderboardRows.map((row, i) => ({
            rank: i + 1,
            name: row.nama_mahasiswa,
            score: row.total_xp ?? 0,
          }))
        )
      }

      setLoading(false)
    } catch (error: any) {
      console.error(
        'Gagal memuat data dashboard (exception):',
        JSON.stringify({ message: error?.message })
      )
      setLoading(false)
    }
  }

  const chartData = {
    labels: weeklyProgress.map((w) => w.label),
    datasets: [
      {
        label: 'Easy',
        data: weeklyProgress.map((w) => w.easy),
        borderColor: '#20DC7E',
        backgroundColor: '#20DC7E',
        pointBackgroundColor: '#20DC7E',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Medium',
        data: weeklyProgress.map((w) => w.medium),
        borderColor: '#EFD01E',
        backgroundColor: '#EFD01E',
        pointBackgroundColor: '#EFD01E',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Hard',
        data: weeklyProgress.map((w) => w.hard),
        borderColor: '#DC2023',
        backgroundColor: '#DC2023',
        pointBackgroundColor: '#DC2023',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 4,
      },
    ],
  }

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      title: {
        display: true,
        text: 'Perkembangan Level Pembelajaran Mahasiswa',
        color: '#1F2937',
        font: { size: 15, weight: 'bold' },
        padding: { bottom: 20 },
      },
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'line',
          boxWidth: 20,
          font: { size: 11 },
        },
        title: {
          display: true,
          text: 'Level Pembelajaran',
          font: { size: 11, weight: 'bold' },
        },
      },
      tooltip: { enabled: true },
      datalabels: {
        display: true,
        align: 'top',
        anchor: 'end',
        offset: 6,
        color: '#374151',
        font: { size: 11, weight: 'bold' as const },
        formatter: (value: number) => value,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Periode',
          color: '#6B7280',
          font: { size: 12 },
        },
        grid: { display: false },
        ticks: { color: '#374151' },
      },
      y: {
        title: {
          display: true,
          text: 'Jumlah Mahasiswa',
          color: '#6B7280',
          font: { size: 12 },
        },
        beginAtZero: true,
        grid: { color: '#F3F4F6' },
        ticks: { color: '#374151', stepSize: 1 },
      },
    },
  }

  const crownColors = ['#DC2626', '#2563EB', '#EA580C']

  return (
    <>
      {/* GREETING BANNER */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] p-8 shadow-lg shadow-[#3d3466]/25 lg:p-10 mb-8 text-white">
        {/* Header Banner Background SVGs */}
        <div className="absolute right-[28%] top-6 h-5 w-5 text-white/40">✨</div>
        <div className="absolute right-[8%] top-10 h-4 w-4 text-[#f2c94c] animate-pulse">✨</div>
        
        {/* Banner Decorative Curved Lines */}
        <div className="pointer-events-none absolute -right-10 top-0 opacity-20">
          <svg width="300" height="200" viewBox="0 0 300 200" fill="none">
            <path d="M50 0 C 150 100, 200 50, 300 200" stroke="white" strokeWidth="3" strokeDasharray="6 6" />
            <circle cx="200" cy="80" r="40" stroke="#f2c94c" strokeWidth="2" />
          </svg>
        </div>

        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-[#e2dcff] backdrop-blur-md border border-white/15 shadow-inner mb-2">
            <span className="text-amber-300">✨</span>
            Sistem Administrasi
          </span>
          <h1 className="text-3xl font-black leading-snug tracking-wide md:text-4xl">
            Halo Admin ! <br />
            <span className="text-xl md:text-2xl text-[#c9c3e6] font-semibold mt-1 inline-block">Selamat Datang Kembali</span>
          </h1>
        </div>

        {/* Bottom Wave Decoration */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 opacity-20">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-full fill-white">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.94,130.83,121.3,201,115.8,241.6,112.5,282.6,98.2,321.39,56.44Z" />
          </svg>
        </div>
      </div>

      {/* SECTION TITLE */}
      <h2 className="section-title">Aktivitas Belajar</h2>

      {/* CHART */}
      <div className="dashboard-chart">
        <div className="chart-wrapper">
          {loading ? (
            <p className="chart-loading">Memuat data...</p>
          ) : !hasProgressData ? (
            <p className="chart-loading">
              Belum ada mahasiswa yang menyelesaikan modul. Chart akan
              terisi otomatis begitu ada data di tabel `progress_modul`.
            </p>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="dashboard-bottom">
        {/* LEVEL PEMBELAJARAN */}
        <div>
          <h2 className="section-title">Level Pembelajaran</h2>

          <div className="dashboard-card level-panel">
            <div className="student-level-list">
              <Link
                href="/admin/level/easy"
                className="student-level-item clickable"
              >
                <div className="level-item-left">
                  <span className="level-badge easy-badge">E</span>
                  <span className="level-name">EASY</span>
                </div>
                <strong>{levelSummary.easy}</strong>
              </Link>

              <Link
                href="/admin/level/medium"
                className="student-level-item clickable"
              >
                <div className="level-item-left">
                  <span className="level-badge medium-badge">M</span>
                  <span className="level-name">MEDIUM</span>
                </div>
                <strong>{levelSummary.medium}</strong>
              </Link>

              <Link
                href="/admin/level/hard"
                className="student-level-item clickable"
              >
                <div className="level-item-left">
                  <span className="level-badge hard-badge">H</span>
                  <span className="level-name">HARD</span>
                </div>
                <strong>{levelSummary.hard}</strong>
              </Link>
            </div>
          </div>
        </div>

        {/* TOP PLAYERS */}
        <div>
          <h2 className="section-title">Top Players</h2>

          <div className="dashboard-card level-panel">
            <div className="top-players">
              {topPlayers.length === 0 ? (
                <p className="chart-loading">Belum ada data pemain</p>
              ) : (
                topPlayers.map((player, index) => (
                  <div className="player-item" key={player.rank}>
                    <div className="player-rank">
                      {String(player.rank).padStart(2, '0')}
                    </div>

                    <div className="player-info">
                      <strong>{player.name}</strong>
                    </div>

                    <div
                      className="rank-badge"
                      style={{ backgroundColor: crownColors[index] }}
                    >
                      <span className="rank-crown">♛</span>
                      <span className="rank-number">{player.rank}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

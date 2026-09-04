'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type JenisAktivitas =
  | 'Login'
  | 'Logout'
  | 'Create'
  | 'Read'
  | 'Update'
  | 'Delete'
  | 'Error'

interface LogRow {
  id_log: number
  nama_pelaku: string
  fitur: string
  jenis_aktivitas: JenisAktivitas
  keterangan: string | null
  status: 'Sukses' | 'Error'
  waktu: string // ISO timestamp
}

export default function LogActivityPage() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)

  const [filterTanggal, setFilterTanggal] = useState('')
  const [searchDosen, setSearchDosen] = useState('')

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTanggal])

  async function fetchLogs() {
    setLoading(true)

    try {
      let query = supabase
        .from('log_activity')
        .select(
          'id_log, nama_pelaku, fitur, jenis_aktivitas, keterangan, status, waktu'
        )
        .order('waktu', { ascending: false })

      if (filterTanggal) {
        const startOfDay = `${filterTanggal}T00:00:00`
        const endOfDay = `${filterTanggal}T23:59:59`
        query = query.gte('waktu', startOfDay).lte('waktu', endOfDay)
      }

      const { data, error } = await query

      if (error) {
        console.error('FETCH LOG ACTIVITY ERROR:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        setLoading(false)
        return
      }

      const rows: LogRow[] = data ?? []
      setLogs(rows)

      setLoading(false)
    } catch (error: any) {
      console.error('Gagal memuat log activity (exception):', {
        name: error?.name,
        message: error?.message,
      })
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) =>
    log.nama_pelaku.toLowerCase().includes(searchDosen.toLowerCase())
  )

  function formatWaktu(iso: string) {
    const date = new Date(iso)
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function jenisBadgeClass(jenis: JenisAktivitas) {
    const base =
      'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1'

    switch (jenis) {
      case 'Login':
      case 'Logout':
        return `${base} bg-indigo-50 text-indigo-600 ring-indigo-200`
      case 'Create':
        return `${base} bg-emerald-50 text-emerald-600 ring-emerald-200`
      case 'Read':
        return `${base} bg-sky-50 text-sky-600 ring-sky-200`
      case 'Update':
        return `${base} bg-amber-50 text-amber-700 ring-amber-200`
      case 'Delete':
        return `${base} bg-rose-50 text-rose-600 ring-rose-200`
      case 'Error':
        return `${base} bg-red-50 text-red-700 ring-red-200`
      default:
        return `${base} bg-[#f4f2fa] text-[#4a3f7a] ring-[#e4e2ee]`
    }
  }

  return (
    <div className="space-y-6">
      {/* BANNER */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a3f7a] to-[#3d3466] px-8 py-7 shadow-lg shadow-[#3d3466]/20 lg:px-10 lg:py-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#c9c3e6]">
          Riwayat Sistem
        </span>
        <h1 className="mt-3 text-2xl font-bold text-white lg:text-3xl">
          Log Activity
        </h1>
        <p className="mt-1 text-sm text-[#c9c3e6]">
          Pantau aktivitas dosen: login, fitur yang dibuka, aksi CRUD, dan error
        </p>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap items-end gap-3 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
            Cari Dosen
          </label>
          <input
            type="text"
            placeholder="Nama dosen..."
            value={searchDosen}
            onChange={(e) => setSearchDosen(e.target.value)}
            className="h-11 w-full rounded-xl border border-[#e4e2ee] bg-[#f8f7fd] px-3.5 text-sm font-medium text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
            Tanggal
          </label>
          <input
            type="date"
            value={filterTanggal}
            onChange={(e) => setFilterTanggal(e.target.value)}
            className="h-11 rounded-xl border border-[#e4e2ee] bg-[#f8f7fd] px-3.5 text-sm font-medium text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20"
          />
        </div>

        {(filterTanggal || searchDosen) && (
          <button
            type="button"
            onClick={() => {
              setFilterTanggal('')
              setSearchDosen('')
            }}
            className="h-11 rounded-full border border-[#e4e2ee] bg-white px-5 text-xs font-bold text-[#4a3f7a] transition hover:bg-[#f8f7fd]"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0edf9] text-xs font-bold uppercase tracking-wide text-[#8b84a5]">
                <th className="px-5 py-3">Dosen</th>
                <th className="px-5 py-3">Fitur</th>
                <th className="px-5 py-3">Jenis</th>
                <th className="px-5 py-3">Keterangan</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0edf9]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm font-semibold text-[#4a3f7a]">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#a79fd6]">
                    Belum ada aktivitas tercatat
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id_log} className="transition hover:bg-[#f8f7fd]">
                    <td className="px-5 py-3.5 font-semibold text-[#2b2540]">
                      {log.nama_pelaku}
                    </td>
                    <td className="px-5 py-3.5 text-[#4a3f7a]">{log.fitur}</td>
                    <td className="px-5 py-3.5">
                      <span className={jenisBadgeClass(log.jenis_aktivitas)}>
                        {log.jenis_aktivitas}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate px-5 py-3.5 text-[#6e6a85]">
                      {log.keterangan || '-'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${log.status === 'Sukses'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-rose-50 text-rose-700 ring-rose-200'
                          }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-[#8b84a5]">
                      {formatWaktu(log.waktu)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
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
      // TODO: sesuaikan nama tabel & kolom dengan skema Supabase Anda.
      // Asumsi tabel `log_activity` punya kolom:
      // id_log, nama_pelaku, fitur, jenis_aktivitas, keterangan, status, waktu
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
    switch (jenis) {
      case 'Login':
      case 'Logout':
        return 'jenis-badge jenis-auth'
      case 'Create':
        return 'jenis-badge jenis-create'
      case 'Read':
        return 'jenis-badge jenis-read'
      case 'Update':
        return 'jenis-badge jenis-update'
      case 'Delete':
        return 'jenis-badge jenis-delete'
      case 'Error':
        return 'jenis-badge jenis-error'
      default:
        return 'jenis-badge'
    }
  }

  return (
    <>
      {/* BANNER */}
      <div className="page-banner">
        <h1>Log Activity</h1>
      </div>

      <p className="badges-subtitle">
        Pantau aktivitas dosen: login, fitur yang dibuka, aksi CRUD, dan error
      </p>

      {/* FILTERS */}
      <div className="log-filter-row">
        <div className="log-filter-field">
          <label>Cari Dosen</label>
          <input
            type="text"
            placeholder="Nama dosen..."
            value={searchDosen}
            onChange={(e) => setSearchDosen(e.target.value)}
          />
        </div>

        <div className="log-filter-field">
          <label>Tanggal</label>
          <input
            type="date"
            value={filterTanggal}
            onChange={(e) => setFilterTanggal(e.target.value)}
          />
        </div>

        {(filterTanggal || searchDosen) && (
          <button
            className="btn-modal-cancel log-reset-btn"
            onClick={() => {
              setFilterTanggal('')
              setSearchDosen('')
            }}
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Dosen</th>
              <th>Fitur</th>
              <th>Jenis</th>
              <th>Keterangan</th>
              <th>Status</th>
              <th>Waktu</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="admin-table-empty">
                  Memuat data...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-table-empty">
                  Belum ada aktivitas tercatat
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id_log}>
                  <td>{log.nama_pelaku}</td>
                  <td>{log.fitur}</td>
                  <td>
                    <span className={jenisBadgeClass(log.jenis_aktivitas)}>
                      {log.jenis_aktivitas}
                    </span>
                  </td>
                  <td className="game-deskripsi-cell">
                    {log.keterangan || '-'}
                  </td>
                  <td>
                    <span
                      className={`status-label ${log.status === 'Sukses'
                          ? 'label-aktif'
                          : 'label-nonaktif'
                        }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td>{formatWaktu(log.waktu)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type JenisAktivitas =
  | 'Login'
  | 'Logout'
  | 'Create'
  | 'Read'
  | 'Update'
  | 'Delete'
  | 'Error'

type Role = 'Dosen' | 'Mahasiswa'

interface LogRow {
  id_log: number
  nama_pelaku: string
  role: Role
  fitur: string
  jenis_aktivitas: JenisAktivitas
  keterangan: string | null
  status: 'Sukses' | 'Error'
  waktu: string // ISO timestamp
}

interface BackupFile {
  name: string
  created_at: string | null
}

export default function LogActivityPage() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)

  const [filterTanggal, setFilterTanggal] = useState('')
  const [filterRole, setFilterRole] = useState<'Semua' | Role>('Semua')
  const [searchNama, setSearchNama] = useState('')

  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([])
  const [loadingBackups, setLoadingBackups] = useState(true)

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTanggal, filterRole])

  useEffect(() => {
    fetchBackupFiles()
  }, [])

  async function fetchLogs() {
    setLoading(true)

    try {
      // NOTE skema: kolom `nama_dosen` sudah diganti jadi `nama_pelaku`
      // dan ditambah kolom `role` ('Dosen' | 'Mahasiswa') supaya log
      // activity bisa dipakai untuk dua role — lihat migration-log-activity.sql
      let query = supabase
        .from('log_activity')
        .select(
          'id_log, nama_pelaku, role, fitur, jenis_aktivitas, keterangan, status, waktu'
        )
        .order('waktu', { ascending: false })

      if (filterTanggal) {
        const startOfDay = `${filterTanggal}T00:00:00`
        const endOfDay = `${filterTanggal}T23:59:59`
        query = query.gte('waktu', startOfDay).lte('waktu', endOfDay)
      }

      if (filterRole !== 'Semua') {
        query = query.eq('role', filterRole)
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

  async function fetchBackupFiles() {
    setLoadingBackups(true)

    try {
      const { data, error } = await supabase.storage
        .from('log-backups')
        .list('', { sortBy: { column: 'created_at', order: 'desc' } })

      if (error) {
        console.error('FETCH BACKUP FILES ERROR:', error.message)
        setLoadingBackups(false)
        return
      }

      setBackupFiles(
        (data ?? [])
          .filter((f) => f.name.endsWith('.csv'))
          .map((f) => ({ name: f.name, created_at: f.created_at ?? null }))
      )
      setLoadingBackups(false)
    } catch (error: any) {
      console.error('Gagal memuat daftar backup (exception):', error?.message)
      setLoadingBackups(false)
    }
  }

  async function handleDownloadBackup(fileName: string) {
    try {
      const { data, error } = await supabase.storage
        .from('log-backups')
        .download(fileName)

      if (error || !data) {
        console.error('DOWNLOAD BACKUP ERROR:', error?.message)
        return
      }

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Gagal mengunduh backup (exception):', error?.message)
    }
  }

  const filteredLogs = logs.filter((log) =>
    log.nama_pelaku.toLowerCase().includes(searchNama.toLowerCase())
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

      <p className="badges-subtitle">
        Pantau aktivitas dosen &amp; login mahasiswa: fitur yang dibuka, aksi
        CRUD, dan error. Log lebih dari 7 hari otomatis di-backup sebagai
        file lalu dihapus dari tabel — unduh di panel &quot;Backup Log
        Lama&quot; di bawah.
      </p>

      {/* FILTERS */}
      <div className="log-filter-row">
        <div className="log-filter-field">
          <label>Cari Nama</label>
          <input
            type="text"
            placeholder="Nama dosen / mahasiswa..."
            value={searchNama}
            onChange={(e) => setSearchNama(e.target.value)}
          />
        </div>

        <div className="log-filter-field">
          <label>Role</label>
          <select
            value={filterRole}
            onChange={(e) =>
              setFilterRole(e.target.value as 'Semua' | Role)
            }
          >
            <option value="Semua">Semua</option>
            <option value="Dosen">Dosen</option>
            <option value="Mahasiswa">Mahasiswa</option>
          </select>
        </div>

        <div className="log-filter-field">
          <label>Tanggal</label>
          <input
            type="date"
            value={filterTanggal}
            onChange={(e) => setFilterTanggal(e.target.value)}
            className="h-11 rounded-xl border border-[#e4e2ee] bg-[#f8f7fd] px-3.5 text-sm font-medium text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20"
          />
        </div>

        {(filterTanggal || searchNama || filterRole !== 'Semua') && (
          <button
            type="button"
            onClick={() => {
              setFilterTanggal('')
              setSearchNama('')
              setFilterRole('Semua')
            }}
            className="h-11 rounded-full border border-[#e4e2ee] bg-white px-5 text-xs font-bold text-[#4a3f7a] transition hover:bg-[#f8f7fd]"
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
              <th>Nama</th>
              <th>Role</th>
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
                <td colSpan={7} className="admin-table-empty">
                  Memuat data...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-table-empty">
                  Belum ada aktivitas tercatat
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id_log}>
                  <td>{log.nama_pelaku}</td>
                  <td>{log.role}</td>
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
                      className={`status-label ${
                        log.status === 'Sukses'
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

      {/* BACKUP LOG LAMA */}
      <h2 className="section-title" style={{ marginTop: 32 }}>
        Backup Log Lama
      </h2>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nama File</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loadingBackups ? (
              <tr>
                <td colSpan={3} className="admin-table-empty">
                  Memuat daftar backup...
                </td>
              </tr>
            ) : backupFiles.length === 0 ? (
              <tr>
                <td colSpan={3} className="admin-table-empty">
                  Belum ada file backup
                </td>
              </tr>
            ) : (
              backupFiles.map((file) => (
                <tr key={file.name}>
                  <td>{file.name}</td>
                  <td>
                    {file.created_at
                      ? formatWaktu(file.created_at)
                      : '-'}
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button
                        className="icon-action edit"
                        onClick={() => handleDownloadBackup(file.name)}
                        aria-label={`Unduh ${file.name}`}
                        title="Unduh backup"
                      >
                        <Download size={16} />
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
  )
}
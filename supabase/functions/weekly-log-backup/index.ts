// supabase/functions/weekly-log-backup/index.ts
//
// Jadwal via pg_cron (lihat migration-log-activity.sql).
// Alur: ambil log lebih tua dari 7 hari -> upload sebagai file CSV ke
// Storage bucket "log-backups" -> HANYA hapus baris itu dari tabel kalau
// upload berhasil. Kalau upload gagal, data TIDAK dihapus (aman).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Ubah satu baris log_activity jadi baris CSV yang aman (escape koma,
// kutip, dan baris baru di dalam teks seperti `keterangan`).
function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function logsToCsv(logs: Record<string, any>[]): string {
  if (logs.length === 0) return ''

  const headers = Object.keys(logs[0])
  const headerRow = headers.join(',')

  const rows = logs.map((log) =>
    headers.map((h) => toCsvValue(log[h])).join(',')
  )

  return [headerRow, ...rows].join('\n')
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString()

    // 1. Ambil semua log yang lebih tua dari 7 hari
    const { data: oldLogs, error: fetchError } = await supabase
      .from('log_activity')
      .select('*')
      .lt('waktu', sevenDaysAgo)
      .order('waktu', { ascending: true })

    if (fetchError) {
      console.error('FETCH OLD LOGS ERROR:', fetchError)
      return new Response(
        JSON.stringify({ success: false, message: fetchError.message }),
        { status: 500 }
      )
    }

    if (!oldLogs || oldLogs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Tidak ada log yang perlu di-backup' }),
        { status: 200 }
      )
    }

    // 2. Upload sebagai file CSV ke Storage
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const fileName = `log-activity-${today}.csv`
    const fileContent = logsToCsv(oldLogs)

    const { error: uploadError } = await supabase.storage
      .from('log-backups')
      .upload(fileName, new Blob([fileContent], { type: 'text/csv' }), {
        upsert: true,
      })

    if (uploadError) {
      console.error('UPLOAD BACKUP ERROR:', uploadError)
      // PENTING: kalau upload gagal, JANGAN hapus data apa pun.
      return new Response(
        JSON.stringify({ success: false, message: uploadError.message }),
        { status: 500 }
      )
    }

    // 3. Upload berhasil -> baru hapus baris yang sudah ter-backup
    const idsToDelete = oldLogs.map((log: any) => log.id_log)

    const { error: deleteError } = await supabase
      .from('log_activity')
      .delete()
      .in('id_log', idsToDelete)

    if (deleteError) {
      console.error('DELETE AFTER BACKUP ERROR:', deleteError)
      // File backup tetap ada di Storage walau baris gagal dihapus,
      // jadi data tidak hilang — bisa dicoba hapus manual nanti.
      return new Response(
        JSON.stringify({ success: false, message: deleteError.message }),
        { status: 500 }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backup ${fileName} berhasil, ${idsToDelete.length} log lama dihapus dari tabel.`,
      }),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('WEEKLY LOG BACKUP EXCEPTION:', error)
    return new Response(
      JSON.stringify({ success: false, message: error?.message ?? 'Unknown error' }),
      { status: 500 }
    )
  }
})
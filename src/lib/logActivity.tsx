import { supabase } from '@/lib/supabase'

type LogActivityParams = {
  fitur: string
  jenis_aktivitas: string
  keterangan?: string
  status?: string
}

export async function logActivity({
  fitur,
  jenis_aktivitas,
  keterangan,
  status = 'Sukses',
}: {
  fitur: string
  jenis_aktivitas: string
  keterangan?: string
  status?: string
}) {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    console.log('=== LOG ACTIVITY ===')
    console.log('Session:', !!session)
    console.log('Session error:', sessionError)

    if (!session?.access_token) {
      console.error('LOG ACTIVITY: TOKEN TIDAK ADA')
      return false
    }

    const response = await fetch('/api/log-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        fitur,
        jenis_aktivitas,
        keterangan: keterangan || null,
        status,
      }),
    })

    const responseText = await response.text()

    console.log('=== HASIL API LOG ACTIVITY ===')
    console.log('HTTP STATUS:', response.status)
    console.log('STATUS TEXT:', response.statusText)
    console.log('RAW RESPONSE:', responseText)

    if (!response.ok) {
      console.error(
        'LOG ACTIVITY ERROR:',
        `HTTP ${response.status} ${response.statusText} - ${responseText}`
      )

      return false
    }

    console.log('LOG ACTIVITY BERHASIL')

    return true
  } catch (error: any) {
    console.error(
      'LOG ACTIVITY EXCEPTION:',
      error?.message || String(error)
    )

    return false
  }
}
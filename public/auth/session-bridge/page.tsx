'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'

function SessionBridgeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    async function activateSession() {
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')
      const redirectPath = searchParams.get('redirect') || '/'

      if (!accessToken || !refreshToken) {
        setError('Token akses tidak ditemukan.')
        return
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (setSessionError) {
        console.error('Gagal mengaktifkan sesi:', setSessionError)
        setError('Gagal mengaktifkan sesi login.')
        return
      }

      // Ganti history supaya token tidak tertinggal di URL / tombol back
      router.replace(redirectPath)
    }

    activateSession()
  }, [searchParams, router])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-[#2b2540]">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-[#2b2540]">
      <p className="text-sm text-gray-400">Membuka halaman...</p>
    </div>
  )
}

export default function SessionBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-[#2b2540]">
          Memuat...
        </div>
      }
    >
      <SessionBridgeContent />
    </Suspense>
  )
}
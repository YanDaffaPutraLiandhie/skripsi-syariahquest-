import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Inisialisasi Supabase khusus untuk Proxy (baca dari Cookies)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Cek apakah user sedang login saat ini berdasarkan Cookies
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // =======================================================
  // 1. BLOKIR USER YANG BELUM LOGIN MAU MASUK HALAMAN DALAM
  // =======================================================
  const protectedRoutes = [
    '/dashboard', 
    '/arena', 
    '/modul', 
    '/profile', 
    '/leaderboard', 
    '/kuis',
    '/admin',
    '/dosen'
  ]
  
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute && !user) {
    // Tendang ke halaman login dan bawa parameter URL tujuan
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // =======================================================
  // 2. BLOKIR USER YANG UDAH LOGIN TAPI ISENG BUKA /login
  // =======================================================
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password')
  
  if (isAuthRoute && user) {
    // Kalau udah login tapi buka halaman login, tendang balik ke dashboard
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard' 
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

// Konfigurasi rute mana aja yang harus dicek
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
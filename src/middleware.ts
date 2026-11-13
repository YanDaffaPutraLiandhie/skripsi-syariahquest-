import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  SESSION_ACTIVITY_COOKIE,
  SESSION_IDLE_TIMEOUT_MS,
} from '@/lib/sessionActivity'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Konfigurasi Supabase middleware tidak lengkap: periksa NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    )
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              supabaseResponse.cookies.set(
                name,
                value,
                options
              )
            }
          )
        },
      },
    }
  )

  // =====================================================
  // CEK SESSION SUPABASE
  // =====================================================

  let user = null
  let authError = null

  try {
    const result = await supabase.auth.getUser()
    user = result.data?.user ?? null
    authError = result.error ?? null
  } catch (err) {
    console.error("PROXY: getUser gagal:", err)
    authError = err instanceof Error ? err : new Error("Unknown auth error")
  }

  const { pathname } = request.nextUrl

  console.log('======================================')
  console.log('SUPABASE PROXY')
  console.log('PATH:', pathname)
  console.log(
    'USER:',
    user ? user.id : 'TIDAK ADA'
  )

  if (authError) {
    console.log(
      'AUTH ERROR:',
      authError.message
    )
  }

  console.log('======================================')

  // =====================================================
  // PUBLIC ROUTES
  // =====================================================

  const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/update-password',
    '/auth/session-bridge',
    '/api/register',
  ]

  const isPublicRoute = publicRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  )

  // =====================================================
  // PROTECTED ROUTES
  // =====================================================

  const isApiRoute = pathname === '/api' || pathname.startsWith('/api/')
  const isNextInternalRoute = pathname.startsWith('/_next/')
  const isProtectedRoute =
    !isPublicRoute && !isNextInternalRoute

  // =====================================================
  // USER BELUM LOGIN
  // =====================================================

  if (isProtectedRoute && !user) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log(
      'PROXY: USER BELUM LOGIN'
    )

    console.log(
      'PROXY: REDIRECT KE LOGIN DENGAN TARGET:',
      pathname
    )

    const loginUrl = new URL(
      '/login',
      request.url
    )

    loginUrl.searchParams.set(
      'redirect',
      pathname
    )

    return NextResponse.redirect(
      loginUrl
    )
  }

  if (isProtectedRoute && user) {
    const lastActivity = Number(
      request.cookies.get(SESSION_ACTIVITY_COOKIE)?.value
    )
    const hasValidActivity =
      Number.isFinite(lastActivity) &&
      lastActivity > 0 &&
      lastActivity <= Date.now() &&
      Date.now() - lastActivity < SESSION_IDLE_TIMEOUT_MS

    if (!hasValidActivity) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('reason', 'idle')
      const { error: signOutError } = await supabase.auth.signOut({
        scope: 'local',
      })
      if (signOutError) {
        console.error(
          'Gagal menghapus sesi yang kedaluwarsa:',
          signOutError.message
        )
      }

      const response = isApiRoute
        ? NextResponse.json(
            { error: 'Session expired' },
            { status: 401 }
          )
        : NextResponse.redirect(loginUrl)

      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith('sb-')) {
          response.cookies.set(name, '', { path: '/', maxAge: 0 })
        }
      })
      response.cookies.set(SESSION_ACTIVITY_COOKIE, '', {
        path: '/',
        maxAge: 0,
      })

      return response
    }
  }

  // =====================================================
  // USER SUDAH LOGIN - Redirect old routes to new /mahasiswa/ routes
  // =====================================================

  if (user) {
    console.log(
      'PROXY: USER SUDAH LOGIN:',
      user.email
    )

    // Redirect old mahasiswa routes to new /mahasiswa/ prefix
    const oldMahasiswaRoutes = [
      { from: '/dashboard', to: '/mahasiswa/dashboard' },
      { from: '/arena', to: '/mahasiswa/arena' },
      { from: '/modul', to: '/mahasiswa/modul' },
      { from: '/profile', to: '/mahasiswa/profile' },
      { from: '/leaderboard', to: '/mahasiswa/leaderboard' },
      { from: '/kuis', to: '/mahasiswa/kuis' },
      { from: '/play', to: '/mahasiswa/play' },
      { from: '/join', to: '/mahasiswa/join' },
    ]

    for (const route of oldMahasiswaRoutes) {
      if (pathname === route.from || pathname.startsWith(route.from + '/')) {
        const newPath = pathname.replace(route.from, route.to)
        console.log('PROXY: REDIRECT OLD ROUTE', pathname, '->', newPath)
        return NextResponse.redirect(new URL(newPath, request.url))
      }
    }
  }

  /*
   * PENTING:
   *
   * Jangan redirect user yang sudah login
   * dari /login ke /dashboard.
   *
   * Role Admin/Dosen/Mahasiswa ditentukan
   * di login/page.tsx.
   */

  return supabaseResponse
}

// =======================================================
// MATCHER
// =======================================================

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
}

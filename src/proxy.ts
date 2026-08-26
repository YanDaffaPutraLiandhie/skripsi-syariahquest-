import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

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
  ]

  const isPublicRoute = publicRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  )

  // =====================================================
  // PROTECTED ROUTES
  // =====================================================

  const protectedRoutes = [
    '/dashboard',
    '/arena',
    '/modul',
    '/profile',
    '/leaderboard',
    '/kuis',

    // ADMIN
    '/admin',

    // DOSEN
    '/Dosen',
    '/dosen',
  ]

  const isProtectedRoute = protectedRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  )

  // =====================================================
  // USER BELUM LOGIN
  // =====================================================

  if (isProtectedRoute && !user) {
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

  // =====================================================
  // USER SUDAH LOGIN
  // =====================================================

  if (user) {
    console.log(
      'PROXY: USER SUDAH LOGIN:',
      user.email
    )
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
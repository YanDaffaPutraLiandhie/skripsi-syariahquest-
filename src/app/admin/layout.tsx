'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  usePathname,
  useRouter,
} from 'next/navigation'
import {
  ReactNode,
  useEffect,
  useState,
} from 'react'

import { supabase } from '@/lib/supabase'

import {
  Home,
  BookOpen,
  Share2,
  Gamepad2,
  Award,
  BarChart3,
  ScrollText,
  User,
  LogOut,
  CircleUserRound,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Diamond,
  Star,
  Shield,
  Hexagon,
  Trophy,
  Zap,
} from 'lucide-react'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({
  children,
}: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [isCollapsed, setIsCollapsed] =
    useState(false)

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false)

  const [checkingSession, setCheckingSession] =
    useState(true)

  // =====================================================
  // CEK STATUS AKTIF USER
  // =====================================================

  async function checkStatusAktif(
    userId: string
  ): Promise<boolean> {
    try {
      const {
        data: userRow,
        error,
      } = await supabase
        .from('user')
        .select('is_aktif')
        .eq('auth_user_id', userId)
        .maybeSingle()

      if (error) {
        console.error(
          'CHECK STATUS AKTIF ERROR:',
          error.message
        )

        /*
         * Jangan langsung menendang user
         * kalau terjadi error database/network.
         */
        return true
      }

      if (!userRow) {
        console.error(
          'USER ROW TIDAK DITEMUKAN'
        )

        return false
      }

      return userRow.is_aktif !== false
    } catch (error) {
      console.error(
        'CHECK STATUS AKTIF EXCEPTION:',
        error
      )

      return true
    }
  }

  // =====================================================
  // CEK SESSION
  // =====================================================

  useEffect(() => {
    let mounted = true

    async function checkSession() {
      try {
        console.log(
          'ADMIN LAYOUT: CEK SESSION...'
        )

        const {
          data,
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error(
            'GET SESSION ERROR:',
            error.message
          )

          if (mounted) {
            setCheckingSession(false)
          }

          return
        }

        const session = data.session

        console.log(
          'ADMIN LAYOUT SESSION:',
          session
            ? session.user.email
            : 'TIDAK ADA'
        )

        // =================================================
        // SESSION TIDAK ADA
        // =================================================

        if (!session) {
          console.log(
            'ADMIN LAYOUT: SESSION TIDAK ADA - REDIRECT KE LOGIN'
          )

          if (mounted) {
            setCheckingSession(false)
          }

          router.replace('/login?redirect=/admin')
          return
        }

        // =================================================
        // CEK STATUS AKTIF
        // =================================================

        const masihAktif =
          await checkStatusAktif(
            session.user.id
          )

        if (!mounted) {
          return
        }

        if (!masihAktif) {
          console.log(
            'ADMIN LAYOUT: AKUN TIDAK AKTIF - REDIRECT KE LOGIN'
          )

          if (mounted) {
            setCheckingSession(false)
          }

          router.replace('/login?redirect=/admin')
          return
        }

        console.log(
          'ADMIN LAYOUT: SESSION VALID'
        )

        setCheckingSession(false)
      } catch (error) {
        console.error(
          'ADMIN SESSION CHECK ERROR:',
          error
        )

        if (mounted) {
          setCheckingSession(false)
        }
      }
    }

    checkSession()

    // ===================================================
    // MONITOR AUTH CHANGE
    // ===================================================

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log(
            'ADMIN AUTH EVENT:',
            event
          )

          /*
           * Hanya SIGNED_OUT yang langsung
           * menyebabkan redirect.
           */
          if (
            event === 'SIGNED_OUT'
          ) {
            console.log(
              'ADMIN AUTH EVENT SIGNED_OUT - REDIRECT KE LOGIN'
            )
            router.replace('/login?redirect=/admin')
          }

          /*
           * Jangan melakukan redirect pada
           * INITIAL_SESSION.
           *
           * Karena checkSession() sudah
           * menangani pengecekan awal.
           */
        }
      )

    // ===================================================
    // CLEANUP
    // ===================================================

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [router])





  // =====================================================
  // LOGOUT
  // =====================================================

  async function handleLogout() {
    try {
      console.log(
        'ADMIN LOGOUT...'
      )

      await supabase.auth.signOut()

      router.replace('/login')
    } catch (error) {
      console.error(
        'LOGOUT ERROR:',
        error
      )
    }
  }

  // =====================================================
  // MENU
  // =====================================================

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: Home,
    },
    {
      name: 'Manajemen User',
      href: '/admin/users',
      icon: BookOpen,
    },
    {
      name: 'Manajemen Modul',
      href: '/admin/modul',
      icon: Share2,
    },
    {
      name: 'Manajemen Game',
      href: '/admin/game',
      icon: Gamepad2,
    },
    {
      name: 'Manajemen Badges',
      href: '/admin/badges',
      icon: Award,
    },
    {
      name: 'Bank Soal',
      href: '/admin/bank-soal',
      icon: BarChart3,
    },
    {
      name: 'Log Activity',
      href: '/admin/log-activity',
      icon: ScrollText,
    },
    {
      name: 'Profil',
      href: '/admin/profil',
      icon: User,
    },
  ]

  // =====================================================
  // LOADING SESSION
  // =====================================================

  if (checkingSession) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Memeriksa sesi...
      </div>
    )
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className={`admin-layout ${isCollapsed
        ? 'sidebar-collapsed'
        : ''
        }`}
    >

      {/* =================================================
          TOGGLE SIDEBAR
      ================================================= */}

      <button
        type="button"
        className={`sidebar-external-toggle ${isCollapsed
          ? 'collapsed'
          : ''
          }`}
        onClick={() =>
          window.matchMedia('(max-width: 700px)').matches
            ? setIsMobileMenuOpen((prev) => !prev)
            : setIsCollapsed((prev) => !prev)
        }
        aria-label={
          isCollapsed
            ? 'Buka sidebar'
            : 'Tutup sidebar'
        }
      >
        {isCollapsed ? (
          <ChevronRight
            size={16}
          />
        ) : (
          <ChevronLeft
            size={16}
          />
        )}
      </button>

      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Tutup menu admin"
          onClick={() => setIsMobileMenuOpen(false)}
          className="admin-mobile-backdrop"
        />
      )}

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`sidebar ${isCollapsed
          ? 'collapsed'
          : ''
          } ${isMobileMenuOpen ? 'mobile-open' : ''}`}
      >

        {/* LOGO */}

        <div className="sidebar-header">
          <Image
         src="/images/logo.svg"
            alt="Syariah Quest"
            width={56}
            height={56}
            className="sidebar-logo"
          />
        </div>

        {/* MENU */}

        <nav className="sidebar-menu">

          {menuItems.map(
            (item) => {
              const Icon =
                item.icon

              const isActive =
                pathname ===
                item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={
                    isActive
                      ? 'menu-item active'
                      : 'menu-item'
                  }
                >

                  <span className="menu-icon">
                    <Icon
                      size={19}
                      strokeWidth={2}
                    />
                  </span>

                  <span>
                    {item.name}
                  </span>

                </Link>
              )
            }
          )}

        </nav>

        {/* LOGOUT */}

        <div className="sidebar-footer">

          <button
            type="button"
            onClick={handleLogout}
            className="logout-button"
          >

            <span className="menu-icon">
              <LogOut
                size={18}
                strokeWidth={2}
              />
            </span>

            <span>
              LogOut
            </span>

          </button>

        </div>

      </aside>

      {/* =================================================
          MAIN AREA
      ================================================= */}


      <div
        className={`main-area ${isCollapsed
          ? 'full-width'
          : ''
          }`}
      >

        {/* =================================================
            NAVBAR
        ================================================= */}

        <header className="top-navbar">

          {pathname !== "/admin" && (
            <button
              type="button"
              className="icon-button"
              aria-label="Kembali ke halaman sebelumnya"
              onClick={() => router.back()}
            >
              <ArrowLeft size={22} strokeWidth={1.8} />
            </button>
          )}

          <div className="navbar-icons">

            {/* PROFILE */}
            <button
              type="button"
              className="icon-button"
              aria-label="Profile"
              onClick={() =>
                router.push('/admin/profil')
              }
            >
              <CircleUserRound
                size={24}
                strokeWidth={1.8}
              />
            </button>

          </div>

        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="content relative isolate overflow-hidden min-h-[calc(100vh-80px)]">
          {/* =========================================================================
              DECORATIVE SVG & SHAPES BACKGROUND LAYER (Rich Visual FX)
          ========================================================================= */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            {/* Ambient Gradient Glows */}
            <div className="absolute -left-20 -top-16 h-80 w-80 rounded-full bg-[#8a80b8]/30 blur-3xl" />
            <div className="absolute right-[-4rem] top-1/3 h-72 w-72 rounded-full bg-amber-200/50 blur-3xl" />
            <div className="absolute bottom-[-3rem] left-1/4 h-64 w-64 rounded-full bg-[#4a3f7a]/15 blur-3xl" />
            <div className="absolute right-10 bottom-10 h-72 w-72 rounded-full bg-purple-300/30 blur-3xl" />

            {/* Dot Matrix Pattern SVGs */}
            <div className="absolute left-6 top-24 opacity-30">
              <svg width="100" height="100" fill="none" viewBox="0 0 100 100">
                <pattern id="admin-dot-grid-1" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="3" cy="3" r="2" className="fill-[#4a3f7a]" />
                </pattern>
                <rect width="100" height="100" fill="url(#admin-dot-grid-1)" />
              </svg>
            </div>

            <div className="absolute right-10 top-72 opacity-25">
              <svg width="120" height="120" fill="none" viewBox="0 0 120 120">
                <pattern id="admin-dot-grid-2" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="4" cy="4" r="2.5" className="fill-[#8a80b8]" />
                </pattern>
                <rect width="120" height="120" fill="url(#admin-dot-grid-2)" />
              </svg>
            </div>

            {/* Floating Geometric SVGs & Icons */}
            <Diamond className="absolute left-[6%] top-[18%] h-6 w-6 rotate-12 text-[#8a80b8]/50 animate-pulse" strokeWidth={2.5} />
            <div className="absolute left-[14%] top-[12%] h-7 w-7 rounded-full border-2 border-dashed border-[#4a3f7a]/30 animate-spin-slow" />
            <Star className="absolute right-[7%] top-[16%] h-5 w-5 rotate-12 fill-amber-300/60 text-amber-400/80" />
            <Shield className="absolute right-[14%] top-[24%] h-6 w-6 text-[#8a80b8]/40 -rotate-12" strokeWidth={1.8} />
            <BookOpen className="absolute left-[3%] top-[48%] h-7 w-7 text-[#4a3f7a]/30 rotate-6" strokeWidth={1.8} />
            <Hexagon className="absolute left-[12%] top-[54%] h-8 w-8 text-amber-300/40 rotate-45" strokeWidth={2} />
            <Trophy className="absolute right-[4%] top-[52%] h-7 w-7 text-amber-400/50 -rotate-12" strokeWidth={1.8} />
            
            <div className="absolute right-[12%] top-[60%] opacity-40">
              <svg width="80" height="40" viewBox="0 0 80 40" fill="none">
                <path d="M0 20 Q 20 5, 40 20 T 80 20" stroke="#8a80b8" strokeWidth="3" strokeLinecap="round" fill="none" />
              </svg>
            </div>

            <Award className="absolute left-[8%] bottom-16 h-8 w-8 text-purple-400/40 rotate-12" strokeWidth={1.8} />
            <Zap className="absolute right-[15%] bottom-20 h-6 w-6 text-amber-400/60 -rotate-12" strokeWidth={2} />

            <span className="absolute left-[20%] bottom-8 h-4 w-4 rotate-45 rounded-[4px] border-2 border-[#8a80b8]/40" />
            <span className="absolute right-[22%] bottom-12 h-3.5 w-3.5 rounded-full bg-amber-400/50" />
            <span className="absolute left-[35%] bottom-5 h-2.5 w-2.5 rounded-full bg-[#4a3f7a]/30" />
            <span className="absolute right-[38%] top-16 h-3 w-3 rotate-12 rounded-[3px] bg-purple-300/50" />

            {/* Big Concentric Background Circles (Bottom Right) */}
            <div className="absolute right-[-6rem] bottom-[-6rem] opacity-20">
              <svg width="340" height="340" viewBox="0 0 340 340" fill="none">
                <circle cx="170" cy="170" r="160" stroke="#4a3f7a" strokeWidth="2" strokeDasharray="8 8" />
                <circle cx="170" cy="170" r="120" stroke="#8a80b8" strokeWidth="2" />
                <circle cx="170" cy="170" r="80" stroke="#f2c94c" strokeWidth="2" strokeDasharray="6 6" />
              </svg>
            </div>

            {/* Big Concentric Background Circles (Top Left) */}
            <div className="absolute left-[-5rem] top-[-5rem] opacity-20">
              <svg width="280" height="280" viewBox="0 0 280 280" fill="none">
                <circle cx="140" cy="140" r="130" stroke="#4a3f7a" strokeWidth="2" />
                <circle cx="140" cy="140" r="90" stroke="#8a80b8" strokeWidth="2" strokeDasharray="6 6" />
              </svg>
            </div>
          </div>

          <div className="relative z-10">
            {children}
          </div>
        </main>

      </div>

    </div>
  )
}
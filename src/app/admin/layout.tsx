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
  Bell,
  CircleUserRound,
  ChevronLeft,
  ChevronRight,
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
            'ADMIN LAYOUT: SESSION TIDAK ADA'
          )

          if (mounted) {
            setCheckingSession(false)
          }

          router.replace('/login')

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
            'ADMIN LAYOUT: AKUN TIDAK AKTIF'
          )

          await supabase.auth.signOut()

          router.replace(
            '/login?nonaktif=1'
          )

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
            router.replace('/login')
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
  // CEK STATUS SETIAP 30 DETIK
  // =====================================================

  useEffect(() => {
    const intervalId =
      setInterval(async () => {
        try {
          const {
            data,
            error,
          } =
            await supabase.auth.getSession()

          if (error) {
            console.error(
              'PERIODIC SESSION ERROR:',
              error.message
            )

            return
          }

          const session =
            data.session

          if (!session) {
            router.replace('/login')
            return
          }

          const masihAktif =
            await checkStatusAktif(
              session.user.id
            )

          if (!masihAktif) {
            await supabase.auth.signOut()

            router.replace(
              '/login?nonaktif=1'
            )
          }
        } catch (error) {
          console.error(
            'PERIODIC STATUS ERROR:',
            error
          )
        }
      }, 30000)

    return () => {
      clearInterval(intervalId)
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
      className={`admin-layout ${
        isCollapsed
          ? 'sidebar-collapsed'
          : ''
      }`}
    >

      {/* =================================================
          TOGGLE SIDEBAR
      ================================================= */}

      <button
        type="button"
        className={`sidebar-external-toggle ${
          isCollapsed
            ? 'collapsed'
            : ''
        }`}
        onClick={() =>
          setIsCollapsed(
            (prev) => !prev
          )
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

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`sidebar ${
          isCollapsed
            ? 'collapsed'
            : ''
        }`}
      >

        {/* LOGO */}

        <div className="sidebar-header">
          <Image
            src="/logo.png"
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
        className={`main-area ${
          isCollapsed
            ? 'full-width'
            : ''
        }`}
      >

        {/* =================================================
            NAVBAR
        ================================================= */}

        <header className="top-navbar">

          <div className="navbar-icons">

            {/* NOTIFICATION */}

            <button
              type="button"
              className="icon-button"
              aria-label="Notifications"
            >
              <Bell
                size={22}
                strokeWidth={1.8}
              />
            </button>

            {/* PROFILE */}

            <button
              type="button"
              className="icon-button"
              aria-label="Profile"
              onClick={() =>
                router.push(
                  '/admin/profil'
                )
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

        <main className="content">
          {children}
        </main>

      </div>

    </div>
  )
}
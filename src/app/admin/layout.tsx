'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'
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
  Mail,
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

  const [isCollapsed, setIsCollapsed] = useState(false)

  /*
  |--------------------------------------------------------------------------
  | CEK SESSION LOGIN + STATUS AKTIF
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    async function checkStatusAktif(userId: string): Promise<boolean> {
      // TODO: sesuaikan nama tabel/kolom kalau skema Anda beda
      const { data: userRow, error } = await supabase
        .from('user')
        .select('is_aktif')
        .eq('auth_user_id', userId)
        .single()

      if (error) {
        console.error(
          'CHECK STATUS AKTIF ERROR:',
          JSON.stringify({ message: error.message })
        )
        // Kalau gagal cek (mis. masalah jaringan sesaat), jangan langsung
        // tendang user — anggap aktif dan coba lagi di polling berikutnya
        return true
      }

      return userRow?.is_aktif !== false
    }

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const masihAktif = await checkStatusAktif(session.user.id)

      if (!masihAktif) {
        await supabase.auth.signOut()
        router.replace('/login?nonaktif=1')
      }
    }

    checkSession()

    // Cek ulang tiap 30 detik selama admin sedang aktif memakai sistem.
    // Ini yang bikin user langsung "tertendang" kalau statusnya diubah
    // jadi Nonaktif SAAT sedang login, bukan cuma dicek pas awal buka halaman.
    const intervalId = setInterval(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) return

      const masihAktif = await checkStatusAktif(session.user.id)

      if (!masihAktif) {
        await supabase.auth.signOut()
        router.replace('/login?nonaktif=1')
      }
    }, 30000)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.replace('/login')
      }
    })

    return () => {
      clearInterval(intervalId)
      subscription.unsubscribe()
    }
  }, [router])

  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const menuItems = [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'Manajemen User', href: '/admin/users', icon: BookOpen },
    { name: 'Manajemen Modul', href: '/admin/modul', icon: Share2 },
    { name: 'Manajemen Game', href: '/admin/game', icon: Gamepad2 },
    { name: 'Manajemen Badges', href: '/admin/badges', icon: Award },
    { name: 'Bank Soal', href: '/admin/bank-soal', icon: BarChart3 },
    { name: 'Log Activity', href: '/admin/log-activity', icon: ScrollText },
    { name: 'Profil', href: '/admin/profil', icon: User },
  ]

  return (
    <div className={`admin-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>

      {/* TOMBOL TOGGLE — mengambang di luar sidebar, tetap terlihat
          baik saat sidebar terbuka maupun tertutup */}
      <button
        className={`sidebar-external-toggle ${isCollapsed ? 'collapsed' : ''}`}
        onClick={() => setIsCollapsed((prev) => !prev)}
        aria-label={isCollapsed ? 'Buka sidebar' : 'Tutup sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight size={16} />
        ) : (
          <ChevronLeft size={16} />
        )}
      </button>

      {/* SIDEBAR */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
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
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

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

                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* LOGOUT */}
        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            className="logout-button"
          >
            <span className="menu-icon">
              <LogOut
                size={18}
                strokeWidth={2}
              />
            </span>

            <span>LogOut</span>
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className={`main-area ${isCollapsed ? 'full-width' : ''}`}>

        {/* NAVBAR */}
        <header className="top-navbar">

          <input
            type="text"
            className="search-input"
            placeholder="Search"
          />

          <div className="navbar-icons">

            <button
              className="icon-button"
              aria-label="Messages"
            >
              <Mail
                size={22}
                strokeWidth={1.8}
              />
            </button>

            <button
              className="icon-button"
              aria-label="Notifications"
            >
              <Bell
                size={22}
                strokeWidth={1.8}
              />
            </button>

            <button
              className="icon-button"
              aria-label="Profile"
            >
              <CircleUserRound
                size={24}
                strokeWidth={1.8}
              />
            </button>

          </div>

        </header>

        {/* CONTENT */}
        <main className="content">
          {children}
        </main>

      </div>
    </div>
  )
}

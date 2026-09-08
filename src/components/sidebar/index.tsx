"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Suspense,
  useState,
} from "react";

type SidebarNavIcon =
  | "home"
  | "book"
  | "flag"
  | "chart"
  | "user"
  | "help";

type SidebarNavItem = {
  label: string;
  icon: SidebarNavIcon;
  href?: string;
};

type SidebarProps = {
  activeLabel?: string;
  navItems?: SidebarNavItem[];
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (val: boolean) => void;
};

const DEFAULT_NAV_ITEMS: SidebarNavItem[] = [
  {
    label: "Dashboard",
    icon: "home",
    href: "/Dosen/Dashboard",
  },
  {
    label: "Modul Pembelajaran",
    icon: "book",
    href: "/Dosen/modul",
  },
  {
    label: "Leaderboard",
    icon: "chart",
    href: "/Dosen/leaderboard",
  },
  {
    label: "Profil",
    icon: "user",
    href: "/Dosen/profil_dosen",
  },
  {
    label: "Bank Soal",
    icon: "help",
    href: "/Dosen/bank_soal",
  },
  {
    label: "Kuis",
    icon: "help",
    href: "/Dosen/kuis",
  },
];

function NavIcon({
  name,
}: {
  name: SidebarNavIcon;
}) {
  const common =
    "h-[18px] w-[18px] shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.15)]";

  switch (name) {
    case "home":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8z" />
        </svg>
      );

    case "book":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13zM20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13z" />
        </svg>
      );

    case "flag":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M5 3v18M5 4h11l-2.5 4L16 12H5" />
        </svg>
      );

    case "chart":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M5 20V10M12 20V4M19 20v-7" />
        </svg>
      );

    case "user":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle
            cx="12"
            cy="8"
            r="3.5"
          />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
      );

    case "help":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
          />

          <path d="M9.5 9.2a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .8-1 1.5" />

          <circle
            cx="12"
            cy="16.5"
            r=".6"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );

    default:
      return null;
  }
}

/* =========================================================
   KOMPONEN NAVIGASI
   ========================================================= */

function SidebarContent({
  activeLabel,
  navItems,
  collapsed,
  toggle,
  handleLogout,
  isMobileOpen,
  setIsMobileOpen,
}: {
  activeLabel: string;
  navItems: SidebarNavItem[];
  collapsed: boolean;
  toggle: () => void;
  handleLogout: () => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (val: boolean) => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`
        fixed
        left-0
        top-0
        z-50
        flex
        h-screen
        flex-col
        border-r
        border-secondary/30
        bg-sidebar
        transition-all
        duration-300
        ${collapsed ? "w-20" : "w-64"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
    >
      {/* =====================================================
          BUTTON COLLAPSE
      ===================================================== */}

      <button
        type="button"
        onClick={toggle}
        aria-label={
          collapsed
            ? "Buka sidebar"
            : "Tutup sidebar"
        }
        className="
          absolute
          -right-3
          top-8
          z-50
          rounded-full
          border
          border-secondary/30
          bg-white
          p-1
          text-primary
          shadow-md
          transition-transform
          hover:scale-110
          hover:bg-secondary/10
        "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`
            h-4
            w-4
            transition-transform
            duration-300
            ${collapsed ? "rotate-180" : ""}
          `}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* =====================================================
          LOGO
      ===================================================== */}

      <div
        className={`
          flex
          items-center
          p-8
          transition-all
          ${collapsed ? "justify-center px-0" : ""}
        `}
      >
        <h1
          className="
            whitespace-nowrap
            overflow-hidden
            text-xl
            font-extrabold
            tracking-wide
            text-primary
          "
        >
          {collapsed
            ? "SQ"
            : "SYARIAH-QUEST"}
        </h1>
      </div>

      {/* =====================================================
          NAVIGASI
      ===================================================== */}

      <nav className="mt-4 flex flex-col gap-2 px-4">
        {navItems.map((item) => {
          const href = item.href ?? "#";

          /*
           * Jangan hanya menggunakan:
           *
           * pathname === href
           *
           * karena halaman seperti:
           *
           * /Dosen/modul/tambah_modul
           *
           * seharusnya tetap dianggap berada di
           * menu Modul Pembelajaran.
           */

          const isActive =
            pathname === href ||
            (href !== "/" &&
              pathname.startsWith(
                `${href}/`
              ));

          return (
            <Link
              href={href}
              onClick={() => setIsMobileOpen?.(false)}
              key={item.label}
              title={item.label}
              className={`
                flex
                items-center
                rounded-md
                p-3
                transition-all
                ${
                  collapsed
                    ? "justify-center"
                    : "gap-3"
                }
                ${
                  isActive ||
                  activeLabel ===
                    item.label
                    ? "bg-secondary/10 font-bold text-primary"
                    : "font-medium text-gray-400 hover:bg-secondary/10 hover:text-primary"
                }
              `}
            >
              <NavIcon
                name={item.icon}
              />

              {!collapsed && (
                <span className="whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* =====================================================
          LOGOUT
      ===================================================== */}

      <div className="mt-auto mb-4 flex justify-center p-4">
        <button
          type="button"
          onClick={handleLogout}
          title="LogOut"
          className={`
            flex
            items-center
            justify-center
            bg-secondary
            font-bold
            text-primary
            transition-all
            hover:bg-primary
            hover:text-white
            ${
              collapsed
                ? "h-12 w-12 rounded-xl p-0"
                : "w-full gap-2 rounded-lg px-4 py-2"
            }
          `}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="
              h-5
              w-5
              shrink-0
              rotate-180
            "
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>

          {!collapsed && (
            <span>LogOut</span>
          )}
        </button>
      </div>
    </aside>
  );
}

/* =========================================================
   FALLBACK SIDEBAR
   ========================================================= */

function SidebarFallback({
  collapsed,
}: {
  collapsed: boolean;
}) {
  return (
    <aside
      className={`
        fixed
        left-0
        top-0
        z-50
        flex
        h-screen
        flex-col
        border-r
        border-secondary/30
        bg-sidebar
        ${
          collapsed
            ? "w-20"
            : "w-64"
        }
      `}
    >
      <div
        className={`
          flex
          items-center
          p-8
          ${
            collapsed
              ? "justify-center px-0"
              : ""
          }
        `}
      >
        <h1 className="whitespace-nowrap text-xl font-extrabold tracking-wide text-primary">
          {collapsed
            ? "SQ"
            : "SYARIAH-QUEST"}
        </h1>
      </div>
    </aside>
  );
}

/* =========================================================
   SIDEBAR UTAMA
   ========================================================= */

export default function Sidebar({
  activeLabel = "Dashboard",
  navItems = DEFAULT_NAV_ITEMS,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const router = useRouter();

  /*
   * Jika parent mengontrol collapse:
   * gunakan nilai dari parent.
   *
   * Jika tidak:
   * gunakan state internal.
   */
  const [internalCollapsed, setInternalCollapsed] =
    useState(false);

  const collapsed =
    typeof isCollapsed === "boolean"
      ? isCollapsed
      : internalCollapsed;

  const toggle = () => {
    const newValue = !collapsed;

    if (setIsCollapsed) {
      setIsCollapsed(newValue);
    } else {
      setInternalCollapsed(newValue);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Gagal logout:",
          error.message
        );

        alert(
          "Gagal logout, coba lagi."
        );

        return;
      }

      router.push("/login");
    } catch (error) {
      console.error(
        "Error logout:",
        error
      );

      alert(
        "Terjadi kesalahan saat logout."
      );
    }
  };

  return (
    <Suspense
      fallback={
        <SidebarFallback
          collapsed={collapsed}
        />
      }
    >
      <SidebarContent
        activeLabel={activeLabel}
        navItems={navItems}
        collapsed={collapsed}
        toggle={toggle}
        handleLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
    </Suspense>
  );
}
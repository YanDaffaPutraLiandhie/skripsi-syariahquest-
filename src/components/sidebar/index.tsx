"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; // Wajib import supabase
import { useState } from "react";

type SidebarNavIcon = "home" | "book" | "flag" | "chart" | "user" | "help";

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
};

const DEFAULT_NAV_ITEMS: SidebarNavItem[] = [
  { label: "Dashboard", icon: "home", href: "/Dosen/Dashboard" },
  { label: "Modul Pembelajaran", icon: "book", href: "/Dosen/modul" },
  { label: "Leaderboard", icon: "chart", href: "/Dosen/leaderboard" },
  { label: "Profil", icon: "user", href: "/Dosen/profil_dosen" },
  { label: "Bank Soal", icon: "help", href: "/Dosen/bank_soal" },
  { label: "Kuis", icon: "help", href: "/Dosen/kuis" },
];

function NavIcon({ name }: { name: SidebarNavIcon }) {
  const common = "h-[18px] w-[18px] shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.15)]";

  switch (name) {
    case "home":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8z" />
        </svg>
      );

    case "book":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13zM20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13z" />
        </svg>
      );

    case "flag":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 3v18M5 4h11l-2.5 4L16 12H5" />
        </svg>
      );

    case "chart":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 20V10M12 20V4M19 20v-7" />
        </svg>
      );

    case "user":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
      );

    case "help":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.2a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .8-1 1.5" />
          <circle cx="12" cy="16.5" r=".6" fill="currentColor" stroke="none" />
        </svg>
      );

    default:
      return null;
  }
}

export default function Sidebar({
  activeLabel = "Dashboard",
  navItems = DEFAULT_NAV_ITEMS,
  isCollapsed = false,
  setIsCollapsed,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(isCollapsed);

  const collapsed = isCollapsed ?? internalCollapsed;

  const toggle = () => {
    if (typeof setIsCollapsed === "function") setIsCollapsed(!collapsed);
    else setInternalCollapsed(!collapsed);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) router.push('/login');
    else {
      console.error('Gagal logout:', error.message);
      alert('Gagal logout, coba lagi.');
    }
  };

  return (
    <aside
      className={`h-screen bg-sidebar border-r border-secondary/30 flex flex-col fixed left-0 top-0 transition-all duration-300 z-50 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <button
        onClick={toggle}
        className="absolute -right-3 top-8 bg-white border border-secondary/30 rounded-full p-1 text-primary hover:bg-secondary/10 shadow-md z-50 transition-transform hover:scale-110"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className={`p-8 flex items-center transition-all ${collapsed ? 'justify-center px-0' : ''}`}>
        <h1 className="text-xl font-extrabold text-primary tracking-wide whitespace-nowrap overflow-hidden">
          {collapsed ? 'SQ' : 'SYARIAH-QUEST'}
        </h1>
      </div>

      <nav className="flex flex-col gap-2 px-4 mt-4">
        {navItems.map((item) => (
          <Link
            href={item.href ?? '#'}
            key={item.label}
            className={`flex items-center p-3 rounded-md transition-all ${collapsed ? 'justify-center' : 'gap-3'} ${pathname === item.href ? 'text-primary font-bold bg-secondary/10' : 'text-gray-400 font-medium hover:text-primary hover:bg-secondary/10'}`}
            title={item.label}
          >
            <NavIcon name={item.icon} />
            {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="mt-auto p-4 mb-4 flex justify-center">
        <button
          onClick={handleLogout}
          className={`flex items-center justify-center text-primary font-bold bg-secondary hover:bg-primary hover:text-white transition-all ${
            collapsed ? 'w-12 h-12 rounded-xl p-0' : 'w-full gap-2 px-4 py-2 rounded-lg'
          }`}
          title="LogOut"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-180 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span>LogOut</span>}
        </button>
      </div>
    </aside>
  );
}
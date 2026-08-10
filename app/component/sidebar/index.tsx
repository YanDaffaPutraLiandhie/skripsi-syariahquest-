"use client";

import { useRouter } from "next/navigation";

type SidebarNavIcon = "home" | "book" | "flag" | "chart" | "user" | "help";

type SidebarNavItem = {
  label: string;
  icon: SidebarNavIcon;
  href?: string;
};

type SidebarProps = {
  activeLabel?: string;
  navItems?: SidebarNavItem[];
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
}: SidebarProps) {
  const router = useRouter();

  return (
    <aside className="w-[220px] shrink-0 border-r border-[#ececf3] bg-white p-6">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => item.href && router.push(item.href)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors ${
              item.label === activeLabel
                ? "bg-[#f2effa] font-semibold text-[#4a3f7a]"
                : "text-[#c9c6d6] hover:bg-[#f7f6fb] hover:text-[#4a3f7a]"
            }`}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </button>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => router.push("/")}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f2effa] px-4 py-2.5 text-sm font-semibold text-[#4a3f7a]"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5M21 12H9" />
        </svg>
        LogOut
      </button>
    </aside>
  );
}
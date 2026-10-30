"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getSelectedMentor, MentorCharacter } from "@/constants/mentors";
import CharacterSelectionModal from "@/components/visual-novel/CharacterSelectionModal";
import {
  LogOut,
  Coins,
  Award,
  Sparkles,
  Map as MapIcon,
  BookOpen,
  Gamepad2,
  Trophy,
  User,
  Zap,
  ChevronRight,
} from "lucide-react";

export default function Sidebar({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}: {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (val: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useCurrentUser();

  const [mentor, setMentor] = useState<MentorCharacter | null>(null);
  const [showMentorModal, setShowMentorModal] = useState(false);

  useEffect(() => {
    setMentor(getSelectedMentor());
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push("/login");
    } else {
      console.error("Gagal logout:", error.message);
      alert("Gagal logout, coba lagi.");
    }
  };

  // Kalkulasi Level & XP Gamifikasi Konsultan
  const totalXp = profile?.totalXp || 210;
  const currentLevel = Math.max(1, Math.floor(totalXp / 150) + 1);
  const levelTitles: Record<number, string> = {
    1: "Konsultan Pemula",
    2: "Konsultan Madya",
    3: "Konsultan Muda",
    4: "Konsultan Senior",
    5: "Master Muamalah",
  };
  const roleTitle = levelTitles[Math.min(currentLevel, 5)] || "Konsultan Muda";
  const xpForNext = currentLevel * 180;
  const xpCurrentLevel = totalXp % 180;
  const xpPercent = Math.min(100, Math.max(10, Math.round((xpCurrentLevel / xpForNext) * 100)));

  const koin = profile?.totalPoin ? profile.totalPoin.toLocaleString("id-ID") : "1.250";
  const badgeCount = profile?.modulSelesai || 3;
  const studentName = (profile?.namaMahasiswa && profile.namaMahasiswa.trim().length > 0)
    ? profile.namaMahasiswa
    : "Ahmad Fauzi";

  const NAV_ITEMS = [
    { label: "Peta Petualangan", href: "/game/map", icon: MapIcon },
    // { label: "Cerita & Kasus", href: "/game", icon: Sparkles },
    { label: "Modul Pembelajaran", href: "/mahasiswa/modul", icon: BookOpen },
    { label: "Arena Minigame", href: "/mahasiswa/arena", icon: Gamepad2 },
    { label: "Papan Peringkat", href: "/mahasiswa/leaderboard", icon: Trophy },
    { label: "Profil Konsultan", href: "/mahasiswa/profile", icon: User },
  ];

  return (
    <>
      <aside
        id="main-sidebar"
        suppressHydrationWarning
        aria-label="Profil dan Navigasi Syariah-Quest"
        className={`fixed left-0 top-0 z-50 flex h-screen w-full max-w-72 flex-col overflow-y-auto overflow-x-hidden bg-[#181338] border-r-2 border-[#2f255c] text-white transition-all duration-300 scrollbar-none select-none ${
          isCollapsed ? "md:w-20" : "md:w-72"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Buka sidebar" : "Sembunyikan sidebar"}
          className="absolute -right-3 top-7 hidden md:flex items-center justify-center bg-[#2f255c] border border-purple-400/40 rounded-full p-1.5 text-purple-200 hover:text-white hover:bg-purple-600 shadow-lg z-50 transition-transform hover:scale-110 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3.5 w-3.5 transition-transform duration-300 ${
              isCollapsed ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 1. BRAND HEADER */}
        <div
          className={`pt-5 pb-3 px-5 flex items-center gap-3 transition-all border-b border-purple-900/40 ${
            isCollapsed ? "justify-center px-2" : ""
          }`}
        >
          <div className="relative shrink-0 flex items-center justify-center w-11 h-11 rounded-2xl overflow-hidden bg-white border border-purple-400/40 shadow-[0_0_15px_rgba(99,81,212,0.5)] p-1">
            <img
              src="/game/logo.png"
              alt="Logo Syariah-Quest"
              className="w-full h-full object-contain"
            />
          </div>

          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-base font-black tracking-tight text-white leading-tight">
                Syariah-Quest
              </h1>
              <p className="text-[10px] text-purple-200/70 font-semibold truncate">
                Belajar · Berpikir · Berkembang
              </p>
            </div>
          )}
        </div>

        {/* 2. PROFILE SECTION (DIBESARKAN & DISUSUN KE BAWAH) */}
        {/* 2. PROFILE SECTION (DIBESARKAN & DISUSUN KE BAWAH) */}
        {!isCollapsed ? (
          <div className="mx-3.5 my-3 p-4 rounded-3xl bg-gradient-to-b from-[#241c4a] via-[#1d163d] to-[#161030] border-2 border-purple-500/40 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col items-center text-center relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-[#ffc94a]/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-purple-600/20 blur-2xl" />

            {/* Avatar Pembimbing Besar & Glowing */}
            <div className="relative group cursor-pointer mb-2.5 z-10">
              <button
                type="button"
                onClick={() => setShowMentorModal(true)}
                title="Klik untuk memilih karakter mentor"
                className="relative block"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-[#ffc94a] ring-4 ring-purple-500/40 shadow-[0_0_25px_rgba(255,201,74,0.4)] bg-gradient-to-b from-[#3a266b] to-[#1a1233] p-0.5">
                  <img
                    src={mentor?.avatar || "/game/npc-2.png"}
                    alt={mentor?.name || "Karakter Mentor"}
                    className="w-full h-full object-cover object-top scale-110 group-hover:scale-120 transition-transform duration-300"
                  />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#181135] border border-[#ffc94a] text-[10px] font-black text-[#ffc94a] shadow-lg uppercase tracking-wider whitespace-nowrap hover:bg-[#ffc94a] hover:text-[#181135] transition-colors">
                  Ganti
                </div>
              </button>
            </div>

            {/* Nama Mahasiswa & Title */}
            <h2 className="text-base font-black text-white mt-1.5 tracking-tight truncate max-w-full z-10">
              {studentName}
            </h2>

            <div className="mt-1 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-[11px] font-bold text-[#ffc94a] flex items-center gap-1.5 shadow-sm z-10">
              <Sparkles className="w-3 h-3 text-[#ffc94a]" />
              <span>Level {currentLevel} · {roleTitle}</span>
            </div>

            {/* Progress Bar XP */}
            <div className="w-full mt-3.5 z-10">
              <div className="flex items-center justify-between text-[11px] text-purple-200/90 font-bold mb-1.5 px-0.5">
                <span>Progres XP</span>
                <span className="text-[#ffc94a] font-black">{totalXp} / {xpForNext} XP</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#100a20] overflow-hidden p-0.5 border border-purple-900/60 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-400 via-fuchsia-400 to-[#ffc94a] shadow-[0_0_12px_rgba(255,201,74,0.8)] transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>

            {/* Stacked Resources (Koin, XP, Badge) Tanpa Terpotong */}
            <div className="w-full mt-3.5 pt-3 border-t border-purple-800/40 grid grid-cols-2 gap-2 text-xs z-10">
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#150e2c]/90 border border-purple-800/50 shadow-sm">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-[9px] text-purple-300/70 font-semibold uppercase leading-none">Koin</span>
                  <span className="font-black text-amber-300 text-xs truncate leading-tight mt-0.5">{koin}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#150e2c]/90 border border-purple-800/50 shadow-sm">
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-400/30">
                  <Award className="w-3.5 h-3.5 text-purple-300" />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-[9px] text-purple-300/70 font-semibold uppercase leading-none">Lencana</span>
                  <span className="font-black text-purple-200 text-xs truncate leading-tight mt-0.5">{badgeCount} Badge</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center my-4 px-2">
            <button
              type="button"
              onClick={() => setShowMentorModal(true)}
              title="Karakter Mentor"
              className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#ffc94a] shadow-md bg-[#251e4f]"
            >
              <img
                src={mentor?.avatar || "/game/npc-2.png"}
                alt="Avatar"
                className="w-full h-full object-cover object-top"
              />
            </button>
          </div>
        )}

        {/* 3. MENU NAVIGASI (MENGISI RUANG SIDEBAR AGAR TIDAK KOSONG) */}
        {!isCollapsed && (
          <div className="px-3.5 py-1">
            <div className="px-3 mb-2 text-[10px] font-black tracking-widest text-purple-300/60 uppercase">
              Petualangan Syariah
            </div>

            <nav className="flex flex-col gap-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/game" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer group ${
                      isActive
                        ? "bg-gradient-to-r from-[#7858ca] to-[#5740a0] text-white shadow-md border border-[#ffc94a]/40"
                        : "text-purple-200/80 hover:bg-[#281f4f] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                          isActive ? "text-[#ffc94a]" : "text-purple-300"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isActive
                          ? "text-[#ffc94a] translate-x-0.5"
                          : "text-purple-400/40 group-hover:text-white group-hover:translate-x-0.5"
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* 4. MISI AKTIF & STATUS BELAJAR WIDGET */}
        {!isCollapsed && (
          <div className="mx-3.5 mt-3 mb-2 flex flex-col gap-2">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#1d163a] to-[#251c4a] border border-purple-800/40 text-xs shadow-md">
              <div className="flex items-center justify-between text-[10px] font-black text-amber-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#ffc94a]" />
                  <span>Target Perjalanan</span>
                </span>
                <span className="text-[#ffc94a] font-extrabold bg-[#150f2a] px-2 py-0.5 rounded-full border border-purple-800/60">+50 XP</span>
              </div>
              <p className="text-[12px] font-black text-white truncate">
                Bab 01 · Kampus Madani
              </p>
              <p className="text-[10px] text-purple-200/70 mt-0.5 line-clamp-1">
                Kuasai rukun dan syarat keabsahan akad transaksi.
              </p>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#140e28]/90 border border-purple-900/40 flex items-center justify-between text-[11px] font-bold text-purple-200/80">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">🔥</span>
                <span>Streak Belajar</span>
              </div>
              <span className="text-[#ffc94a] font-black">3 Hari Aktif</span>
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* 5. FOOTER & TOMBOL LOGOUT */}
        <div className="mt-auto w-full shrink-0 p-3.5 border-t border-purple-900/40 flex flex-col gap-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2 text-[10px] text-purple-300/70 px-1 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#59d7a5] animate-pulse" />
              <span>Progres tersimpan lokal</span>
            </div>
          )}

          <button
            onClick={handleLogout}
            aria-label="Keluar"
            className={`flex items-center justify-center text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600/80 border border-rose-500/30 transition-all rounded-xl cursor-pointer ${
              isCollapsed ? "w-10 h-10 p-0 mx-auto" : "w-full gap-2.5 px-4 py-2.5"
            }`}
            title="Keluar"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span className="text-xs font-bold tracking-wide">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Modal Pemilihan Karakter Mentor */}
      <CharacterSelectionModal
        isOpen={showMentorModal}
        canDismiss={true}
        onSelect={(chosen) => {
          setMentor(chosen);
          setShowMentorModal(false);
        }}
        onClose={() => setShowMentorModal(false)}
      />
    </>
  );
}
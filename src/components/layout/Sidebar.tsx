"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Sidebar({
  isCollapsed,
  setIsCollapsed
}: {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push('/login');
    } else {
      console.error("Gagal logout:", error.message);
      alert("Gagal logout, coba lagi.");
    }
  };

  return (
    <aside
      className={`h-screen bg-sidebar border-r border-secondary/30 flex flex-col fixed left-0 top-0 transition-all duration-300 z-50 ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-white border border-secondary/30 rounded-full p-1 text-primary hover:bg-secondary/10 shadow-md z-50 transition-transform hover:scale-110"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* --- BAGIAN LOGO YANG DIPERBARUI UKURANNYA --- */}
      <div className={`py-8 flex items-center transition-all ${isCollapsed ? 'justify-center px-2' : 'justify-center px-6'}`}>
        <img
          src="/images/logo.svg"
          alt="Syariah Quest Logo"
          className={`object-contain transition-all duration-300 ${isCollapsed ? 'w-8' : 'w-28'}`}
        />
      </div>
      {/* ----------------------------------- */}

      <nav className="flex flex-col gap-2 px-3 mt-4">

        <Link href="/dashboard" className={`flex items-center p-3 rounded-md transition-all ${isCollapsed ? 'justify-center' : 'gap-3'} ${pathname === '/dashboard' ? 'text-primary font-bold bg-secondary/10' : 'text-gray-400 font-medium hover:text-primary hover:bg-secondary/10'}`} title="Dashboard">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          {!isCollapsed && <span className="truncate text-sm tracking-tight font-semibold">Dashboard</span>}
        </Link>

        <Link href="/arena" className={`flex items-center p-3 rounded-md transition-all ${isCollapsed ? 'justify-center' : 'gap-3'} ${pathname === '/arena' || pathname.startsWith('/arena/play') ? 'text-primary font-bold bg-secondary/10' : 'text-gray-400 font-medium hover:text-primary hover:bg-secondary/10'}`} title="Arena Permainan">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
          {!isCollapsed && <span className="truncate text-sm tracking-tight font-semibold">Arena Permainan</span>}
        </Link>

        <Link href="/modul" className={`flex items-center p-3 rounded-md transition-all ${isCollapsed ? 'justify-center' : 'gap-3'} ${pathname === '/modul' ? 'text-primary font-bold bg-secondary/10' : 'text-gray-400 font-medium hover:text-primary hover:bg-secondary/10'}`} title="Modul Pembelajaran">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          {!isCollapsed && <span className="truncate text-sm tracking-tight font-semibold">Modul Pembelajaran</span>}
        </Link>

        <Link href="/kuis" className={`flex items-center p-3 rounded-md transition-all ${isCollapsed ? 'justify-center' : 'gap-3'} ${pathname.startsWith('/kuis') ? 'text-primary font-bold bg-secondary/10' : 'text-gray-400 font-medium hover:text-primary hover:bg-secondary/10'}`} title="Kuis Ujian">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          {!isCollapsed && <span className="truncate text-sm tracking-tight font-semibold">Kuis Ujian</span>}
        </Link>

        <Link href="/leaderboard" className={`flex items-center p-3 rounded-md transition-all ${isCollapsed ? 'justify-center' : 'gap-3'} ${pathname === '/leaderboard' ? 'text-primary font-bold bg-secondary/10' : 'text-gray-400 font-medium hover:text-primary hover:bg-secondary/10'}`} title="Leaderboard">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          {!isCollapsed && <span className="truncate text-sm tracking-tight font-semibold">Leaderboard</span>}
        </Link>

        <Link href="/profile" className={`flex items-center p-3 rounded-md transition-all ${isCollapsed ? 'justify-center' : 'gap-3'} ${pathname === '/profile' ? 'text-primary font-bold bg-secondary/10' : 'text-gray-400 font-medium hover:text-primary hover:bg-secondary/10'}`} title="Profile">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          {!isCollapsed && <span className="truncate text-sm tracking-tight font-semibold">Profile</span>}
        </Link>
      </nav>

      <div className="mt-auto p-4 mb-4 flex justify-center">
        <button
          onClick={handleLogout}
          className={`flex items-center justify-center text-primary font-bold bg-secondary hover:bg-primary hover:text-white transition-all ${isCollapsed ? 'w-12 h-12 rounded-xl p-0' : 'w-full gap-2 px-4 py-2 rounded-lg'
            }`}
          title="LogOut"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-180 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && <span className="text-sm font-semibold">LogOut</span>}
        </button>
      </div>
    </aside>
  );
}
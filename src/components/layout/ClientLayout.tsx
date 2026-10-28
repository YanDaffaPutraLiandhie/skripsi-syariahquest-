"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import DosenSidebar from "@/components/sidebar";
import Navbar from "./Navbar";

import {
  Diamond,
  Star,
  Shield,
  BookOpen,
  Hexagon,
  Trophy,
  Award,
  Zap
} from "lucide-react";
import { ArrowLeft } from "lucide-react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isGameMode =
    pathname.startsWith("/arena/play") ||
    pathname.startsWith("/mahasiswa/arena/play") ||
    pathname.startsWith("/mahasiswa/play") ||
    pathname.startsWith("/play");

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");

  // =========================================
  // ADMIN
  // Admin sudah mempunyai layout sendiri
  // =========================================
  const isAdminPage = pathname.startsWith("/admin");

  // =========================================
  // AUTH
  // =========================================
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  // =========================================
  // ADMIN
  // Jangan tampilkan sidebar mahasiswa/dosen
  // =========================================
  if (isAdminPage) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  // =========================================
  // DOSEN
  // =========================================
  const isDosen = pathname.startsWith("/Dosen");

  return (
    <div suppressHydrationWarning className="flex min-h-screen bg-background">

      {isDosen ? (
        <DosenSidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
        />
      ) : (
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
        />
      )}

      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
        />
      )}

      {isGameMode && (
        <button
          type="button"
          aria-label="Kembali ke halaman sebelumnya"
          onClick={() => window.history.back()}
          className="fixed left-4 top-4 z-[100] rounded-xl bg-white/90 p-2 text-[#5B5288] shadow-lg backdrop-blur-sm transition hover:bg-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      <div
        className={`min-w-0 flex-1 flex flex-col min-h-screen transition-all duration-300 ${isCollapsed ? "md:ml-20" : "md:ml-64"
          }`}
      >
        {!isGameMode && (
          <Navbar
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            showBackButton={
              pathname !== "/dashboard" &&
              pathname !== "/mahasiswa/dashboard" &&
              pathname !== "/Dosen/Dashboard"
            }
          />
        )}

        {/*
          Catatan perbaikan sticky:
          overflow-x-hidden sebelumnya membuat browser otomatis menghitung
          overflow-y menjadi "auto" (karena spec CSS: jika salah satu axis
          overflow bukan "visible", axis yang lain ikut berubah dari
          "visible" -> "auto"). Ini menjadikan <main> sebagai scroll
          container tersendiri, yang bisa mengacaukan referensi
          position: sticky pada children di dalamnya.

          overflow-x-clip memberi efek visual yang sama (memotong overflow
          horizontal) tanpa membuat elemen ini jadi scroll container baru,
          sehingga sticky tetap mengacu ke scroll window seperti biasa.
        */}
        <main
          className={`min-w-0 flex-1 overflow-x-clip ${isGameMode ? "p-0" : "p-4 sm:p-6 lg:p-8"} relative isolate`}
        >
          {(!isDosen && !isGameMode) && (
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#f8f7fd] via-[#f4f1fb] to-[#f0edf9] overflow-hidden">
              {/* Ambient Gradient Glows */}
              <div className="absolute -left-20 -top-16 h-80 w-80 rounded-full bg-[#8a80b8]/30 blur-3xl" />
              <div className="absolute right-[-4rem] top-1/3 h-72 w-72 rounded-full bg-amber-200/50 blur-3xl" />
              <div className="absolute bottom-[-3rem] left-1/4 h-64 w-64 rounded-full bg-[#4a3f7a]/15 blur-3xl" />
              <div className="absolute right-10 bottom-10 h-72 w-72 rounded-full bg-purple-300/30 blur-3xl" />

              {/* Dot Matrix Pattern SVGs */}
              <div className="absolute left-6 top-24 opacity-30">
                <svg width="100" height="100" fill="none" viewBox="0 0 100 100">
                  <pattern id="mhs-dot-grid-1" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="3" cy="3" r="2" className="fill-[#4a3f7a]" />
                  </pattern>
                  <rect width="100" height="100" fill="url(#mhs-dot-grid-1)" />
                </svg>
              </div>

              <div className="absolute right-10 top-72 opacity-25">
                <svg width="120" height="120" fill="none" viewBox="0 0 120 120">
                  <pattern id="mhs-dot-grid-2" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="4" cy="4" r="2.5" className="fill-[#8a80b8]" />
                  </pattern>
                  <rect width="120" height="120" fill="url(#mhs-dot-grid-2)" />
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

              {/* Big Concentric Background Circles */}
              <div className="absolute right-[-6rem] bottom-[-6rem] opacity-20">
                <svg width="340" height="340" viewBox="0 0 340 340" fill="none">
                  <circle cx="170" cy="170" r="160" stroke="#4a3f7a" strokeWidth="2" strokeDasharray="8 8" />
                  <circle cx="170" cy="170" r="120" stroke="#8a80b8" strokeWidth="2" />
                  <circle cx="170" cy="170" r="80" stroke="#f2c94c" strokeWidth="2" strokeDasharray="6 6" />
                </svg>
              </div>

              <div className="absolute left-[-5rem] top-[-5rem] opacity-20">
                <svg width="280" height="280" viewBox="0 0 280 280" fill="none">
                  <circle cx="140" cy="140" r="130" stroke="#4a3f7a" strokeWidth="2" />
                  <circle cx="140" cy="140" r="90" stroke="#8a80b8" strokeWidth="2" strokeDasharray="6 6" />
                </svg>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
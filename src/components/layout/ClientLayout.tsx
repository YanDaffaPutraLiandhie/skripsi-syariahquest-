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
    pathname.startsWith("/play") ||
    pathname.startsWith("/game");

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
  const isMahasiswa = !isDosen && !isAdminPage && !isAuthPage;

  return (
    <div
      suppressHydrationWarning
      className={`flex min-h-screen ${isMahasiswa ? "bg-[#110b24] text-white" : "bg-background"}`}
    >

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
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm md:hidden"
        />
      )}

      <div
        className={`min-w-0 flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          isCollapsed ? "md:ml-20" : "md:ml-72"
        } ${isMahasiswa ? "bg-[#110b24]" : ""}`}
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

        <main
          className={`min-w-0 flex-1 overflow-x-clip ${
            isGameMode ? "p-0 bg-[#110b24]" : "p-4 sm:p-6 lg:p-8"
          } relative isolate`}
        >
          {isMahasiswa && !isGameMode && (
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#140e2b] via-[#100922] to-[#0c071a] overflow-hidden">
              {/* Deep RPG Ambient Cosmic Glows */}
              <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />
              <div className="absolute right-[-5rem] top-1/4 h-80 w-80 rounded-full bg-[#ffc94a]/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-[-4rem] left-1/3 h-80 w-80 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />
              <div className="absolute right-10 bottom-10 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl pointer-events-none" />

              {/* Floating RPG Sigils & Glowing Gems */}
              <Diamond className="absolute left-[6%] top-[18%] h-6 w-6 rotate-12 text-[#ffc94a]/30 animate-pulse" strokeWidth={2.5} />
              <div className="absolute left-[14%] top-[12%] h-7 w-7 rounded-full border-2 border-dashed border-purple-400/30 animate-spin-slow" />
              <Star className="absolute right-[7%] top-[16%] h-5 w-5 rotate-12 fill-amber-300/40 text-amber-400/70" />
              <Shield className="absolute right-[14%] top-[24%] h-6 w-6 text-purple-400/30 -rotate-12" strokeWidth={1.8} />
              <BookOpen className="absolute left-[3%] top-[48%] h-7 w-7 text-purple-400/25 rotate-6" strokeWidth={1.8} />
              <Hexagon className="absolute left-[12%] top-[54%] h-8 w-8 text-amber-300/30 rotate-45" strokeWidth={2} />
              <Trophy className="absolute right-[4%] top-[52%] h-7 w-7 text-amber-400/40 -rotate-12" strokeWidth={1.8} />
              <Award className="absolute left-[8%] bottom-16 h-8 w-8 text-purple-400/30 rotate-12" strokeWidth={1.8} />
              <Zap className="absolute right-[15%] bottom-20 h-6 w-6 text-amber-400/50 -rotate-12" strokeWidth={2} />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
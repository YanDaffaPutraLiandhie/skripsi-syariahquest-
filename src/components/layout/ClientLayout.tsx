"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import DosenSidebar from "@/components/sidebar";
import Navbar from "./Navbar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const isGameMode = pathname.startsWith("/arena/play");

  const isProfilePage = pathname.startsWith("/profile");

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
    <div className="flex min-h-screen bg-background">

      {isDosen ? (
        <DosenSidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      ) : (
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      )}

      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isCollapsed ? "ml-20" : "ml-64"
          }`}
      >
        {!isGameMode && !isProfilePage && <Navbar />}

        <main
          className={`flex-1 overflow-x-hidden ${isGameMode ? "p-0" : "p-8 bg-gray-50/30"
            }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
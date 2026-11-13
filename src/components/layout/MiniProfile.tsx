"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/lib/supabase";
import { User, LogOut, GraduationCap, ShieldCheck } from "lucide-react";

export default function MiniProfile() {
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const avatarSrc = profile?.avatarUrl || "/images/avatars/avatar1.svg";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse border-2 border-white shadow-sm"></div>
    );
  }

  if (!profile) {
    return null; // atau redirect ke /login kalau mau
  }

  // ----- Konten dropdown per role -----
  let subLabel = "";
  let profileButtonLabel = "";
  let profileIcon = <User className="w-4 h-4" />;
  let profilePath = "/profile";

  if (profile.role === "dosen") {
    subLabel = "Dosen";
    profileButtonLabel = "Profil Saya";
    profileIcon = <GraduationCap className="w-4 h-4" />;
    profilePath = "/Dosen/profil_dosen";
  } else if (profile.role === "admin") {
    subLabel = "Admin";
    profileButtonLabel = "Profil Saya";
    profileIcon = <ShieldCheck className="w-4 h-4" />;
    profilePath = "/admin/profil"; // sesuaikan route admin kamu
  } else {
    // mahasiswa
    subLabel = `Peringkat #${profile.peringkat ?? "-"}`;
    profileButtonLabel = "Lihat Profil";
    profileIcon = <User className="w-4 h-4" />;
    profilePath = "/profile";
  }

  const isDosen = profile.role === "dosen";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
        aria-label="Menu profil"
      >
        <div
          className={`w-10 h-10 rounded-full overflow-hidden p-0.5 shadow-md ${
            !isDosen
              ? "border-2 border-[#ffc94a] shadow-[0_0_12px_rgba(255,201,74,0.4)] bg-[#2e1d52]"
              : "border-2 border-white bg-[#5B5288]"
          }`}
        >
          <img
            src={avatarSrc}
            alt="Mini Avatar"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-3 w-60 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${
            !isDosen
              ? "border border-purple-700/50 bg-[#181136] text-white"
              : "border border-gray-100 bg-white"
          }`}
        >
          <div
            className={`p-4 ${
              !isDosen ? "bg-[#241a4d] border-b border-purple-800/40" : "bg-gray-50 border-b border-gray-100"
            }`}
          >
            <p className={`font-black text-sm truncate ${!isDosen ? "text-white" : "text-[#5B5288]"}`}>
              {profile.namaMahasiswa || "Pengguna"}
            </p>
            <p className={`text-xs font-semibold mt-0.5 ${!isDosen ? "text-[#ffc94a]" : "text-gray-500"}`}>
              {subLabel}
            </p>
          </div>

          <div className="p-2 flex flex-col gap-1">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push(profilePath);
              }}
              className={`flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl transition-colors w-full text-left cursor-pointer ${
                !isDosen
                  ? "text-purple-200 hover:bg-purple-800/40 hover:text-white"
                  : "text-gray-600 hover:bg-purple-50 hover:text-[#5B5288]"
              }`}
            >
              {profileIcon}
              <span>{profileButtonLabel}</span>
            </button>

            <button
              onClick={handleLogout}
              className={`flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl transition-colors w-full text-left cursor-pointer ${
                !isDosen
                  ? "text-rose-400 hover:bg-rose-500/20"
                  : "text-red-500 hover:bg-red-50"
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
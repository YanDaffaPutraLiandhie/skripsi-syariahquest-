"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/lib/supabase";
import { User, LogOut } from "lucide-react";

export default function MiniProfile() {
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fallback avatar
  const avatarSrc = profile?.avatarUrl || "/images/avatars/avatar1.svg";

  // Klik di luar dropdown untuk menutupnya
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* TOMBOL AVATAR (TRIGGER) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:scale-105 transition-transform"
      >
        <div className="w-10 h-10 rounded-full bg-[#5B5288] overflow-hidden border-2 border-white shadow-sm p-0.5">
          <img 
            src={avatarSrc} 
            alt="Mini Avatar" 
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Info User */}
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <p className="font-bold text-[#5B5288] truncate">
              {profile?.namaMahasiswa || "Pengguna"}
            </p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Peringkat #{profile?.peringkat || "-"}
            </p>
          </div>

          {/* Menu Items */}
          <div className="p-2 flex flex-col gap-1">
            <button 
              onClick={() => {
                setIsOpen(false);
                router.push('/profile');
              }}
              className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-gray-600 hover:bg-purple-50 hover:text-[#5B5288] rounded-xl transition-colors w-full text-left"
            >
              <User className="w-4 h-4" />
              Lihat Profil
            </button>
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
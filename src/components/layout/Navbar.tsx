"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useState, FormEvent, ChangeEvent } from 'react';
import { ArrowLeft, Bell, Check, X, Menu } from 'lucide-react';
import MiniProfile from "@/components/layout/MiniProfile";
import { useRoomInvitations } from "@/hooks/useRoomInvitations";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function Navbar({
  onOpenMobileMenu,
  showBackButton = true,
}: {
  onOpenMobileMenu?: () => void;
  showBackButton?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const { profile } = useCurrentUser();
  // Panggil hook untuk dengerin undangan masuk
  const { invitations, respondToInvitation } = useRoomInvitations(profile?.authUserId);

  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const showSearch = pathname === '/modul' || pathname === '/mahasiswa/modul';

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim() === "") {
      router.push(pathname);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() !== "") {
      router.push(`${pathname}?q=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push(pathname);
    }
  };

  const handleAcceptInvite = async (invitationId: string, roomId: string) => {
    // 1. Terima undangan
    await respondToInvitation(invitationId, "accepted");
    // 2. Tutup notifikasi
    setShowNotifications(false);
    // 3. Langsung arahkan ke pintu masuk arena
    router.push(`/mahasiswa/arena/join/${roomId}`);
  };

  const isDosen = pathname.startsWith("/Dosen");

  return (
    <header
      className={`sticky top-0 z-50 flex min-h-16 items-center justify-between gap-3 border-b px-4 py-3 shadow-md backdrop-blur-md transition-all sm:min-h-20 sm:px-6 lg:px-8 ${
        !isDosen
          ? "border-purple-900/60 bg-[#160f33]/95 text-white shadow-[0_4px_25px_rgba(0,0,0,0.5)]"
          : "border-gray-100/80 bg-white/90 text-slate-800"
      }`}
    >
      <div className="flex shrink-0 items-center gap-1.5">
        {showBackButton && (
          <button
            type="button"
            aria-label="Kembali"
            onClick={() => router.back()}
            className={`rounded-xl p-2 transition focus:outline-none ${
              !isDosen
                ? "text-purple-200 hover:text-white hover:bg-purple-800/40 border border-purple-500/30 bg-[#1c143d]"
                : "text-[#5B5288] hover:bg-[#f4f2fa]"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          aria-label="Buka menu"
          onClick={onOpenMobileMenu}
          className={`rounded-xl p-2 md:hidden focus:outline-none ${
            !isDosen
              ? "text-purple-200 hover:text-white hover:bg-purple-800/40 border border-purple-500/30 bg-[#1c143d]"
              : "text-[#5B5288] hover:bg-[#f4f2fa]"
          }`}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* BAGIAN TENGAH: Search Bar atau Quick Game Map Link */}
      <div className="flex-1 flex items-center justify-between gap-3 max-w-xl">
        {showSearch ? (
          <form
            onSubmit={handleSearch}
            className={`flex w-full items-center rounded-full border px-3.5 py-1.5 transition-colors shadow-sm sm:px-4 ${
              !isDosen
                ? "border-purple-500/40 bg-[#100a20]/90 text-white focus-within:border-[#ffc94a] shadow-inner"
                : "border-gray-300 bg-white text-gray-700 focus-within:border-primary"
            }`}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cari modul atau studi kasus..."
              className={`outline-none bg-transparent w-full text-xs sm:text-sm ${
                !isDosen ? "text-white placeholder-purple-300/40" : "text-gray-700 placeholder-gray-400"
              }`}
            />
            <button
              type="submit"
              className={`transition-colors cursor-pointer ${
                !isDosen ? "text-purple-300 hover:text-[#ffc94a]" : "text-gray-800 hover:text-primary"
              }`}
            >
              <SearchIcon />
            </button>
          </form>
        ) : (
          !isDosen && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#59d7a5] animate-pulse" />
              <span className="text-[11px] font-bold text-purple-300/80">
                Mode Petualangan Syariah Aktif
              </span>
            </div>
          )
        )}
      </div>

      {/* BAGIAN KANAN: Tombol Peta Game + Lonceng Notif + Mini Profile */}
      <div className="relative flex shrink-0 items-center gap-2 sm:gap-4">
        {/* Shortcut Tombol Buka Peta Game */}
        {!isDosen && (
          <button
            type="button"
            onClick={() => router.push("/game/map")}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7858ca]/40 to-[#5740a0]/40 hover:from-[#7858ca] hover:to-[#5740a0] border border-[#ffc94a]/40 text-[#ffc94a] hover:text-white font-black text-xs shadow-sm transition-all cursor-pointer"
          >
            <span>🗺️</span>
            <span>Peta Petualangan</span>
          </button>
        )}

        {/* Lonceng Notifikasi Khusus Mahasiswa */}
        {profile?.role === "mahasiswa" && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2 rounded-xl transition-all cursor-pointer ${
                !isDosen
                  ? "text-purple-200 hover:text-[#ffc94a] hover:bg-purple-800/40 border border-purple-500/30 bg-[#1c143d]"
                  : "text-gray-500 hover:text-[#5B5288] hover:bg-gray-100"
              }`}
            >
              <Bell className="w-5 h-5" />
              {invitations.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#160f33] animate-pulse" />
              )}
            </button>

            {/* Dropdown Notifikasi */}
            {showNotifications && (
              <div
                className={`absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border shadow-2xl animate-fade-in-down z-50 ${
                  !isDosen
                    ? "border-purple-700/60 bg-[#191138] text-white"
                    : "border-gray-100 bg-white text-slate-800"
                }`}
              >
                <div className={`${!isDosen ? "bg-[#251b4f] border-b border-purple-800/50" : "bg-[#5B5288]"} px-4 py-3 flex items-center justify-between`}>
                  <h3 className="text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚔️</span>
                    <span>Undangan Duel Arena</span>
                  </h3>
                  {invitations.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                      {invitations.length} Baru
                    </span>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto flex flex-col">
                  {invitations.length > 0 ? (
                    invitations.map((inv) => (
                      <div
                        key={inv.id_invitation}
                        className={`p-3.5 border-b transition-colors ${
                          !isDosen
                            ? "border-purple-900/40 hover:bg-[#201646]"
                            : "border-gray-50 hover:bg-gray-50 text-gray-600"
                        }`}
                      >
                        <p className={`text-xs font-medium mb-2.5 leading-relaxed ${!isDosen ? "text-purple-200" : "text-gray-600"}`}>
                          <span className={`font-black ${!isDosen ? "text-[#ffc94a]" : "text-[#5B5288]"}`}>
                            {inv.inviter_name || "Seorang Mahasiswa"}
                          </span>{" "}
                          menantangmu bertanding di{" "}
                          <span className="font-bold text-white">Arena Syariah</span>!
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptInvite(inv.id_invitation, inv.id_room)}
                            className="flex-1 flex items-center justify-center gap-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 text-white py-1.5 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" /> Terima Tantangan
                          </button>
                          <button
                            onClick={() => respondToInvitation(inv.id_invitation, "declined")}
                            className="flex-1 flex items-center justify-center gap-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 py-1.5 rounded-xl text-xs font-bold border border-rose-500/30 transition-all cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" /> Tolak
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs font-bold text-purple-300/60">
                      Belum ada tantangan arena yang masuk.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <MiniProfile />
      </div>
    </header>
  );
}

// Icon ringan buat form search biar gak butuh import tambahan
function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
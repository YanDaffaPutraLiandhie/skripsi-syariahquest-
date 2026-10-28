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

  return (
    <header className="sticky top-0 z-50 flex min-h-16 items-center justify-between gap-3 border-b border-gray-100/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-md transition-all sm:min-h-20 sm:px-6 lg:px-8">

      <div className="flex shrink-0 items-center gap-1">
        {showBackButton && (
          <button
            type="button"
            aria-label="Kembali"
            onClick={() => router.back()}
            className="rounded-lg p-2 text-[#5B5288] transition hover:bg-[#f4f2fa] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        <button
          type="button"
          aria-label="Buka menu"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-[#5B5288] hover:bg-[#f4f2fa] md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* BAGIAN KIRI: Search Bar */}
      <div className="flex-1">
        {showSearch && (
          <form
            onSubmit={handleSearch}
            className="flex w-full max-w-xl items-center rounded-full border border-gray-300 bg-white px-3 py-2 transition-colors shadow-sm focus-within:border-primary sm:px-4"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search..."
              className="outline-none bg-transparent w-full text-sm text-gray-700 placeholder-gray-400"
            />
            <button type="submit" className="text-gray-800 hover:text-primary transition-colors">
              <SearchIcon />
            </button>
          </form>
        )}
      </div>

      {/* BAGIAN KANAN: Lonceng Notif & Mini Profile */}
      <div className="relative flex shrink-0 items-center gap-2 sm:gap-6">

        {/* Lonceng Notifikasi Khusus Mahasiswa */}
        {profile?.role === "mahasiswa" && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:text-[#5B5288] transition-colors rounded-full hover:bg-gray-100"
            >
              <Bell className="w-6 h-6" />
              {invitations.length > 0 && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>

            {/* Dropdown Notifikasi */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-[min(20rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl animate-fade-in-down">
                <div className="bg-[#5B5288] px-4 py-3">
                  <h3 className="text-white font-bold text-sm">Undangan Bermain</h3>
                </div>
                <div className="max-h-[300px] overflow-y-auto flex flex-col">
                  {invitations.length > 0 ? (
                    invitations.map((inv) => (
                      <div key={inv.id_invitation} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <p className="text-sm text-gray-600 font-medium mb-3">
                          <span className="font-bold text-[#5B5288]">{inv.inviter_name || "Seseorang"}</span> mengundangmu ke <span className="font-bold text-[#5B5288]">Arena Permainan</span>!
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptInvite(inv.id_invitation, inv.id_room)}
                            className="flex-1 flex items-center justify-center gap-1 bg-[#39C936] text-white py-1.5 rounded-lg text-xs font-bold hover:brightness-110 transition-all"
                          >
                            <Check className="w-3 h-3" /> Terima
                          </button>
                          <button
                            onClick={() => respondToInvitation(inv.id_invitation, "declined")}
                            className="flex-1 flex items-center justify-center gap-1 bg-red-100 text-red-600 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200 transition-all"
                          >
                            <X className="w-3 h-3" /> Tolak
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-sm font-semibold text-gray-400">
                      Tidak ada undangan baru.
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
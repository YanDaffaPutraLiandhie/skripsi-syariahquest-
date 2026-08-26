"use client";

import { Loader2, Crown, Copy, Check, Users, Search, UserPlus, X, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RoomPlayer } from "@/hooks/useRoom";
import type { PlayerProfile } from "@/hooks/usePlayerProfiles";
import { useSearchMahasiswa } from "@/hooks/useSearchMahasiswa";
import { supabase } from "@/lib/supabase";

type WaitingRoomProps = {
  players: RoomPlayer[];
  isHost: boolean;
  currentUserId: string | null;
  onStart: () => void;
  roomId: string;
  isPrivate: boolean;
  pin: string | null;
  profiles?: Record<string, PlayerProfile>;
  leaveRoom: () => Promise<void>;
};

export default function WaitingRoom({
  players,
  isHost,
  currentUserId,
  onStart,
  roomId,
  isPrivate,
  pin,
  profiles,
  leaveRoom,
}: WaitingRoomProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false); // State untuk tombol keluar

  // State untuk Modal Invite
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { results, isSearching, searchMahasiswa, setResults } = useSearchMahasiswa();
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  const roomLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/arena/join/${roomId}`
      : "";

  const handleStart = async () => {
    setIsStarting(true);
    await onStart();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Fungsi Keluar Ruangan Manual (Paling Aman!)
  const handleLeaveRoom = async () => {
    if (!currentUserId) return;

    setIsLeaving(true);
    try {
      await leaveRoom();
      router.push('/dashboard');
    } catch (err) {
      console.error("Gagal keluar dari ruangan:", err);
      setIsLeaving(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchMahasiswa(searchQuery);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSendInvite = async (invitedUserId: string) => {
    if (!currentUserId) return;
    
    const { error } = await supabase.from("room_invitation").insert({
      id_room: roomId,
      invited_user_id: invitedUserId,
      invited_by: currentUserId,
      status: "pending",
    });

    if (!error) {
      setInvitedIds((prev) => [...prev, invitedUserId]);
    } else {
      console.error("Gagal mengirim undangan:", error);
    }
  };

  const isEnoughPlayers = players.length >= 2;

  // Efek jaga-jaga kalau user close tab paksa di browser
  useEffect(() => {
    if (!currentUserId || !roomId) return;

    const handleBeforeUnload = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      
      if (!token) return;

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/room_player?id_room=eq.${roomId}&id_user=eq.${currentUserId}`;
      fetch(url, {
        method: 'PATCH',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ is_inRoom: false, is_host: false }),
        keepalive: true 
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId, currentUserId]);
  
  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center gap-6 px-4 relative overflow-hidden py-10">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="z-10 flex flex-col items-center gap-2">
        <h1 className="text-4xl font-black text-[#5B5288] drop-shadow-sm">Ruang Tunggu</h1>
        <p className="text-gray-500 font-medium">Ajak temanmu untuk mulai bermain!</p>
      </div>

      {isPrivate && pin && (
        <div className="z-10 flex flex-col items-center gap-1.5 mt-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            PIN RUANG
          </span>
          <div className="bg-white text-[#5B5288] font-black text-3xl px-10 py-3 rounded-2xl shadow-sm border-2 border-purple-100 tracking-[0.2em]">
            {pin}
          </div>
        </div>
      )}

      <div className="z-10 bg-white rounded-xl flex items-center justify-between p-2 pl-5 shadow-sm border border-gray-100 w-full max-w-md mt-2">
        <span className="text-gray-400 text-sm truncate flex-1 font-medium">
          {roomLink}
        </span>
        <button
          onClick={handleCopy}
          className={`p-2.5 rounded-lg transition-all flex items-center gap-2 ${
            isCopied
              ? "bg-green-100 text-green-600 font-bold"
              : "bg-gray-50 hover:bg-gray-100 text-[#5B5288] font-semibold"
          }`}
        >
          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="text-xs">{isCopied ? "Tersalin!" : "Salin Link"}</span>
        </button>
      </div>

      <div className="z-10 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 w-full max-w-md mt-2">
        <div className="flex justify-between items-center mb-5">
          <p className="text-sm font-bold text-gray-400 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Daftar Pemain
          </p>
          <span className="bg-purple-100 text-purple-700 font-black text-xs px-3 py-1 rounded-full">
            {players.length} / 4
          </span>
        </div>
        
        <div className="flex flex-col gap-3">
          {players.map((player) => {
            const profile = profiles?.[player.id_user];
            const avatarSrc = profile?.avatarUrl || "/images/avatars/avatar1.svg";
            const playerName = profile?.namaMahasiswa || "Pemain";

            return (
              <div key={player.id_room_player} className="flex items-center gap-4 bg-gray-50 p-2.5 rounded-2xl border border-gray-100 transition-all hover:bg-purple-50 hover:border-purple-100">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-sm border-2 border-white">
                  <img
                    src={avatarSrc}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-bold text-[#5B5288] flex-1 text-base">
                  {player.id_user === currentUserId ? "Kamu" : playerName}
                </span>
                {player.is_host && (
                  <div className="bg-yellow-100 p-1.5 rounded-lg">
                    <Crown className="w-4 h-4 text-yellow-600" />
                  </div>
                )}
              </div>
            );
          })}

          {[...Array(4 - players.length)].map((_, i) => (
            <div 
              key={`empty-${i}`} 
              onClick={() => isHost && setShowInviteModal(true)}
              className={`flex items-center gap-4 p-2.5 rounded-2xl border border-dashed border-gray-200 transition-all ${isHost ? 'cursor-pointer hover:bg-purple-50 hover:border-purple-300' : 'opacity-50'}`}
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                {isHost && <UserPlus className="w-5 h-5 text-gray-400" />}
              </div>
              <span className="font-semibold text-gray-400 flex-1 text-sm italic">
                {isHost ? "Klik untuk mengundang pemain..." : "Menunggu pemain..."}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="z-10 mt-4 flex flex-col items-center gap-3 w-full max-w-md">
        {isHost ? (
          <div className="flex gap-3 w-full">
            <button
              onClick={handleLeaveRoom}
              disabled={isStarting || isLeaving}
              className="px-5 py-4 rounded-2xl bg-red-100 text-red-600 font-bold text-base hover:bg-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {isLeaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            </button>
            <button
              onClick={handleStart}
              disabled={isStarting || !isEnoughPlayers || isLeaving}
              className="flex-1 py-4 rounded-2xl bg-[#39C936] text-white font-black text-lg shadow-xl shadow-green-200 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isStarting && <Loader2 className="w-5 h-5 animate-spin" />}
              {isStarting ? "Menyiapkan Arena..." : "Mulai Permainan 🎮"}
            </button>
          </div>
        ) : (
          <div className="flex gap-3 w-full">
            <button
              onClick={handleLeaveRoom}
              disabled={isLeaving}
              className="px-5 py-3 rounded-2xl bg-red-100 text-red-600 font-bold text-sm hover:bg-red-200 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isLeaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            </button>
            <div className="flex-1 bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-[#5B5288]" />
              <p className="text-[#5B5288] font-bold text-sm">
                Menunggu host memulai permainan...
              </p>
            </div>
          </div>
        )}
        
        {/* Peringatan Butuh Pemain (Hanya untuk Host) */}
        {isHost && !isEnoughPlayers && (
          <p className="text-red-500 font-semibold text-sm animate-pulse bg-red-50 px-4 py-1.5 rounded-full mt-2">
            ⚠️ Butuh minimal 2 pemain untuk mulai.
          </p>
        )}
      </div>

      {/* MODAL INVITE PEMAIN */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[400px] rounded-3xl p-6 shadow-2xl relative animate-fade-in-up">
            <button
              onClick={() => {
                setShowInviteModal(false);
                setSearchQuery("");
                setResults([]);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-xl font-black text-[#5B5288] mb-4 text-center">
              Undang Teman
            </h2>

            <div className="relative mb-6">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama mahasiswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold text-gray-700 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
              />
            </div>

            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {isSearching ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                </div>
              ) : results.length > 0 ? (
                results.map((mhs) => {
                  const isInvited = invitedIds.includes(mhs.id_user);

                  // BARU: gabungkan status "di room ini" (dari props players)
                  // dengan status global "inRoom" dari tabel mahasiswa.
                  // Kalau salah satu true, mahasiswa dianggap sudah tidak
                  // bisa diundang.
                  const isAlreadyInThisRoom = players.some(p => p.id_user === mhs.id_user);
                  const isUnavailable = mhs.inRoom || isAlreadyInThisRoom;

                  return (
                    <div key={mhs.id_mahasiswa} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                          <img src={mhs.avatar_url || "/images/avatars/avatar1.svg"} alt={mhs.nama_mahasiswa} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-[#5B5288] text-sm max-w-[120px] truncate">
                          {mhs.nama_mahasiswa}
                        </span>
                      </div>

                      {isUnavailable ? (
                        <span className="text-xs font-bold text-gray-400 bg-gray-200 px-3 py-1.5 rounded-lg">Di Ruangan</span>
                      ) : isInvited ? (
                        <span className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1.5 rounded-lg">Terkirim</span>
                      ) : (
                        <button
                          onClick={() => handleSendInvite(mhs.id_user)}
                          className="text-xs font-bold text-white bg-[#5B5288] hover:bg-purple-700 px-4 py-1.5 rounded-lg transition-colors"
                        >
                          Undang
                        </button>
                      )}
                    </div>
                  );
                })
              ) : searchQuery.trim() !== "" ? (
                <p className="text-center text-sm font-semibold text-gray-400 py-4">Mahasiswa tidak ditemukan.</p>
              ) : (
                <p className="text-center text-sm font-semibold text-gray-400 py-4">Ketik nama untuk mencari teman.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
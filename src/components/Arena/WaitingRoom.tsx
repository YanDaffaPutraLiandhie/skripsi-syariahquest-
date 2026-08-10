"use client";

import { Loader2, Crown, Copy, Check, Users } from "lucide-react";
import { useState } from "react";
import type { RoomPlayer } from "@/hooks/useRoom";
import type { PlayerProfile } from "@/hooks/usePlayerProfiles";

type WaitingRoomProps = {
  players: RoomPlayer[];
  isHost: boolean;
  currentUserId: string | null;
  onStart: () => void;
  roomId: string;
  isPrivate: boolean;
  pin: string | null;
  profiles?: Record<string, PlayerProfile>;
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
}: WaitingRoomProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

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

  // Syarat minimal 2 pemain
  const isEnoughPlayers = players.length >= 2;

  return (
    <div className="h-screen bg-[#F8F9FB] flex flex-col items-center justify-center gap-6 px-4 relative overflow-hidden">
      {/* Background ornamen opsional */}
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

          {/* Slot Kosong */}
          {[...Array(4 - players.length)].map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-4 p-2.5 rounded-2xl border border-dashed border-gray-200 opacity-50">
              <div className="w-12 h-12 rounded-full bg-gray-100 border-2 border-white"></div>
              <span className="font-semibold text-gray-400 flex-1 text-sm italic">
                Menunggu pemain...
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="z-10 mt-4 flex flex-col items-center gap-3">
        {isHost ? (
          <>
            <button
              onClick={handleStart}
              disabled={isStarting || !isEnoughPlayers}
              className="px-10 py-4 rounded-2xl bg-[#39C936] text-white font-black text-lg shadow-xl shadow-green-200 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-3"
            >
              {isStarting && <Loader2 className="w-5 h-5 animate-spin" />}
              {isStarting ? "Menyiapkan Arena..." : "Mulai Permainan 🎮"}
            </button>
            {!isEnoughPlayers && (
              <p className="text-red-500 font-semibold text-sm animate-pulse bg-red-50 px-4 py-1.5 rounded-full">
                ⚠️ Butuh minimal 2 pemain untuk mulai.
              </p>
            )}
          </>
        ) : (
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#5B5288]" />
            <p className="text-[#5B5288] font-bold text-sm">
              Menunggu host memulai permainan...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
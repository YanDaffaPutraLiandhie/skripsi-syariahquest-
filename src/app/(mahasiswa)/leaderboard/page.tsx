    "use client";

import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Loader2, Trophy } from "lucide-react";

export default function LeaderboardPage() {
  const { leaderboard, isLoading } = useLeaderboard();
  const { profile } = useCurrentUser();

  // Helper pembuat avatar kalau belum ada foto
  const getAvatar = (url?: string, name?: string) => 
    url || `https://api.dicebear.com/7.x/micah/svg?seed=${name}&backgroundColor=transparent`;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 text-[#5B5288] animate-spin mb-4" />
        <p className="font-bold text-[#5B5288]">Mempersiapkan Podium...</p>
      </div>
    );
  }

  // Pisahkan Top 3 dan Peringkat 4+
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const rank1 = top3[0];
  const rank2 = top3[1];
  const rank3 = top3[2];

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-6 relative z-10 sm:px-4 sm:py-10">
      
      {/* JUDUL HALAMAN (GAMIFIED BANNER) */}
      <div className="relative mb-10 flex flex-col items-center overflow-hidden rounded-[24px] bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] p-5 text-center shadow-lg shadow-[#3d3466]/25 sm:mb-16 sm:rounded-[28px] sm:p-8 lg:p-10">
        {/* Header Banner Background SVGs */}
        <div className="absolute right-[28%] top-6 h-5 w-5 text-white/40">✨</div>
        <div className="absolute right-[8%] top-10 h-4 w-4 text-[#f2c94c] animate-pulse">✨</div>
        <div className="absolute left-[15%] top-12 h-6 w-6 text-white/20">🏆</div>
        
        {/* Banner Decorative Curved Lines */}
        <div className="pointer-events-none absolute -right-10 top-0 opacity-20">
          <svg width="300" height="200" viewBox="0 0 300 200" fill="none">
            <path d="M50 0 C 150 100, 200 50, 300 200" stroke="white" strokeWidth="3" strokeDasharray="6 6" />
            <circle cx="200" cy="80" r="40" stroke="#f2c94c" strokeWidth="2" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-xl backdrop-blur-sm sm:mb-4 sm:h-16 sm:w-16">
            <Trophy className="h-7 w-7 text-[#FFC107] sm:h-8 sm:w-8" />
          </div>
          <h1 className="text-3xl font-black tracking-wide text-white sm:text-4xl">Hall of Fame</h1>
          <p className="mt-2 max-w-xs text-sm font-medium leading-relaxed text-[#c9c3e6] sm:max-w-none">Peringkat tertinggi mahasiswa Syariah-Quest</p>
        </div>

        {/* Bottom Wave Decoration */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 opacity-20">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-full fill-white">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.94,130.83,121.3,201,115.8,241.6,112.5,282.6,98.2,321.39,56.44Z" />
          </svg>
        </div>
      </div>

      {/* ARENA PODIUM TOP 3 */}
      <div className="mb-10 grid grid-cols-3 items-end justify-center gap-2 sm:flex sm:gap-4 md:mb-16 md:gap-8">
        
        {/* JUARA 2 (KIRI) */}
        {rank2 && (
          <div className="order-1 flex min-w-0 flex-col items-center animate-fade-in-up sm:order-none" style={{ animationDelay: "0.2s" }}>
            <div className="relative mb-4">
              <div className="relative z-10 h-16 w-16 overflow-hidden rounded-full border-4 border-gray-300 bg-gray-100 shadow-xl sm:h-20 sm:w-20 md:h-24 md:w-24">
                <img src={getAvatar(rank2.avatar_url, rank2.nama_mahasiswa)} alt="Rank 2" className="w-full h-full object-cover p-1" />
              </div>
              <div className="absolute -bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border-2 border-white bg-gray-300 px-2 py-1 text-[10px] font-black text-gray-800 sm:px-3 sm:text-xs">
                #2
              </div>
            </div>
            <div className="mb-3 w-full min-w-0 text-center sm:mb-4">
              <p className="mx-auto w-full max-w-[88px] truncate text-xs font-bold text-[#5B5288] sm:max-w-[128px] sm:text-base">{rank2.nama_mahasiswa}</p>
              <p className="text-[#39C936] font-extrabold text-sm">{rank2.total_xp} XP</p>
            </div>
            <div className="h-20 w-full max-w-[88px] rounded-t-2xl border border-gray-300 bg-gradient-to-t from-gray-300 to-gray-200 shadow-lg sm:h-24 sm:max-w-[128px] md:h-32"></div>
          </div>
        )}

        {/* JUARA 1 (TENGAH) */}
        {rank1 && (
          <div className="order-2 z-10 flex min-w-0 flex-col items-center animate-fade-in-up sm:order-none">
            <div className="relative mb-4">
              <div className="absolute -top-5 left-1/2 z-30 -translate-x-1/2 text-3xl drop-shadow-md sm:-top-6 sm:text-4xl">👑</div>
              <div className="relative z-10 h-20 w-20 overflow-hidden rounded-full border-[5px] border-[#FFC107] bg-yellow-50 shadow-2xl sm:h-28 sm:w-28 md:h-36 md:w-36">
                <img src={getAvatar(rank1.avatar_url, rank1.nama_mahasiswa)} alt="Rank 1" className="w-full h-full object-cover p-2" />
              </div>
              <div className="absolute -bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border-2 border-white bg-[#FFC107] px-3 py-1 text-xs font-black text-[#5B5288] shadow-md sm:px-4 sm:text-sm">
                #1
              </div>
            </div>
            <div className="mb-3 w-full min-w-0 text-center sm:mb-4">
              <p className="mx-auto w-full max-w-[100px] truncate text-sm font-black text-[#5B5288] sm:max-w-[160px] sm:text-lg">{rank1.nama_mahasiswa}</p>
              <p className="text-[#39C936] font-extrabold">{rank1.total_xp} XP</p>
            </div>
            <div className="h-28 w-full max-w-[100px] rounded-t-2xl border border-yellow-400 bg-gradient-to-t from-[#FFC107] to-yellow-300 shadow-xl sm:h-32 sm:max-w-[160px] md:h-44"></div>
          </div>
        )}

        {/* JUARA 3 (KANAN) */}
        {rank3 && (
          <div className="order-3 flex min-w-0 flex-col items-center animate-fade-in-up sm:order-none" style={{ animationDelay: "0.4s" }}>
            <div className="relative mb-4">
              <div className="relative z-10 h-16 w-16 overflow-hidden rounded-full border-4 border-[#CD7F32] bg-orange-50 shadow-xl sm:h-20 sm:w-20 md:h-24 md:w-24">
                <img src={getAvatar(rank3.avatar_url, rank3.nama_mahasiswa)} alt="Rank 3" className="w-full h-full object-cover p-1" />
              </div>
              <div className="absolute -bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border-2 border-white bg-[#CD7F32] px-2 py-1 text-[10px] font-black text-white sm:px-3 sm:text-xs">
                #3
              </div>
            </div>
            <div className="mb-3 w-full min-w-0 text-center sm:mb-4">
              <p className="mx-auto w-full max-w-[88px] truncate text-xs font-bold text-[#5B5288] sm:max-w-[128px] sm:text-base">{rank3.nama_mahasiswa}</p>
              <p className="text-[#39C936] font-extrabold text-sm">{rank3.total_xp} XP</p>
            </div>
            <div className="h-14 w-full max-w-[88px] rounded-t-2xl border border-orange-400 bg-gradient-to-t from-[#CD7F32] to-orange-300 shadow-lg sm:h-16 sm:max-w-[128px] md:h-20"></div>
          </div>
        )}

      </div>

      {/* DAFTAR PERINGKAT 4 dst... */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 sm:gap-3">
        {rest.length > 0 ? (
          rest.map((player) => {
            const isMe = player.id_mahasiswa === profile?.idMahasiswa;
            return (
              <div 
                key={player.id_mahasiswa} 
                className={`flex min-w-0 items-center justify-between gap-2 rounded-2xl p-3 shadow-sm transition-all sm:p-4 md:p-5 ${isMe ? 'border-2 border-easy/50 bg-easy/10' : 'border border-gray-100 bg-white'}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4 md:gap-6">
                  <span className="w-5 shrink-0 text-center text-xs font-black text-gray-400 sm:w-6 sm:text-base">#{player.rank}</span>
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 shadow-inner sm:h-10 sm:w-10">
                    <img src={getAvatar(player.avatar_url, player.nama_mahasiswa)} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <span className={`min-w-0 truncate text-xs font-bold sm:text-sm md:text-base ${isMe ? 'text-[#39C936]' : 'text-[#5B5288]'}`}>
                    {player.nama_mahasiswa} {isMe && <span className="ml-1 text-xs text-white bg-[#39C936] px-2 py-0.5 rounded-md">Kamu</span>}
                  </span>
                </div>
                <span className="shrink-0 rounded-lg bg-gray-50 px-2 py-1.5 text-xs font-black text-[#5B5288] sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm md:text-base">
                  {player.total_xp} XP
                </span>
              </div>
            );
          })
        ) : (
          <p className="text-center text-gray-400 font-medium pt-8">Belum ada penantang lain...</p>
        )}
      </div>

    </div>
  );
}
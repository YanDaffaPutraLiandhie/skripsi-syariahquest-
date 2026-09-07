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
    <div className="max-w-5xl mx-auto py-10 px-4 relative z-10">
      
      {/* JUDUL HALAMAN (GAMIFIED BANNER) */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] shadow-lg shadow-[#3d3466]/25 mb-16 p-8 lg:p-10 text-center flex flex-col items-center">
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 border border-white/20 rounded-full mb-4 shadow-xl backdrop-blur-sm">
            <Trophy className="w-8 h-8 text-[#FFC107]" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-wide">Hall of Fame</h1>
          <p className="text-[#c9c3e6] mt-2 font-medium">Peringkat tertinggi mahasiswa Syariah-Quest</p>
        </div>

        {/* Bottom Wave Decoration */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 opacity-20">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-full fill-white">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.94,130.83,121.3,201,115.8,241.6,112.5,282.6,98.2,321.39,56.44Z" />
          </svg>
        </div>
      </div>

      {/* ARENA PODIUM TOP 3 */}
      <div className="flex flex-col md:flex-row justify-center items-end gap-4 md:gap-8 mb-16">
        
        {/* JUARA 2 (KIRI) */}
        {rank2 && (
          <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="relative mb-4">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-full border-4 border-gray-300 shadow-xl overflow-hidden z-10 relative">
                <img src={getAvatar(rank2.avatar_url, rank2.nama_mahasiswa)} alt="Rank 2" className="w-full h-full object-cover p-1" />
              </div>
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-gray-300 text-gray-800 font-black text-xs px-3 py-1 rounded-full border-2 border-white z-20">
                #2
              </div>
            </div>
            <div className="text-center mb-4">
              <p className="font-bold text-[#5B5288] truncate w-24 md:w-32">{rank2.nama_mahasiswa}</p>
              <p className="text-[#39C936] font-extrabold text-sm">{rank2.total_xp} XP</p>
            </div>
            <div className="w-24 md:w-32 h-24 md:h-32 bg-gradient-to-t from-gray-300 to-gray-200 rounded-t-2xl shadow-lg border border-gray-300"></div>
          </div>
        )}

        {/* JUARA 1 (TENGAH) */}
        {rank1 && (
          <div className="flex flex-col items-center animate-fade-in-up z-10">
            <div className="relative mb-4">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-4xl drop-shadow-md z-30">👑</div>
              <div className="w-28 h-28 md:w-36 md:h-36 bg-yellow-50 rounded-full border-[6px] border-[#FFC107] shadow-2xl overflow-hidden z-10 relative">
                <img src={getAvatar(rank1.avatar_url, rank1.nama_mahasiswa)} alt="Rank 1" className="w-full h-full object-cover p-2" />
              </div>
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-[#FFC107] text-[#5B5288] font-black text-sm px-4 py-1 rounded-full border-2 border-white z-20 shadow-md">
                #1
              </div>
            </div>
            <div className="text-center mb-4">
              <p className="font-black text-[#5B5288] text-lg truncate w-32 md:w-40">{rank1.nama_mahasiswa}</p>
              <p className="text-[#39C936] font-extrabold">{rank1.total_xp} XP</p>
            </div>
            <div className="w-32 md:w-40 h-32 md:h-44 bg-gradient-to-t from-[#FFC107] to-yellow-300 rounded-t-2xl shadow-xl border border-yellow-400"></div>
          </div>
        )}

        {/* JUARA 3 (KANAN) */}
        {rank3 && (
          <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <div className="relative mb-4">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-orange-50 rounded-full border-4 border-[#CD7F32] shadow-xl overflow-hidden z-10 relative">
                <img src={getAvatar(rank3.avatar_url, rank3.nama_mahasiswa)} alt="Rank 3" className="w-full h-full object-cover p-1" />
              </div>
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-[#CD7F32] text-white font-black text-xs px-3 py-1 rounded-full border-2 border-white z-20">
                #3
              </div>
            </div>
            <div className="text-center mb-4">
              <p className="font-bold text-[#5B5288] truncate w-24 md:w-32">{rank3.nama_mahasiswa}</p>
              <p className="text-[#39C936] font-extrabold text-sm">{rank3.total_xp} XP</p>
            </div>
            <div className="w-24 md:w-32 h-16 md:h-20 bg-gradient-to-t from-[#CD7F32] to-orange-300 rounded-t-2xl shadow-lg border border-orange-400"></div>
          </div>
        )}

      </div>

      {/* DAFTAR PERINGKAT 4 dst... */}
      <div className="max-w-2xl mx-auto flex flex-col gap-3">
        {rest.length > 0 ? (
          rest.map((player) => {
            const isMe = player.id_mahasiswa === profile?.idMahasiswa;
            return (
              <div 
                key={player.id_mahasiswa} 
                className={`flex items-center justify-between p-4 md:p-5 rounded-2xl shadow-sm transition-all hover:scale-[1.01] ${isMe ? 'bg-easy/10 border-2 border-easy/50' : 'bg-white border border-gray-100'}`}
              >
                <div className="flex items-center gap-4 md:gap-6">
                  <span className="font-black text-gray-400 w-6 text-center">#{player.rank}</span>
                  <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden shadow-inner border border-gray-200 shrink-0">
                    <img src={getAvatar(player.avatar_url, player.nama_mahasiswa)} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <span className={`font-bold text-sm md:text-base ${isMe ? 'text-[#39C936]' : 'text-[#5B5288]'}`}>
                    {player.nama_mahasiswa} {isMe && <span className="ml-1 text-xs text-white bg-[#39C936] px-2 py-0.5 rounded-md">Kamu</span>}
                  </span>
                </div>
                <span className="text-sm md:text-base font-black text-[#5B5288] bg-gray-50 px-4 py-2 rounded-xl">
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
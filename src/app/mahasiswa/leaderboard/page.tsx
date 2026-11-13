"use client";

import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import Link from "next/link";
import {
  Loader2,
  Trophy,
  Sparkles,
  Zap,
  RotateCcw,
  AlertCircle,
  Medal,
  Award,
  Crown,
  BookOpen,
} from "lucide-react";

export default function LeaderboardPage() {
  const { profile } = useCurrentUser();
  const { leaderboard, isLoading, error, refetch, myRankInfo } = useLeaderboard(profile?.idMahasiswa);

  // Helper pembuat avatar kalau belum ada foto
  const getAvatar = (url?: string | null, name?: string | null) =>
    url || `https://api.dicebear.com/7.x/micah/svg?seed=${name || "Mahasiswa"}&backgroundColor=transparent`;

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-4 sm:py-10">
        <div className="relative mb-10 flex flex-col items-center overflow-hidden rounded-[24px] bg-gradient-to-br from-[#4a3f7a] to-[#2a224d] p-8 text-center text-white shadow-xl animate-pulse">
          <div className="h-16 w-16 rounded-full bg-white/20 mb-4" />
          <div className="h-8 w-48 rounded-xl bg-white/20 mb-2" />
          <div className="h-4 w-64 rounded-xl bg-white/15" />
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-10 h-10 text-[#5B5288] animate-spin" />
          <p className="font-bold text-[#5B5288] text-sm">Menghitung Skor & Mempersiapkan Podium...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <div className="rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Gagal Memuat Peringkat</h2>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5B5288] hover:bg-[#4A4172] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Coba Lagi</span>
          </button>
        </div>
      </div>
    );
  }

  // Pisahkan Top 3 dan Peringkat 4+
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const rank1 = top3[0];
  const rank2 = top3[1];
  const rank3 = top3[2];

  const hasData = leaderboard.length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-6 relative z-10 sm:px-4 sm:py-10">
      {/* JUDUL HALAMAN (GAMIFIED BANNER) */}
      <div className="relative mb-8 flex flex-col items-center overflow-hidden rounded-[24px] bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] p-6 text-center shadow-lg shadow-[#3d3466]/25 sm:mb-12 sm:rounded-[28px] sm:p-8 lg:p-10">
        <div className="absolute right-[28%] top-6 h-5 w-5 text-white/40">✨</div>
        <div className="absolute right-[8%] top-10 h-4 w-4 text-[#f2c94c] animate-pulse">✨</div>
        <div className="absolute left-[15%] top-12 h-6 w-6 text-white/20">🏆</div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-xl backdrop-blur-sm sm:mb-4 sm:h-16 sm:w-16">
            <Trophy className="h-7 w-7 text-[#FFC107] sm:h-8 sm:w-8" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1 text-xs font-black text-[#e2dcff] shadow-inner mb-2 border border-white/10">
            <Sparkles className="h-3 w-3 text-amber-300" />
            Papan Peringkat Mahasiswa
          </span>
          <h1 className="text-3xl font-black tracking-wide text-white sm:text-4xl">Hall of Fame</h1>
          <p className="mt-2 max-w-md text-xs sm:text-sm font-medium leading-relaxed text-[#c9c3e6]">
            Peringkat akumulasi poin XP mahasiswa Syariah-Quest berdasarkan aktivitas kuis, modul, dan evaluasi adaptif.
          </p>
        </div>
      </div>

      {/* STATUS RANK PEMAIN YANG SEDANG LOGIN (MY HUD CARD) */}
      {profile?.idMahasiswa && myRankInfo && (
        <div className="mb-8 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-[#2e1d52] via-[#24173F] to-[#1a1230] p-4 text-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-amber-400 bg-white/10">
                <img
                  src={getAvatar(profile.avatarUrl, profile.namaMahasiswa)}
                  alt="Avatar Anda"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  Peringkatmu Saat Ini
                </span>
                <h3 className="text-sm sm:text-base font-black text-white">{profile.namaMahasiswa}</h3>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-center">
                <span className="text-[10px] text-purple-200 uppercase font-bold">Posisi</span>
                <p className="text-lg sm:text-xl font-black text-amber-300">#{myRankInfo.rank}</p>
              </div>

              <div className="text-center">
                <span className="text-[10px] text-purple-200 uppercase font-bold">Total XP</span>
                <p className="text-lg sm:text-xl font-black text-emerald-400 flex items-center gap-1">
                  <Zap className="h-4 w-4 fill-emerald-400" />
                  {myRankInfo.total_xp}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JIKA DATA KOSONG */}
      {!hasData ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Trophy className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-black text-gray-800">Belum Ada Catatan Peringkat</h3>
          <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
            Jadilah mahasiswa pertama yang menyelesaikan kuis dan menempati puncak podium Hall of Fame!
          </p>
          <Link
            href="/mahasiswa/modul"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#5B5288] hover:bg-[#4A4172] px-6 py-2.5 text-xs font-bold text-white shadow-md transition"
          >
            <BookOpen className="h-4 w-4" />
            <span>Mulai Pembelajaran Modul</span>
          </Link>
        </div>
      ) : (
        <>
          {/* ARENA PODIUM TOP 3 */}
          <div className="mb-10 grid grid-cols-3 items-end justify-center gap-2 sm:flex sm:gap-4 md:mb-16 md:gap-8">
            {/* JUARA 2 (KIRI) */}
            {rank2 ? (
              <div className="order-1 flex min-w-0 flex-col items-center sm:order-none">
                <div className="relative mb-3">
                  <div className="relative z-10 h-16 w-16 overflow-hidden rounded-full border-4 border-slate-300 bg-slate-100 shadow-xl sm:h-20 sm:w-20 md:h-24 md:w-24">
                    <img
                      src={getAvatar(rank2.avatar_url, rank2.nama_mahasiswa)}
                      alt={rank2.nama_mahasiswa}
                      className="w-full h-full object-cover p-1"
                    />
                  </div>
                  <div className="absolute -bottom-2.5 left-1/2 z-20 -translate-x-1/2 rounded-full border-2 border-white bg-slate-400 px-2.5 py-0.5 text-[10px] font-black text-white shadow-md">
                    #2
                  </div>
                </div>
                <div className="mb-2 w-full min-w-0 text-center">
                  <p className="mx-auto w-full max-w-[88px] truncate text-xs font-bold text-[#5B5288] sm:max-w-[128px] sm:text-sm">
                    {rank2.nama_mahasiswa}
                  </p>
                  <p className="text-emerald-600 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-0.5">
                    <Zap className="h-3 w-3 fill-emerald-600 shrink-0" />
                    {rank2.total_xp} XP
                  </p>
                </div>
                <div className="h-20 w-full max-w-[88px] rounded-t-2xl border border-slate-300 bg-gradient-to-t from-slate-300 to-slate-200 shadow-lg sm:h-24 sm:max-w-[128px] md:h-28 flex items-center justify-center text-slate-500 font-black text-sm">
                  2
                </div>
              </div>
            ) : null}

            {/* JUARA 1 (TENGAH) */}
            {rank1 ? (
              <div className="order-2 z-10 flex min-w-0 flex-col items-center sm:order-none">
                <div className="relative mb-3">
                  <div className="absolute -top-5 left-1/2 z-30 -translate-x-1/2 text-3xl drop-shadow-md sm:-top-6 sm:text-4xl animate-bounce">
                    👑
                  </div>
                  <div className="relative z-10 h-20 w-20 overflow-hidden rounded-full border-[5px] border-amber-400 bg-yellow-50 shadow-2xl sm:h-28 sm:w-28 md:h-32 md:w-32">
                    <img
                      src={getAvatar(rank1.avatar_url, rank1.nama_mahasiswa)}
                      alt={rank1.nama_mahasiswa}
                      className="w-full h-full object-cover p-1.5"
                    />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border-2 border-white bg-amber-400 px-3 py-0.5 text-xs font-black text-slate-900 shadow-md">
                    #1
                  </div>
                </div>
                <div className="mb-2 w-full min-w-0 text-center">
                  <p className="mx-auto w-full max-w-[100px] truncate text-xs font-black text-[#5B5288] sm:max-w-[160px] sm:text-base">
                    {rank1.nama_mahasiswa}
                  </p>
                  <p className="text-emerald-600 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-0.5">
                    <Zap className="h-3 w-3 fill-emerald-600 shrink-0" />
                    {rank1.total_xp} XP
                  </p>
                </div>
                <div className="h-28 w-full max-w-[100px] rounded-t-2xl border border-amber-300 bg-gradient-to-t from-amber-400 to-yellow-300 shadow-xl sm:h-32 sm:max-w-[160px] md:h-40 flex items-center justify-center text-amber-900 font-black text-base">
                  1
                </div>
              </div>
            ) : null}

            {/* JUARA 3 (KANAN) */}
            {rank3 ? (
              <div className="order-3 flex min-w-0 flex-col items-center sm:order-none">
                <div className="relative mb-3">
                  <div className="relative z-10 h-16 w-16 overflow-hidden rounded-full border-4 border-amber-700/50 bg-orange-50 shadow-xl sm:h-20 sm:w-20 md:h-24 md:w-24">
                    <img
                      src={getAvatar(rank3.avatar_url, rank3.nama_mahasiswa)}
                      alt={rank3.nama_mahasiswa}
                      className="w-full h-full object-cover p-1"
                    />
                  </div>
                  <div className="absolute -bottom-2.5 left-1/2 z-20 -translate-x-1/2 rounded-full border-2 border-white bg-amber-700 px-2.5 py-0.5 text-[10px] font-black text-white shadow-md">
                    #3
                  </div>
                </div>
                <div className="mb-2 w-full min-w-0 text-center">
                  <p className="mx-auto w-full max-w-[88px] truncate text-xs font-bold text-[#5B5288] sm:max-w-[128px] sm:text-sm">
                    {rank3.nama_mahasiswa}
                  </p>
                  <p className="text-emerald-600 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-0.5">
                    <Zap className="h-3 w-3 fill-emerald-600 shrink-0" />
                    {rank3.total_xp} XP
                  </p>
                </div>
                <div className="h-16 w-full max-w-[88px] rounded-t-2xl border border-amber-700/30 bg-gradient-to-t from-amber-600/70 to-amber-500/70 shadow-lg sm:h-20 sm:max-w-[128px] md:h-24 flex items-center justify-center text-amber-950 font-black text-sm">
                  3
                </div>
              </div>
            ) : null}
          </div>

          {/* DAFTAR PERINGKAT 4 DST */}
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 px-2">
              Daftar Penantang (Peringkat 4+)
            </h3>
            {rest.length > 0 ? (
              rest.map((player) => {
                const isMe = player.id_mahasiswa === profile?.idMahasiswa;
                return (
                  <div
                    key={player.id_mahasiswa}
                    className={`flex min-w-0 items-center justify-between gap-2 rounded-2xl p-3.5 shadow-xs transition-all ${isMe
                        ? "border-2 border-amber-400 bg-amber-50/60 shadow-sm"
                        : "border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                      }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="w-6 shrink-0 text-center text-xs font-black text-slate-400">
                        #{player.rank}
                      </span>
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-slate-50">
                        <img
                          src={getAvatar(player.avatar_url, player.nama_mahasiswa)}
                          alt={player.nama_mahasiswa}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-xs sm:text-sm font-bold ${isMe ? "text-amber-950" : "text-slate-800"}`}>
                          {player.nama_mahasiswa}
                          {isMe && (
                            <span className="ml-2 inline-block rounded-md bg-amber-400 px-1.5 py-0.2 text-[10px] font-black text-slate-900">
                              Kamu
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-xl bg-slate-50 border border-slate-100 px-3 py-1.5 text-xs font-black text-emerald-600 flex items-center gap-1">
                      <Zap className="h-3 w-3 fill-emerald-600" />
                      {player.total_xp} XP
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs text-gray-400 py-4">Belum ada penantang lainnya di daftar ini.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Loader2, Star } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useBadges } from "@/hooks/useBadges";
import { useLeaderboard } from "@/hooks/useLeaderboard";

type ModulDB = {
  id_modul: number;
  nama_modul: string;
  id_level: number;
};

type ProgressDB = {
  id_modul: number;
  nilai: number;
  selesai: boolean;
  materi_dilihat: boolean;
  kuis_dicoba: boolean;
  modul: {
    nama_modul: string;
    id_level: number;
  };
};

// =====================================================
// Info visual tiap level modul — sama seperti yang
// dipakai di dashboard dosen, supaya tampilan "Modul"
// konsisten di kedua sisi.
// =====================================================
function getLevelInfo(idLevel: number) {
  if (idLevel === 1)
    return { label: "E", name: "Mudah", color: "bg-emerald-500", stars: 1 };
  if (idLevel === 2)
    return { label: "M", name: "Sedang", color: "bg-amber-400", stars: 2 };
  return { label: "H", name: "Sulit", color: "bg-rose-500", stars: 3 };
}

// Baris bintang kecil ala kartu game — merepresentasikan
// tingkat kesulitan modul (1-3).
function LevelStars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= count ? "fill-amber-400 text-amber-400" : "fill-transparent text-[#d9d4ef]"
            }`}
        />
      ))}
    </div>
  );
}

const LEVEL_FILTERS = ["Semua", "Mudah", "Sedang", "Sulit"] as const;
type LevelFilter = (typeof LEVEL_FILTERS)[number];

export default function Dashboard() {
  const router = useRouter();

  const { profile, isLoading: isProfileLoading } = useCurrentUser();
  const { badges, isLoading: isBadgesLoading } = useBadges(profile?.idMahasiswa);
  const { leaderboard, isLoading: isLeaderboardLoading } = useLeaderboard();

  const [modulTersedia, setModulTersedia] = useState<ModulDB[]>([]);
  const [progressList, setProgressList] = useState<ProgressDB[]>([]);
  const [lastActiveModulId, setLastActiveModulId] = useState<number | null>(null);

  const [isModulLoading, setIsModulLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("Semua");

  const filteredModul = useMemo(() => {
    if (levelFilter === "Semua") return modulTersedia;
    return modulTersedia.filter((m) => getLevelInfo(m.id_level).name === levelFilter);
  }, [modulTersedia, levelFilter]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!profile?.idMahasiswa) return;
      setIsModulLoading(true);

      const { data: dataModul } = await supabase
        .from("modul")
        .select("id_modul, nama_modul, id_level");

      if (dataModul) setModulTersedia(dataModul);

      const { data: dataProgress } = await supabase
        .from("progress_modul")
        .select(`
          id_modul,
          nilai,
          selesai,
          materi_dilihat,
          kuis_dicoba,
          modul (
            nama_modul,
            id_level
          )
        `)
        .eq("id_mahasiswa", profile.idMahasiswa)
        .order("tanggal_selesai", { ascending: false });

      if (dataProgress) {
        const formattedProgress = dataProgress as unknown as ProgressDB[];
        setProgressList(formattedProgress);

        const unfinished = formattedProgress.find((p) => p.selesai === false);
        if (unfinished) {
          setLastActiveModulId(unfinished.id_modul);
        }
      }

      setIsModulLoading(false);
    }

    fetchDashboardData();
  }, [profile?.idMahasiswa]);

  const handleLanjutkan = () => {
    if (lastActiveModulId) {
      router.push(`/modul/${lastActiveModulId}`);
    } else {
      router.push(`/modul`);
    }
  };

  if (isProfileLoading) {
    return <div className="p-8 text-[#5B5288] font-bold">Memuat Dashboard...</div>;
  }

  return (
    <div className="space-y-8 relative z-10 pt-2 lg:pt-4">
      {/* BANNER UTAMA */}
      <div className="relative">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] p-8 shadow-lg shadow-[#3d3466]/25 lg:p-10 flex items-center justify-between">
          {/* Header Banner Background SVGs */}
          <div className="absolute right-[28%] top-6 h-5 w-5 text-white/40">✨</div>
          <div className="absolute right-[8%] top-10 h-4 w-4 text-[#f2c94c] animate-pulse">✨</div>

          {/* Banner Decorative Curved Lines */}
          <div className="pointer-events-none absolute -right-10 top-0 opacity-20">
            <svg width="300" height="200" viewBox="0 0 300 200" fill="none">
              <path d="M50 0 C 150 100, 200 50, 300 200" stroke="white" strokeWidth="3" strokeDasharray="6 6" />
              <circle cx="200" cy="80" r="40" stroke="#f2c94c" strokeWidth="2" />
            </svg>
          </div>

          <div className="z-10 text-white space-y-4 max-w-xl relative">
            <h1 className="text-3xl lg:text-4xl font-black leading-snug tracking-wide">
              Halo, {profile?.namaMahasiswa?.split(" ")[0] || "Pemain"}! <br />
              <span className="font-semibold text-xl lg:text-2xl text-[#c9c3e6]">
                Siap melanjutkan petualangan?
              </span>
            </h1>

            <button
              onClick={handleLanjutkan}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-amber-950 transition-all hover:bg-amber-300 hover:shadow-lg hover:shadow-amber-400/20 active:scale-95"
            >
              {lastActiveModulId ? "Lanjutkan Pembelajaran" : "Mulai Pembelajaran"}
            </button>
          </div>

          <div className="absolute right-0 bottom-[-20px] z-0 h-[110%] flex items-end pointer-events-none opacity-90">
            <img
              src="/images/hero-dashboard.svg"
              alt="Hero Dashboard"
              className="h-full w-auto object-contain object-bottom"
            />
          </div>

          {/* Bottom Wave Decoration */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 opacity-20">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-full fill-white">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.94,130.83,121.3,201,115.8,241.6,112.5,282.6,98.2,321.39,56.44Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* GRID 3 KOLOM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pt-2">
        {/* KOLOM 1: MODUL TERSEDIA — gaya kartu "quest" sama seperti dashboard dosen */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#3d3466]">Modul Tersedia</h3>
            {!isModulLoading && modulTersedia.length > 0 && (
              <span className="rounded-full bg-[#4a3f7a]/10 px-2.5 py-1 text-xs font-semibold text-[#4a3f7a]">
                {modulTersedia.length} quest
              </span>
            )}
          </div>

          {/* Pill filter tingkat kesulitan */}
          <div className="flex flex-wrap gap-2">
            {LEVEL_FILTERS.map((f) => {
              const active = levelFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setLevelFilter(f)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${active
                      ? "bg-[#4a3f7a] text-white shadow-sm shadow-[#4a3f7a]/30"
                      : "bg-white text-[#4a3f7a]/70 ring-1 ring-[#4a3f7a]/15 hover:bg-[#f4f2fa]"
                    }`}
                >
                  {f}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 content-start items-start gap-3 overflow-y-auto pb-1 pr-1 sm:grid-cols-3 lg:grid-cols-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden h-[384px]">
            {isModulLoading ? (
              <p className="col-span-full text-sm text-[#4a3f7a]">Memuat data...</p>
            ) : filteredModul.length > 0 ? (
              filteredModul.map((modul, i) => {
                const lvl = getLevelInfo(modul.id_level);
                const tilt = i % 2 === 0 ? "-rotate-2" : "rotate-2";

                return (
                  <div
                    key={modul.id_modul}
                    className="flex shrink-0 flex-col rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:rotate-1 hover:shadow-lg hover:shadow-[#4a3f7a]/10"
                  >
                    <div
                      className={`mx-auto flex h-16 w-16 ${tilt} items-center justify-center rounded-2xl shadow-md ${lvl.color}`}
                    >
                      <span className="text-2xl font-black text-white">{lvl.label}</span>
                    </div>

                    <h4 className="mt-3 line-clamp-2 min-h-[2.5rem] text-center text-sm font-bold text-[#2b2540]">
                      {modul.nama_modul}
                    </h4>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <LevelStars count={lvl.stars} />

                      <button
                        onClick={() => router.push(`/modul/${modul.id_modul}`)}
                        className="shrink-0 rounded-full bg-[#4a3f7a] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#3d3466]"
                      >
                        Lihat
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="col-span-full text-sm text-[#a79fd6]">
                {modulTersedia.length > 0
                  ? "Tidak ada modul di tingkat ini."
                  : "Belum ada modul tersedia."}
              </p>
            )}
          </div>
        </div>

        {/* KOLOM 2: PROGRESS & STATISTIK */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-[#3d3466]">Progress Belajar</h3>

          <div className="flex flex-col gap-3 h-[256px] overflow-y-auto pr-1 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {isModulLoading ? (
              <p className="text-[#3d3466] font-semibold text-sm">Memuat data...</p>
            ) : (
              <>
                {progressList.map((prog, idx) => {
                  const lvl = getLevelInfo(prog.modul.id_level);

                  let persentase = 0;
                  if (prog.selesai) {
                    persentase = 100;
                  } else if (prog.kuis_dicoba) {
                    persentase = 40 + Math.round(((prog.nilai || 0) / 100) * 60);
                  } else if (prog.materi_dilihat) {
                    persentase = 40;
                  }

                  return (
                    <div
                      key={idx}
                      onClick={() => router.push(`/modul/${prog.id_modul}`)}
                      className="flex items-center justify-between p-4 rounded-[22px] bg-white shadow-sm ring-1 ring-black/5 cursor-pointer hover:bg-purple-50 hover:shadow-md hover:ring-[#4a3f7a]/30 transition-all shrink-0"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 ${lvl.color} rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md`}
                        >
                          {lvl.label}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#2b2540] text-sm lg:text-base">
                            {prog.modul.nama_modul}
                          </h4>
                          <p className="text-xs text-gray-500 font-medium">
                            {prog.selesai ? "Selesai" : "Sedang Dikerjakan"}
                          </p>
                        </div>
                      </div>
                      <span className="text-emerald-500 font-black text-sm lg:text-base">
                        {persentase}%
                      </span>
                    </div>
                  );
                })}

                {/* Empty placeholders to fill up to 3 cards */}
                {Array.from({ length: Math.max(0, 3 - progressList.length) }).map((_, idx) => (
                  <div
                    key={`empty-prog-${idx}`}
                    className="flex items-center justify-between p-4 rounded-[22px] bg-white/60 shadow-sm ring-1 ring-black/5 border border-dashed border-gray-300 shrink-0 opacity-70"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                        <span className="text-gray-400 font-bold text-xl">-</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-400 text-sm lg:text-base">
                          Belum Ada Progress
                        </h4>
                        <p className="text-xs text-gray-400 font-medium">
                          Mainkan modul untuk mengisi
                        </p>
                      </div>
                    </div>
                    <span className="text-gray-300 font-black text-sm lg:text-base">0%</span>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="bg-white rounded-[22px] p-5 shadow-sm ring-1 ring-black/5 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold text-[#3d3466] mb-2 uppercase tracking-wide">Total XP</p>
              <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center text-amber-950 font-black text-xl shadow-inner border border-amber-300">
                {profile?.totalXp || 0}
              </div>
            </div>
            <div
              onClick={() => router.push("/profile")}
              className="bg-white rounded-[22px] p-5 shadow-sm ring-1 ring-black/5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-purple-50 transition-colors"
            >
              <p className="text-xs font-bold text-[#3d3466] mb-2 uppercase tracking-wide">Badges</p>
              <div className="text-3xl font-black text-[#4a3f7a]">
                {isBadgesLoading ? "-" : badges.length}
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM 3: LEADERBOARD */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#3d3466]">Leaderboard</h3>
            <button
              onClick={() => router.push("/leaderboard")}
              className="text-xs font-bold text-[#a79fd6] hover:text-[#4a3f7a] transition-colors flex items-center gap-1"
            >
              Semua
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <div className="bg-white rounded-[22px] p-4 shadow-sm ring-1 ring-black/5 flex flex-col gap-1 h-fit">
            {isLeaderboardLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-8 h-8 text-[#5B5288] animate-spin" />
              </div>
            ) : leaderboard.length > 0 ? (
              leaderboard.slice(0, 5).map((player) => {
                const isMe = player.id_mahasiswa === profile?.idMahasiswa;
                const avatarSrc =
                  player.avatar_url ||
                  `https://api.dicebear.com/7.x/micah/svg?seed=${player.nama_mahasiswa}&backgroundColor=transparent`;

                return (
                  <div
                    key={player.id_mahasiswa}
                    className={`flex items-center justify-between p-2.5 rounded-2xl transition hover:bg-[#f4f2fa] ${isMe ? "bg-[#e2dcff] ring-1 ring-[#4a3f7a]/20" : ""
                      }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="w-4 shrink-0 text-center text-xs font-bold text-[#c9c3e6]">
                        {String(player.rank).padStart(2, "0")}
                      </span>

                      <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden shadow-sm ring-2 ring-white shrink-0">
                        <img src={avatarSrc} alt={player.nama_mahasiswa} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#2b2540] truncate max-w-[90px] lg:max-w-[120px]">
                            {player.nama_mahasiswa}
                          </span>
                          {isMe && (
                            <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-black shrink-0">
                              KAMU
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                          {player.rank === 1 && <span className="text-amber-400">🏆</span>}
                          {player.rank === 2 && <span className="text-gray-400">🥈</span>}
                          {player.rank === 3 && <span className="text-orange-400">🥉</span>}
                          {player.rank > 3 && "Peringkat"} {player.rank > 3 ? player.rank : ""}
                        </span>
                      </div>
                    </div>

                    <span className="text-sm font-black text-amber-500 shrink-0 ml-2 bg-amber-50 px-2 py-1 rounded-full ring-1 ring-amber-200/50">
                      {player.total_xp} <span className="text-[9px] font-bold text-amber-600/70">XP</span>
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-[#a79fd6] text-sm text-center pt-8 pb-8">Belum ada data klasemen.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
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

export default function Dashboard() {
  const router = useRouter();

  const { profile, isLoading: isProfileLoading } = useCurrentUser();
  const { badges, isLoading: isBadgesLoading } = useBadges(profile?.idMahasiswa);
  const { leaderboard, isLoading: isLeaderboardLoading } = useLeaderboard();

  const [modulTersedia, setModulTersedia] = useState<ModulDB[]>([]);
  const [progressList, setProgressList] = useState<ProgressDB[]>([]);
  const [lastActiveModulId, setLastActiveModulId] = useState<number | null>(null);
  
  const [isModulLoading, setIsModulLoading] = useState(true);

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

        const unfinished = formattedProgress.find(p => p.selesai === false);
        if (unfinished) {
          setLastActiveModulId(unfinished.id_modul);
        }
      }

      setIsModulLoading(false);
    }

    fetchDashboardData();
  }, [profile?.idMahasiswa]);

  const getLevelInfo = (levelId: number) => {
    if (levelId === 1) return { label: "E", color: "bg-emerald-500", stars: 1 };
    if (levelId === 2) return { label: "M", color: "bg-amber-400", stars: 2 };
    return { label: "H", color: "bg-rose-500", stars: 3 };
  };

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
              Halo, {profile?.namaMahasiswa?.split(' ')[0] || 'Pemain'}! <br />
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
        
        {/* KOLOM 1: MODUL TERSEDIA */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#3d3466]">Modul Tersedia</h3>
            {!isModulLoading && modulTersedia.length > 0 && (
              <span className="rounded-full bg-[#4a3f7a]/10 px-2.5 py-1 text-xs font-semibold text-[#4a3f7a]">
                {modulTersedia.length} modul
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-1 pr-1 sm:grid-cols-3 lg:grid-cols-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden h-[384px]">
            {isModulLoading ? (
              <p className="col-span-full text-sm text-[#4a3f7a]">Memuat data...</p>
            ) : modulTersedia.length > 0 ? (
              modulTersedia.map((modul, i) => {
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
                      <span className="text-2xl font-black text-white">
                        {lvl.label}
                      </span>
                    </div>

                    <h4 className="mt-3 line-clamp-2 min-h-[2.5rem] text-center text-sm font-bold text-[#2b2540]">
                      {modul.nama_modul}
                    </h4>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="flex gap-0.5">
                        {[...Array(3)].map((_, index) => (
                          <svg
                            key={index}
                            className={`h-3 w-3 ${
                              index < lvl.stars ? "text-amber-400" : "text-gray-200"
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>

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
              <p className="col-span-full text-sm text-[#a79fd6]">Belum ada modul tersedia.</p>
            )}
          </div>
        </div>

        {/* KOLOM 2: PROGRESS & STATISTIK */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold text-[#5B5288]">Progress</h3>
          
          {/* PERBAIKAN: Tinggi mutlak h-[272px] ngepas untuk 3 modul */}
          <div className="flex flex-col gap-4 h-[272px] overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {isModulLoading ? (
              <p className="text-[#5B5288] font-semibold text-sm">Memuat data...</p>
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
                      className="flex items-center justify-between p-4 rounded-2xl border-2 border-[#5B5288] bg-white cursor-pointer hover:bg-purple-50 hover:shadow-md hover:border-purple-400 transition-all shrink-0"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${lvl.color} rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm`}>
                          {lvl.label}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#5B5288] text-sm lg:text-base">{prog.modul.nama_modul}</h4>
                          <p className="text-xs text-gray-500">{prog.selesai ? "Selesai" : "Sedang Dikerjakan"}</p>
                        </div>
                      </div>
                      <span className="text-[#39C936] font-bold text-sm lg:text-base">
                        {persentase} %
                      </span>
                    </div>
                  );
                })}
                
                {/* Empty placeholders to fill up to 3 cards */}
                {Array.from({ length: Math.max(0, 3 - progressList.length) }).map((_, idx) => (
                  <div 
                    key={`empty-prog-${idx}`} 
                    className="flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 shrink-0 opacity-70"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                        <span className="text-gray-400 font-bold text-xl">-</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-400 text-sm lg:text-base">Belum Ada Progress</h4>
                        <p className="text-xs text-gray-400">Mainkan modul untuk mengisi slot ini</p>
                      </div>
                    </div>
                    <span className="text-gray-300 font-bold text-sm lg:text-base">
                      0 %
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="bg-white rounded-[20px] p-5 border-2 border-[#5B5288] flex flex-col items-center justify-center text-center">
              <p className="text-sm font-bold text-[#5B5288] mb-3">Total XP / Poin</p>
              <div className="w-14 h-14 bg-[#FFC107] rounded-full flex items-center justify-center text-[#5B5288] font-black text-xl shadow-inner border-2 border-[#E5A800]">
                {profile?.totalXp || 0}
              </div>
            </div>
            <div onClick={() => router.push('/profile')} className="bg-white rounded-[20px] p-5 border-2 border-[#5B5288] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-purple-50 transition-colors">
              <p className="text-sm font-bold text-[#5B5288] mb-3">Badges</p>
              <div className="text-4xl font-black text-[#5B5288]">
                {isBadgesLoading ? "-" : badges.length}
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM 3: LEADERBOARD */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-[#5B5288]">Leaderboard</h3>
            <button 
              onClick={() => router.push('/leaderboard')}
              className="text-xs font-bold text-gray-500 hover:text-[#5B5288] transition-colors flex items-center gap-1"
            >
              Lihat Semua
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-col gap-1 h-fit">
            {isLeaderboardLoading ? (
              <div className="flex items-center justify-center py-10">
                 <Loader2 className="w-8 h-8 text-[#5B5288] animate-spin" />
              </div>
            ) : leaderboard.length > 0 ? (
              leaderboard.slice(0, 5).map((player) => {
                const isMe = player.id_mahasiswa === profile?.idMahasiswa;
                const avatarSrc = player.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${player.nama_mahasiswa}&backgroundColor=transparent`;

                return (
                  <div 
                    key={player.id_mahasiswa} 
                    className={`flex items-center justify-between py-3 border-b border-gray-100 last:border-0 ${isMe ? 'bg-green-50/50 -mx-3 px-3 rounded-xl' : ''}`}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                        <img src={avatarSrc} alt={player.nama_mahasiswa} className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#5B5288] truncate max-w-[90px] lg:max-w-[120px]">
                            {player.nama_mahasiswa} 
                          </span>
                          {isMe && (
                            <span className="text-[10px] bg-[#39C936] text-white px-1.5 py-0.5 rounded font-black shrink-0">
                              KAMU
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                          {player.rank === 1 && <span className="text-[#FFC107]">🏆</span>}
                          {player.rank === 2 && <span className="text-gray-400">🥈</span>}
                          {player.rank === 3 && <span className="text-[#CD7F32]">🥉</span>}
                          Peringkat {player.rank}
                        </span>
                      </div>
                    </div>
                    
                    <span className="text-sm font-black text-[#F4A261] shrink-0 ml-2">
                      {player.total_xp} <span className="text-[10px] text-gray-400">XP</span>
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-sm text-center pt-8 pb-8">Belum ada data klasemen.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
} 
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
        .select("id_modul, nama_modul, id_level")
        .limit(4);

      if (dataModul) setModulTersedia(dataModul);

      const { data: dataProgress } = await supabase
        .from("progress_modul")
        .select(`
          id_modul,
          nilai,
          selesai,
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
    if (levelId === 1) return { label: "E", color: "bg-[#39C936]" };
    if (levelId === 2) return { label: "M", color: "bg-[#FFC107]" };
    return { label: "H", color: "bg-[#EF4444]" };
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
    <div className="space-y-8">
      {/* BANNER UTAMA */}
      <div className="bg-[#5B5288] rounded-[30px] p-10 lg:p-14 flex items-center justify-between relative shadow-lg h-72 lg:h-80 mt-8 overflow-hidden">
        <div className="z-10 text-white space-y-4 max-w-xl">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
            Halo, {profile?.namaMahasiswa?.split(' ')[0] || 'Pemain'}! <br />
            <span className="font-normal text-2xl lg:text-3xl">
              Siap melanjutkan petualangan?
            </span>
          </h1>

          <button
            onClick={handleLanjutkan}
            className="bg-[#D6D2E7] hover:bg-[#C5C0DA] text-[#5B5288] font-bold text-base lg:text-lg px-6 py-3 rounded-xl transition-all shadow-md mt-4"
          >
            {lastActiveModulId ? "Lanjutkan Pembelajaran" : "Mulai Pembelajaran"}
          </button>
        </div>

        {/* Gambar Ilustrasi Banner - Diperbaiki posisinya */}
        <div className="absolute right-0 bottom-[-20px] z-0 h-[110%] flex items-end pointer-events-none">
          <img
            src="/images/hero-dashboard.svg" 
            alt="Hero Dashboard"
            className="h-full w-auto object-contain object-bottom"
          />
        </div>
      </div>

      {/* GRID 3 KOLOM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pt-2">
        
        {/* KOLOM 1: MODUL TERSEDIA */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold text-[#5B5288]">Modul Tersedia</h3>
          
          <div className="flex flex-col gap-4">
            {isModulLoading ? (
              <p className="text-[#5B5288] font-semibold text-sm">Memuat data...</p>
            ) : modulTersedia.length > 0 ? (
              modulTersedia.map((modul) => {
                const lvl = getLevelInfo(modul.id_level);
                return (
                  <div key={modul.id_modul} className="flex items-center justify-between p-4 rounded-2xl border-2 border-[#5B5288] bg-white hover:bg-purple-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${lvl.color} rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm`}>
                        {lvl.label}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#5B5288] text-sm lg:text-base">{modul.nama_modul}</h4>
                        <p className="text-xs text-gray-500">1+ Modul</p>
                      </div>
                    </div>
                    <Link href={`/modul/${modul.id_modul}`} className="px-5 py-2 bg-[#E6E4F0] text-[#5B5288] text-sm font-bold rounded-lg hover:bg-[#D6D2E7] transition-colors">
                      Lihat
                    </Link>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-sm">Belum ada modul tersedia.</p>
            )}
          </div>
        </div>

        {/* KOLOM 2: PROGRESS & STATISTIK */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold text-[#5B5288]">Progress</h3>
          
          <div className="flex flex-col gap-4">
            {isModulLoading ? (
              <p className="text-[#5B5288] font-semibold text-sm">Memuat data...</p>
            ) : progressList.length > 0 ? (
              progressList.slice(0, 3).map((prog, idx) => {
                const lvl = getLevelInfo(prog.modul.id_level);
                const persentase = prog.selesai ? 100 : (prog.nilai || 0);

                return (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border-2 border-[#5B5288] bg-white">
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
              })
            ) : (
              <p className="text-gray-400 text-sm">Belum ada progress belajar.</p>
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
        <div className="bg-[#5B5288] rounded-[30px] p-6 lg:p-8 shadow-sm flex flex-col">
          <h3 className="text-xl font-bold text-white mb-6">Leaderboard</h3>
          
          {/* Scrollbar dihilangkan dengan custom class "no-scrollbar" */}
          <div className="flex flex-col gap-3 flex-1 max-h-[320px] overflow-y-auto pr-2 no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {isLeaderboardLoading ? (
              <div className="flex items-center justify-center h-full">
                 <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            ) : leaderboard.length > 0 ? (
              leaderboard.map((player) => {
                const isMe = player.id_mahasiswa === profile?.idMahasiswa;
                
                const getRankIcon = (rank: number) => {
                  if (rank === 1) return "🥇";
                  if (rank === 2) return "🥈";
                  if (rank === 3) return "🥉";
                  return <span className="text-[#5B5288] font-bold text-sm px-1">#{rank}</span>;
                };

                return (
                  <div key={player.id_mahasiswa} className={`flex items-center justify-between p-3 lg:p-4 rounded-2xl transition-all ${isMe ? 'bg-easy/20 border-2 border-easy/50' : 'bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl w-6 text-center">{getRankIcon(player.rank)}</span>
                      <span className={`font-bold text-sm ${isMe ? 'text-white' : 'text-[#5B5288]'}`}>
                        {player.nama_mahasiswa} {isMe && "(Kamu)"}
                      </span>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${isMe ? 'bg-easy text-white' : 'bg-[#E6E4F0] text-[#5B5288]'}`}>
                      {player.total_xp} XP
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-white/70 text-sm text-center pt-10">Belum ada klasemen.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
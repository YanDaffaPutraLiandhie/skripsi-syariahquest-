"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Loader2, Star, Trophy, BookOpen, ArrowRight, Lock } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import MissionMap, { MissionNode } from "@/components/Modul/MissionMap";
import CharacterSelectionModal from "@/components/visual-novel/CharacterSelectionModal";
import { getModuleAccess, type AdaptiveProgress } from "@/lib/adaptiveLearning";
import { getSelectedMentor } from "@/constants/mentors";

type ModulDB = {
  id_modul: number;
  nama_modul: string;
  id_level: number;
  parameter_nilai: number | null;
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

function getLevelInfo(idLevel: number) {
  if (idLevel === 1)
    return { label: "E", name: "Mudah", color: "bg-emerald-500", stars: 1 };
  if (idLevel === 2)
    return { label: "M", name: "Sedang", color: "bg-amber-400", stars: 2 };
  return { label: "H", name: "Sulit", color: "bg-rose-500", stars: 3 };
}

function LevelStars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i <= count
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-[#d9d4ef]"
          }`}
        />
      ))}
    </div>
  );
}

const LEVEL_FILTERS = ["Semua", "Mudah", "Sedang", "Sulit"] as const;
type LevelFilter = (typeof LEVEL_FILTERS)[number];

export default function Dashboard() {
  const { profile, isLoading: isProfileLoading } = useCurrentUser();
  const { leaderboard, isLoading: isLeaderboardLoading } = useLeaderboard();

  const [modulTersedia, setModulTersedia] = useState<ModulDB[]>([]);
  const [progressList, setProgressList] = useState<ProgressDB[]>([]);

  const [isModulLoading, setIsModulLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("Semua");

  // State untuk Pemilihan Karakter Pertama Kali Signin
  const [showMentorOnboarding, setShowMentorOnboarding] = useState(false);

  useEffect(() => {
    // getSelectedMentor() tetap dipanggil agar pilihan tersimpan terbaca sejak awal
    getSelectedMentor();
    if (typeof window !== "undefined") {
      const hasChosen = localStorage.getItem("syariah_mentor_chosen");
      if (!hasChosen) {
        setShowMentorOnboarding(true);
      }
    }
  }, []);

  const filteredModul = useMemo(() => {
    if (levelFilter === "Semua") return modulTersedia;
    return modulTersedia.filter(
      (m) => getLevelInfo(m.id_level).name === levelFilter
    );
  }, [modulTersedia, levelFilter]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!profile?.idMahasiswa) {
        // Tanpa profil, jangan biarkan daftar modul "memuat" selamanya
        setIsModulLoading(false);
        return;
      }
      setIsModulLoading(true);

      // Hanya modul aktif (sama seperti halaman Modul Pembelajaran)
      const { data: dataModul } = await supabase
        .from("modul")
        .select("id_modul, nama_modul, id_level, parameter_nilai")
        .eq("status", true)
        .order("id_modul", { ascending: true });

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
      }

      setIsModulLoading(false);
    }

    fetchDashboardData();
  }, [profile?.idMahasiswa]);

  // Transform modul & progress menjadi Nodes untuk Peta Misi
  const missionNodes: MissionNode[] = useMemo(() => {
    if (!modulTersedia || modulTersedia.length === 0) {
      return [];
    }

    let foundFirstActive = false;

    return modulTersedia.map((m) => {
      const prog = progressList.find((p) => p.id_modul === m.id_modul);
      const isDone = !!prog?.selesai;

      let status: "selesai" | "aktif" | "terkunci" = "terkunci";
      if (isDone) {
        status = "selesai";
      } else if (!foundFirstActive) {
        status = "aktif";
        foundFirstActive = true;
      }

      return {
        id_modul: m.id_modul,
        nama_modul: m.nama_modul,
        id_level: m.id_level,
        status: status,
        nilai: prog?.nilai ?? null,
      };
    });
  }, [modulTersedia, progressList]);

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[#5B5288] font-bold">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative z-10 pt-2 lg:pt-4 max-w-7xl mx-auto">
      {/* 1. PETA MISI UTAMA (Sesuai Screenshot Referensi User) */}
      <section className="animate-fade-in">
        <MissionMap missions={missionNodes} />
      </section>

      {/* 2. DAFTAR QUEST MODUL & LEADERBOARD RINGKAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pt-2">
        {/* KOLOM 1 & 2: MODUL PEMBELAJARAN */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#3d3466] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span>Daftar Misi Pembelajaran</span>
            </h3>
            {!isModulLoading && modulTersedia.length > 0 && (
              <span className="rounded-full bg-[#4a3f7a]/10 px-3 py-1 text-xs font-semibold text-[#4a3f7a]">
                {modulTersedia.length} Misi Tersedia
              </span>
            )}
          </div>

          {/* Filter Level */}
          <div className="flex flex-wrap gap-2">
            {LEVEL_FILTERS.map((f) => {
              const active = levelFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setLevelFilter(f)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-[#4a3f7a] text-white shadow-sm shadow-[#4a3f7a]/30"
                      : "bg-white text-[#4a3f7a]/70 ring-1 ring-[#4a3f7a]/15 hover:bg-[#f4f2fa]"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isModulLoading ? (
              <p className="col-span-full text-sm text-[#4a3f7a]">Memuat data modul...</p>
            ) : filteredModul.length > 0 ? (
              filteredModul.map((modul) => {
                const lvl = getLevelInfo(modul.id_level);
                const prog = progressList.find((p) => p.id_modul === modul.id_modul);
                const isSelesai = !!prog?.selesai;
                // Aturan kunci yang sama dengan halaman Modul Pembelajaran
                const access = getModuleAccess(
                  modul as never,
                  modulTersedia as never,
                  progressList as unknown as AdaptiveProgress[],
                );
                const isLocked = !access.isUnlocked;

                return (
                  <div
                    key={modul.id_modul}
                    className="flex flex-col justify-between rounded-2xl bg-white p-5 border border-purple-100/80 shadow-sm transition hover:shadow-md hover:border-purple-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl text-white font-black text-lg ${lvl.color}`}
                        >
                          {lvl.label}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                            {modul.nama_modul}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <LevelStars count={lvl.stars} />
                            <span className="text-[11px] font-semibold text-slate-500">
                              {lvl.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isSelesai && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                          Selesai
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        {prog?.kuis_dicoba ? `Nilai: ${prog.nilai}%` : "Belum dicoba"}
                      </span>
                      {isLocked ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400"
                          title={access.reason}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Terkunci</span>
                        </span>
                      ) : (
                        <Link
                          href={`/mahasiswa/modul/${modul.id_modul}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 transition"
                        >
                          <span>{isSelesai ? "Tinjau Misi" : "Mulai Misi"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="col-span-full text-sm text-slate-400">Tidak ada modul ditemukan.</p>
            )}
          </div>
        </div>

        {/* KOLOM 3: LEADERBOARD RINGKAS */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#3d3466] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Peringkat Konsultan</span>
            </h3>
            <Link
              href="/mahasiswa/leaderboard"
              className="text-xs font-semibold text-purple-700 hover:underline"
            >
              Lihat Semua
            </Link>
          </div>

          <div className="rounded-3xl bg-white p-5 border border-purple-100 shadow-sm flex flex-col gap-3">
            {isLeaderboardLoading ? (
              <p className="text-xs text-slate-400">Memuat peringkat...</p>
            ) : (
              leaderboard.slice(0, 5).map((player, idx) => (
                <div
                  key={player.id_mahasiswa}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        idx === 0
                          ? "bg-amber-400 text-amber-950 font-black"
                          : idx === 1
                          ? "bg-slate-300 text-slate-800"
                          : idx === 2
                          ? "bg-amber-600 text-white"
                          : "text-slate-500"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                      {player.nama_mahasiswa}
                    </span>
                  </div>
                  <span className="text-xs font-black text-purple-700">
                    {player.total_xp} XP
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Onboarding Dialog Pemilihan Karakter Mentor Pertama Kali */}
      <CharacterSelectionModal
        isOpen={showMentorOnboarding}
        onSelect={() => {
          setShowMentorOnboarding(false);
        }}
      />
    </div>
  );
}
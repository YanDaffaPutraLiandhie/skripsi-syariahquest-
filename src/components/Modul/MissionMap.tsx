"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  BookOpen,
  Compass,
  Play,
  Award,
  ChevronRight,
} from "lucide-react";

export type MissionNode = {
  id_modul: number;
  nama_modul: string;
  deskripsi?: string;
  id_level?: number;
  status: "selesai" | "aktif" | "terkunci";
  nilai?: number | null;
  parameter_nilai?: number | null;
};

type Props = {
  missions: MissionNode[];
  onSelectMission?: (mission: MissionNode) => void;
};

export default function MissionMap({ missions, onSelectMission }: Props) {
  const router = useRouter();

  // Fallback jika belum ada data modul dari DB
  const defaultMissions: MissionNode[] = [
    {
      id_modul: 1,
      nama_modul: "Prinsip Dasar",
      deskripsi: "Pahami landasan fiqih muamalah dan pilar keadilan ekonomi Islam.",
      status: "selesai",
      nilai: 95,
      parameter_nilai: 75,
    },
    {
      id_modul: 2,
      nama_modul: "Akad dalam Transaksi",
      deskripsi: "Bantu pelanggan memilih akad yang sesuai dengan prinsip syariah.",
      status: "aktif",
      nilai: null,
      parameter_nilai: 75,
    },
    {
      id_modul: 3,
      nama_modul: "Larangan Transaksi",
      deskripsi: "Identifikasi dan cegah unsur riba, gharar, dan maysir dalam transaksi bisnis.",
      status: "terkunci",
      nilai: null,
      parameter_nilai: 80,
    },
  ];

  const displayList = missions.length >= 3 ? missions : defaultMissions;

  // Modul yang terpilih di bottom card (default adalah modul yang sedang aktif / dikerjakan)
  const activeMissionIndex = displayList.findIndex((m) => m.status === "aktif");
  const [selectedIdx, setSelectedIdx] = useState<number>(
    activeMissionIndex !== -1 ? activeMissionIndex : 0
  );

  const currentMission = displayList[selectedIdx] || displayList[0];

  const handleNodeClick = (idx: number) => {
    setSelectedIdx(idx);
    if (onSelectMission) {
      onSelectMission(displayList[idx]);
    }
  };

  const handleEnterGame = () => {
    router.push(`/mahasiswa/modul/${currentMission.id_modul}`);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. HEADER PETA MISI (Sesuai Referensi) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6351d4] to-[#39268d] border border-purple-400/40 shadow-[0_0_15px_rgba(99,81,212,0.4)]">
          <Sparkles className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Peta Misi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Selesaikan misi untuk membuka wilayah baru!
          </p>
        </div>
      </div>

      {/* 2. AREA CANVAS PETA FANTASY DENGAN FLOATING ISLANDS */}
      <div className="relative w-full aspect-[16/9] min-h-[420px] max-h-[580px] rounded-3xl overflow-hidden border-2 border-purple-900/30 shadow-2xl bg-[#0f0c24] select-none">
        {/* Background Image: Pulau Melayang Anime RPG */}
        <img
          src="/images/map/fantasy_map.jpg"
          alt="Peta Misi Syariah Quest"
          className="w-full h-full object-cover object-center filter brightness-[0.95] contrast-[1.05]"
        />

        {/* Ambient overlay vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0e0b24]/80 via-transparent to-black/20" />

        {/* SVG Curve Connectors (Jalur titik mutiara bercahaya) */}
        <svg
          className="pointer-events-none absolute inset-0 w-full h-full z-10"
          viewBox="0 0 1000 560"
          preserveAspectRatio="none"
        >
          {/* Path 1 -> 2 */}
          <path
            d="M 330 250 C 420 300, 480 270, 560 250"
            fill="none"
            stroke="rgba(253, 230, 138, 0.4)"
            strokeWidth="5"
            strokeDasharray="4 8"
          />
          {/* Path 2 -> 3 */}
          <path
            d="M 640 250 C 720 240, 780 260, 850 250"
            fill="none"
            stroke="rgba(253, 230, 138, 0.4)"
            strokeWidth="5"
            strokeDasharray="4 8"
          />
          {/* Mutiara-mutiara bercahaya di sepanjang jalur */}
          <circle cx="380" cy="265" r="7" fill="#ffffff" filter="drop-shadow(0 0 6px #f59e0b)" />
          <circle cx="430" cy="275" r="7" fill="#ffffff" filter="drop-shadow(0 0 6px #f59e0b)" />
          <circle cx="490" cy="268" r="7" fill="#ffffff" filter="drop-shadow(0 0 6px #f59e0b)" />

          <circle cx="700" cy="245" r="7" fill="#ffffff" filter="drop-shadow(0 0 6px #f59e0b)" />
          <circle cx="750" cy="252" r="7" fill="#ffffff" filter="drop-shadow(0 0 6px #f59e0b)" />
          <circle cx="800" cy="250" r="7" fill="#ffffff" filter="drop-shadow(0 0 6px #f59e0b)" />
        </svg>

        {/* ========================================================
            NODE 1: PULAU KIRI (Selesai)
        ======================================================== */}
        <div
          onClick={() => handleNodeClick(0)}
          className={`absolute left-[15%] sm:left-[22%] top-[30%] sm:top-[28%] -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group transition-all duration-300 ${
            selectedIdx === 0 ? "scale-110" : "hover:scale-105"
          }`}
        >
          {/* Icon Centang Selesai */}
          <div className="relative mx-auto flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_20px_rgba(16,185,129,0.7)] group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-8 h-8 text-white stroke-[3]" />
          </div>

          {/* Label Card */}
          <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-[#14112e]/90 border border-purple-500/40 text-center shadow-lg backdrop-blur-sm min-w-[150px]">
            <p className="text-xs sm:text-sm font-bold text-white truncate">
              1. {displayList[0]?.nama_modul || "Prinsip Dasar"}
            </p>
            <p className="text-[11px] font-semibold text-emerald-400">
              ( Selesai )
            </p>
          </div>
        </div>

        {/* ========================================================
            NODE 2: KASTIL TENGAH (Sedang Dikerjakan - Bersinar Emas)
        ======================================================== */}
        <div
          onClick={() => handleNodeClick(1)}
          className={`absolute left-[50%] top-[42%] sm:top-[40%] -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group transition-all duration-300 ${
            selectedIdx === 1 ? "scale-110" : "hover:scale-105"
          }`}
        >
          {/* Bendera Misi Aktif Ungu */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
            <div className="px-2.5 py-1 rounded-lg bg-[#5d4db8] border border-amber-300/80 text-[10px] font-black text-amber-200 shadow-[0_0_12px_rgba(93,77,184,0.8)] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>MISI AKTIF</span>
            </div>
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-[#5d4db8]" />
          </div>

          {/* Kastil Glowing Aura Ring */}
          <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-amber-300 bg-amber-400/20 shadow-[0_0_40px_rgba(251,191,36,0.9)] ring-8 ring-amber-300/30 animate-pulse">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-indigo-600 via-purple-700 to-amber-500 flex items-center justify-center border-2 border-white/80 shadow-inner">
              <Compass className="w-9 h-9 text-amber-200 animate-spin-slow" />
            </div>
          </div>

          {/* Label Card */}
          <div className="mt-3 px-4 py-2 rounded-xl bg-[#14112e]/95 border-2 border-amber-400/80 text-center shadow-[0_0_20px_rgba(251,191,36,0.3)] backdrop-blur-md min-w-[190px]">
            <p className="text-xs sm:text-sm font-black text-white truncate">
              2. {displayList[1]?.nama_modul || "Akad dalam Transaksi"}
            </p>
            <p className="text-[11px] font-bold text-amber-300">
              ( Sedang Dikerjakan )
            </p>
          </div>
        </div>

        {/* ========================================================
            NODE 3: PULAU KANAN (Terkunci)
        ======================================================== */}
        <div
          onClick={() => handleNodeClick(2)}
          className={`absolute left-[85%] sm:left-[80%] top-[34%] sm:top-[32%] -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group transition-all duration-300 ${
            selectedIdx === 2 ? "scale-110" : "hover:scale-105"
          }`}
        >
          {/* Icon Gembok Terkunci */}
          <div className="relative mx-auto flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#181a38] border-2 border-slate-500 shadow-xl group-hover:scale-110 transition-transform">
            <Lock className="w-6 h-6 text-slate-300" />
          </div>

          {/* Label Card */}
          <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-[#14112e]/90 border border-slate-700 text-center shadow-lg backdrop-blur-sm min-w-[150px]">
            <p className="text-xs sm:text-sm font-bold text-slate-300 truncate">
              3. {displayList[2]?.nama_modul || "Larangan Transaksi"}
            </p>
            <p className="text-[11px] font-semibold text-slate-400">
              ( Terkunci )
            </p>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM CARD: "MISI SAAT INI" (Sesuai Referensi) */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-[#1b173e] via-[#211c4c] to-[#1b173e] border border-purple-500/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Glow ambient */}
        <div className="pointer-events-none absolute -left-10 -top-10 w-40 h-40 bg-purple-600/30 blur-2xl rounded-full" />

        {/* Kiri: Icon Buku Berkilau */}
        <div className="relative flex items-center gap-4 w-full md:w-auto">
          <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5341b5] to-[#2f2275] border border-purple-400/50 shadow-[0_0_15px_rgba(99,81,212,0.4)]">
            <BookOpen className="w-7 h-7 text-amber-300" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                Misi Saat Ini
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  currentMission.status === "selesai"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : currentMission.status === "aktif"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-slate-700/40 text-slate-400 border border-slate-600"
                }`}
              >
                {currentMission.status === "selesai"
                  ? "Selesai"
                  : currentMission.status === "aktif"
                  ? "Bisa Dikerjakan"
                  : "Terkunci"}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5 truncate">
              {currentMission.nama_modul}
            </h3>
            <p className="text-xs sm:text-sm text-purple-200/70 line-clamp-1 mt-0.5">
              {currentMission.deskripsi ||
                "Bantu pelanggan memilih akad yang sesuai dengan prinsip syariah."}
            </p>
          </div>
        </div>

        {/* Kanan: Tombol Masuk ke Game */}
        <div className="w-full md:w-auto flex items-center justify-end">
          <button
            type="button"
            onClick={handleEnterGame}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#6351d4] via-[#5b4cb8] to-[#4c3fa3] hover:from-[#725fe8] hover:to-[#5d4ec7] text-white font-black text-sm tracking-wide shadow-[0_4px_20px_rgba(99,81,212,0.5)] border border-purple-400/40 hover:scale-[1.03] active:scale-95 transition-all"
          >
            <span>Masuk ke Game</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}

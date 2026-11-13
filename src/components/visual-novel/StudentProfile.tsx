"use client";

import React from "react";
import { Sparkles, Trophy, Award, Zap } from "lucide-react";

type Props = {
  name: string;
  major?: string;
  institution?: string;
  avatarSrc?: string;
  totalXp: number;
  level: number;
  completedChapters?: number;
  totalChapters?: number;
  badgeCount?: number;
  className?: string;
};

export default function StudentProfile({
  name,
  major = "Administrasi Niaga",
  institution = "Politeknik Negeri Malang",
  avatarSrc = "/game/student-1.png",
  totalXp = 210,
  level = 2,
  completedChapters = 1,
  totalChapters = 8,
  badgeCount = 3,
  className = "",
}: Props) {
  const xpPerLevel = 180;
  const currentLevelXp = totalXp % xpPerLevel;
  const xpPercent = Math.min(100, Math.round((currentLevelXp / xpPerLevel) * 100));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hero Banner */}
      <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-7 bg-gradient-to-r from-[#44316e] to-[#2c2047] text-white shadow-xl flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
        <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-[#ffc94a] bg-[#d8c7ff] overflow-hidden p-1 shadow-lg">
          <img
            src={avatarSrc}
            alt={name}
            className="w-full h-full object-contain object-top rounded-full"
          />
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest text-[#dfc8ff] uppercase">
            <Sparkles className="w-3 h-3 text-[#ffc94a]" />
            <span>Profil Petualang Syariah</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black mt-1 text-white truncate">
            {name}
          </h2>

          <p className="text-xs text-[#d4c9eb] font-semibold mt-0.5">
            {major} · {institution}
          </p>

          {/* XP Bar */}
          <div className="mt-3 max-w-md">
            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-[#ffc94a] shadow-[0_0_10px_rgba(255,201,74,0.8)] transition-all duration-500"
                style={{ width: `${Math.max(10, xpPercent)}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#d4c9eb] font-bold">
              <span>Level {level}</span>
              <span>{currentLevelXp} / {xpPerLevel} XP menuju Level {level + 1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#e8e1f3] bg-white p-4 text-center shadow-sm">
          <span className="text-[11px] font-bold text-[#8d86a3] block">Bab Selesai</span>
          <b className="text-xl sm:text-2xl font-black text-[#30274d] mt-1 block">
            {completedChapters} / {totalChapters}
          </b>
        </div>

        <div className="rounded-2xl border border-[#e8e1f3] bg-white p-4 text-center shadow-sm">
          <span className="text-[11px] font-bold text-[#8d86a3] block">Total Capaian</span>
          <b className="text-xl sm:text-2xl font-black text-[#b77900] mt-1 flex items-center justify-center gap-1">
            <Zap className="w-5 h-5 fill-[#ffc94a] text-[#b77900]" />
            <span>{totalXp} XP</span>
          </b>
        </div>

        <div className="rounded-2xl border border-[#e8e1f3] bg-white p-4 text-center shadow-sm">
          <span className="text-[11px] font-bold text-[#8d86a3] block">Koleksi Badge</span>
          <b className="text-xl sm:text-2xl font-black text-[#5740a0] mt-1 flex items-center justify-center gap-1">
            <Award className="w-5 h-5 text-[#ffc94a]" />
            <span>{badgeCount}</span>
          </b>
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Coins, Zap, Award } from "lucide-react";

type Props = {
  koin?: number | string;
  xp?: number;
  badgeCount?: number;
  className?: string;
};

export default function ResourceHUD({
  koin = "1.250",
  xp = 210,
  badgeCount = 3,
  className = "",
}: Props) {
  const displayKoin = typeof koin === "number" ? koin.toLocaleString("id-ID") : koin;

  return (
    <div className={`flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs font-black ${className}`}>
      {/* Koin Pill */}
      <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#2c1d4d]/90 to-[#1f153a]/90 border border-amber-400/40 text-amber-300 shadow-[0_2px_10px_rgba(251,191,36,0.15)] backdrop-blur-md transition-all hover:scale-105">
        <div className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
          <Coins className="w-3 h-3 text-amber-400" />
        </div>
        <span className="tracking-wide font-black">{displayKoin}</span>
      </div>

      {/* XP Pill */}
      <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#2c1d4d]/90 to-[#1f153a]/90 border border-purple-400/40 text-purple-200 shadow-[0_2px_10px_rgba(168,85,247,0.15)] backdrop-blur-md transition-all hover:scale-105">
        <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center">
          <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
        </div>
        <span className="tracking-wide font-black">{xp} XP</span>
      </div>

      {/* Badge Pill */}
      <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#2c1d4d]/90 to-[#1f153a]/90 border border-[#7858ca]/40 text-purple-200 shadow-[0_2px_10px_rgba(120,88,202,0.15)] backdrop-blur-md transition-all hover:scale-105">
        <div className="w-5 h-5 rounded-full bg-[#7858ca]/25 border border-[#7858ca]/40 flex items-center justify-center">
          <Award className="w-3 h-3 text-[#ffc94a]" />
        </div>
        <span className="tracking-wide font-black">{badgeCount} Badge</span>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Sparkles, MapPin } from "lucide-react";

type Props = {
  backgroundSrc: string;
  locationLabel?: string; // e.g. "KAMPUS MADANI · MALANG"
  sceneCaption?: string;  // e.g. "ADEGAN 01 • STUDI KASUS"
  children?: React.ReactNode;
  className?: string;
};

export default function VisualNovelScene({
  backgroundSrc,
  locationLabel = "KOTA SYARIAH",
  sceneCaption = "STUDI KASUS MUAMALAH",
  children,
  className = "",
}: Props) {
  return (
    <div
      className={`relative w-full rounded-3xl bg-gradient-to-b from-[#2e1d52] to-[#1a1033] p-2.5 sm:p-3 border-2 border-purple-500/40 shadow-[0_20px_50px_rgba(26,16,51,0.6)] ${className}`}
    >
      {/* Decorative Golden Corner Accents */}
      <div className="pointer-events-none absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#ffc94a]/80 rounded-tl z-30" />
      <div className="pointer-events-none absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#ffc94a]/80 rounded-tr z-30" />
      <div className="pointer-events-none absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#ffc94a]/80 rounded-bl z-30" />
      <div className="pointer-events-none absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#ffc94a]/80 rounded-br z-30" />

      {/* Main Scene Viewport */}
      <div
        className="relative w-full min-h-[420px] sm:min-h-[480px] md:min-h-[520px] h-[52vw] max-h-[620px] rounded-2xl overflow-hidden bg-cover bg-center transition-all duration-700 flex flex-col justify-between p-4 sm:p-6"
        style={{
          backgroundImage: `linear-gradient(0deg, rgba(22,14,40,0.92) 0%, rgba(35,23,60,0.3) 50%, rgba(20,13,38,0.7) 100%), url('${backgroundSrc}')`,
        }}
      >
        {/* Top Badges Bar */}
        <div className="relative z-20 flex items-center justify-between gap-3 pointer-events-none">
          {/* Location badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#1b1238]/90 border border-purple-400/40 px-3.5 py-1.5 text-[11px] font-black tracking-wider text-purple-100 shadow-xl backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-[#59d7a5] shadow-[0_0_8px_#59d7a5] animate-pulse" />
            <MapPin className="w-3.5 h-3.5 text-[#ffc94a]" />
            <span>{locationLabel}</span>
          </div>

          {/* Scene caption */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1b1238]/90 border border-purple-400/40 px-3.5 py-1.5 text-[11px] font-black tracking-wider text-white shadow-xl backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#ffc94a]" />
            <span>{sceneCaption}</span>
          </div>
        </div>

        {/* Cinematic Vignette & Bottom Floor Ambient Shadow */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#140e28] via-[#140e28]/70 to-transparent z-0" />
        <div className="pointer-events-none absolute inset-0 bg-radial-vignette opacity-40 z-0" />

        {/* Scene Content (Character Sprite & Dialogue Box) */}
        {children}
      </div>
    </div>
  );
}

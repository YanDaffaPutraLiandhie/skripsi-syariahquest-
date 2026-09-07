"use client";

import React from "react";
import {
  Diamond,
  Star,
  Sparkles,
  Trophy,
  BookOpen,
  Zap,
  Shield,
  Award,
  Circle,
  Hexagon,
} from "lucide-react";

interface DosenContainerProps {
  categoryTag?: string;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export default function DosenContainer({
  categoryTag = "Dosen Syariah Quest",
  title,
  subtitle,
  headerAction,
  children,
}: DosenContainerProps) {
  return (
    <div className="relative isolate space-y-8 rounded-[32px] bg-gradient-to-b from-[#f8f7fd] via-[#f4f1fb] to-[#f0edf9] p-6 lg:p-8 min-h-[calc(100vh-6rem)]">
      {/* =========================================================================
          DECORATIVE SVG & SHAPES BACKGROUND LAYER (Rich Visual FX)
          Catatan: overflow-hidden HANYA di layer ini (bukan di wrapper terluar),
          supaya position: sticky pada children tidak ikut mati.
      ========================================================================= */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[32px]">
        {/* Ambient Gradient Glows */}
        <div className="absolute -left-20 -top-16 h-80 w-80 rounded-full bg-[#8a80b8]/30 blur-3xl" />
        <div className="absolute right-[-4rem] top-1/3 h-72 w-72 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute bottom-[-3rem] left-1/4 h-64 w-64 rounded-full bg-[#4a3f7a]/15 blur-3xl" />
        <div className="absolute right-10 bottom-10 h-72 w-72 rounded-full bg-purple-300/30 blur-3xl" />

        {/* Dot Matrix Pattern SVGs */}
        <div className="absolute left-6 top-24 opacity-30">
          <svg width="100" height="100" fill="none" viewBox="0 0 100 100">
            <pattern id="dot-grid-1" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="2" className="fill-[#4a3f7a]" />
            </pattern>
            <rect width="100" height="100" fill="url(#dot-grid-1)" />
          </svg>
        </div>

        <div className="absolute right-10 top-72 opacity-25">
          <svg width="120" height="120" fill="none" viewBox="0 0 120 120">
            <pattern id="dot-grid-2" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="2.5" className="fill-[#8a80b8]" />
            </pattern>
            <rect width="120" height="120" fill="url(#dot-grid-2)" />
          </svg>
        </div>

        {/* Floating Geometric SVGs & Icons */}
        {/* 1. Top Left Diamond & Circle Ring */}
        <Diamond
          className="absolute left-[6%] top-[18%] h-6 w-6 rotate-12 text-[#8a80b8]/50 animate-pulse"
          strokeWidth={2.5}
        />
        <div className="absolute left-[14%] top-[12%] h-7 w-7 rounded-full border-2 border-dashed border-[#4a3f7a]/30 animate-spin-slow" />

        {/* 2. Top Right Floating Star & Shield */}
        <Star className="absolute right-[7%] top-[16%] h-5 w-5 rotate-12 fill-amber-300/60 text-amber-400/80" />
        <Shield className="absolute right-[14%] top-[24%] h-6 w-6 text-[#8a80b8]/40 -rotate-12" strokeWidth={1.8} />

        {/* 3. Center Left Book & Hexagon */}
        <BookOpen className="absolute left-[3%] top-[48%] h-7 w-7 text-[#4a3f7a]/30 rotate-6" strokeWidth={1.8} />
        <Hexagon className="absolute left-[12%] top-[54%] h-8 w-8 text-amber-300/40 rotate-45" strokeWidth={2} />

        {/* 4. Center Right Trophy & Wavy Curves */}
        <Trophy className="absolute right-[4%] top-[52%] h-7 w-7 text-amber-400/50 -rotate-12" strokeWidth={1.8} />
        <div className="absolute right-[12%] top-[60%] opacity-40">
          <svg width="80" height="40" viewBox="0 0 80 40" fill="none">
            <path d="M0 20 Q 20 5, 40 20 T 80 20" stroke="#8a80b8" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        {/* 5. Bottom Floating Accents */}
        <Award className="absolute left-[8%] bottom-16 h-8 w-8 text-purple-400/40 rotate-12" strokeWidth={1.8} />
        <Zap className="absolute right-[15%] bottom-20 h-6 w-6 text-amber-400/60 -rotate-12" strokeWidth={2} />

        <span className="absolute left-[20%] bottom-8 h-4 w-4 rotate-45 rounded-[4px] border-2 border-[#8a80b8]/40" />
        <span className="absolute right-[22%] bottom-12 h-3.5 w-3.5 rounded-full bg-amber-400/50" />
        <span className="absolute left-[35%] bottom-5 h-2.5 w-2.5 rounded-full bg-[#4a3f7a]/30" />
        <span className="absolute right-[38%] top-16 h-3 w-3 rotate-12 rounded-[3px] bg-purple-300/50" />

        {/* Big Concentric Background Circles (Bottom Right) */}
        <div className="absolute right-[-6rem] bottom-[-6rem] opacity-20">
          <svg width="340" height="340" viewBox="0 0 340 340" fill="none">
            <circle cx="170" cy="170" r="160" stroke="#4a3f7a" strokeWidth="2" strokeDasharray="8 8" />
            <circle cx="170" cy="170" r="120" stroke="#8a80b8" strokeWidth="2" />
            <circle cx="170" cy="170" r="80" stroke="#f2c94c" strokeWidth="2" strokeDasharray="6 6" />
          </svg>
        </div>

        {/* Big Concentric Background Circles (Top Left) */}
        <div className="absolute left-[-5rem] top-[-5rem] opacity-20">
          <svg width="280" height="280" viewBox="0 0 280 280" fill="none">
            <circle cx="140" cy="140" r="130" stroke="#4a3f7a" strokeWidth="2" />
            <circle cx="140" cy="140" r="90" stroke="#8a80b8" strokeWidth="2" strokeDasharray="6 6" />
          </svg>
        </div>
      </div>

      {/* =========================================================================
          HEADER BANNER CARD (Dashboard Gamified Banner Style)
      ========================================================================= */}
      <div className="relative">
        <Diamond
          className="absolute -right-2 -top-3 hidden h-7 w-7 rotate-12 text-amber-300 sm:block animate-bounce"
          strokeWidth={2.5}
        />
        <span className="absolute -left-2 top-1/3 hidden h-4 w-4 rotate-45 rounded-[4px] border-2 border-[#c9c3e6] sm:block" />
        <span className="absolute -bottom-2 right-12 hidden h-3.5 w-3.5 rounded-full bg-amber-400 shadow-sm sm:block" />

        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] px-8 pb-8 pt-7 shadow-lg shadow-[#3d3466]/25 lg:px-10 lg:pb-10 lg:pt-8">
          {/* Header Banner Background SVGs */}
          <Sparkles className="absolute right-[28%] top-6 h-5 w-5 text-white/40" />
          <Sparkles className="absolute right-[8%] top-10 h-4 w-4 text-[#f2c94c] animate-pulse" />
          <Star className="absolute right-[18%] bottom-6 h-4 w-4 fill-amber-300/40 text-amber-300/60 rotate-45" />

          {/* Banner Decorative Curved Lines */}
          <div className="pointer-events-none absolute -right-10 top-0 opacity-20">
            <svg width="300" height="200" viewBox="0 0 300 200" fill="none">
              <path d="M50 0 C 150 100, 200 50, 300 200" stroke="white" strokeWidth="3" strokeDasharray="6 6" />
              <circle cx="200" cy="80" r="40" stroke="#f2c94c" strokeWidth="2" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-[#e2dcff] backdrop-blur-md border border-white/15 shadow-inner">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                {categoryTag}
              </span>

              <h1 className="mt-3 text-2xl font-black leading-snug text-white lg:text-3xl tracking-wide">
                {title}
              </h1>

              {subtitle && (
                <p className="mt-1.5 text-sm text-[#c9c3e6] lg:text-base font-medium">
                  {subtitle}
                </p>
              )}
            </div>

            {headerAction && <div className="flex items-center gap-3">{headerAction}</div>}
          </div>

          {/* Bottom Wave Decoration */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 opacity-20">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-full fill-white">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.94,130.83,121.3,201,115.8,241.6,112.5,282.6,98.2,321.39,56.44Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN PAGE CONTENT
      ========================================================================= */}
      <div className="relative z-10 space-y-6">{children}</div>
    </div>
  );
}
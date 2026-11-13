"use client";

import React from "react";
import Link from "next/link";
import { Lock, MapPin, CheckCircle2, Sparkles, Zap, ArrowRight } from "lucide-react";

export type PinStatus = "available" | "active" | "locked" | "completed";

type Props = {
  label: string;
  sublabel?: string;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  href?: string;
  status?: PinStatus;
  rewardXp?: number;
  isSelected?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  className?: string;
};

export default function WorldMapPin({
  label,
  sublabel,
  x,
  y,
  href,
  status = "available",
  rewardXp,
  isSelected = false,
  onClick,
  onMouseEnter,
  className = "",
}: Props) {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isActive = status === "active" || isSelected;

  const innerContent = (
    <>
      {/* Ripple Radar Wave for Active/Selected Pin */}
      {!isLocked && (
        <span
          className={`absolute inset-0 rounded-full animate-ping opacity-35 pointer-events-none ${
            isSelected ? "bg-[#ffc94a] duration-1000" : "bg-[#7858ca] duration-1500"
          }`}
        />
      )}

      {/* Pin Badge Circle */}
      <div
        className={`relative flex items-center justify-center w-8 h-8 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full border-2 transition-all duration-300 shadow-xl backdrop-blur-md ${
          isLocked
            ? "bg-[#1f173a]/90 border-purple-900/60 text-purple-400/40 shadow-purple-950/40"
            : isCompleted
            ? "bg-gradient-to-br from-emerald-500 to-teal-700 border-emerald-300 text-white shadow-[0_0_20px_rgba(16,185,129,0.7)] ring-2 ring-emerald-400/40"
            : isSelected
            ? "bg-gradient-to-br from-[#7858ca] via-[#6345b5] to-[#442c8d] border-[#ffc94a] text-white shadow-[0_0_25px_rgba(255,201,74,0.75)] ring-4 ring-[#ffc94a]/60 scale-105"
            : "bg-gradient-to-br from-[#ffffff] to-[#ede5ff] border-[#7858ca] text-[#5740a0] shadow-[0_4px_16px_rgba(87,64,160,0.3)] group-hover:border-[#ffc94a] group-hover:text-[#7858ca]"
        }`}
      >
        {isLocked ? (
          <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-300/50" />
        ) : isCompleted ? (
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.5]" />
        ) : isSelected ? (
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffc94a] animate-pulse" />
        ) : (
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
        )}

        {/* Small XP badge pill on top right */}
        {rewardXp && !isLocked && (
          <div className="absolute -top-1.5 -right-1.5 px-1 sm:px-1.5 py-0.5 rounded-full bg-[#ffc94a] text-[#251a3d] border border-white font-black text-[8px] sm:text-[9px] shadow-sm flex items-center gap-0.5 pointer-events-none">
            <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-[#251a3d]" />
            <span>+{rewardXp}</span>
          </div>
        )}
      </div>

      {/* Sleek Label Pill Box */}
      <div
        className={`mt-1 sm:mt-1.5 px-2 sm:px-3 py-1 rounded-xl text-center shadow-xl backdrop-blur-md border transition-all whitespace-nowrap ${
          isLocked
            ? "bg-[#140e28]/90 border-purple-900/50 text-purple-300/50"
            : isSelected
            ? "bg-gradient-to-r from-[#2a1d4f]/95 to-[#1c1339]/95 border-[#ffc94a] text-white shadow-[0_0_20px_rgba(255,201,74,0.35)] scale-105 ring-2 ring-[#ffc94a]/30"
            : "bg-[#ffffff]/95 border-[#ded3f4] text-[#30274d] hover:bg-white group-hover:border-[#7858ca] group-hover:shadow-lg"
        }`}
      >
        <p className="text-[10px] sm:text-xs font-black tracking-tight leading-tight flex items-center justify-center gap-1">
          <span>{label}</span>
          {!isLocked && (
            <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#ffc94a] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          )}
        </p>

        {sublabel && (
          <p
            className={`hidden md:block text-[9px] font-bold tracking-wide mt-0.5 ${
              isLocked
                ? "text-purple-400/50"
                : isSelected
                ? "text-[#ffc94a]"
                : "text-[#7858ca]"
            }`}
          >
            {sublabel}
          </p>
        )}
      </div>
    </>
  );

  const containerClasses = `absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer flex flex-col items-center transition-all duration-300 ${
    isLocked ? "cursor-not-allowed opacity-75" : "hover:scale-110 active:scale-95"
  } ${isSelected ? "scale-110 z-30" : ""} ${className}`;

  if (href && !isLocked) {
    return (
      <Link
        href={href}
        style={{ left: `${x}%`, top: `${y}%` }}
        onMouseEnter={onMouseEnter}
        onClick={onClick}
        aria-label={`Menuju ${label}`}
        className={containerClasses}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={isLocked}
      style={{ left: `${x}%`, top: `${y}%` }}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      aria-label={`Lokasi ${label} - ${status}`}
      className={containerClasses}
    >
      {innerContent}
    </button>
  );
}

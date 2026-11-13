"use client";

import React from "react";
import { Clock, Zap, ArrowRight, Lock } from "lucide-react";

export type MissionStatus = "available" | "in-progress" | "completed" | "locked";

type Props = {
  tag: string; // e.g. "BAB 01 · TERSEDIA"
  title: string;
  description: string;
  duration?: string; // e.g. "5 menit"
  xpReward?: number; // e.g. 50
  status?: MissionStatus;
  artEmoji?: string;
  artBgGradient?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
};

export default function MissionCard({
  tag,
  title,
  description,
  duration = "5-8 menit",
  xpReward = 50,
  status = "available",
  artEmoji = "📚",
  artBgGradient = "from-[#d8c9ff] to-[#f8e6a8]",
  onAction,
  actionLabel = "Mulai Cerita",
  className = "",
}: Props) {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";

  return (
    <article
      className={`rounded-2xl border border-[#e8e1f3] bg-white overflow-hidden shadow-[0_5px_15px_rgba(59,43,92,0.06)] flex flex-col justify-between transition-all hover:shadow-[0_8px_25px_rgba(59,43,92,0.12)] ${className}`}
    >
      <div>
        {/* Art Banner */}
        <div
          className={`h-28 sm:h-32 flex items-center justify-center text-4xl sm:text-5xl bg-gradient-to-br ${artBgGradient} transition-transform hover:scale-[1.02]`}
        >
          {artEmoji}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5">
          <span
            className={`text-[10px] font-black tracking-wider uppercase ${
              isLocked
                ? "text-[#8d86a3]"
                : isCompleted
                ? "text-emerald-600"
                : "text-[#7858ca]"
            }`}
          >
            {tag}
          </span>

          <h3 className="text-sm sm:text-base font-black text-[#30274d] mt-1.5 line-clamp-1">
            {title}
          </h3>

          <p className="text-xs text-[#8d86a3] leading-relaxed mt-1 line-clamp-2 min-h-[34px]">
            {description}
          </p>

          {/* Foot Specs */}
          <div className="mt-4 pt-3 border-t border-[#e8e1f3] flex items-center justify-between text-xs text-[#8d86a3] font-bold">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#7858ca]" />
              <span>{duration}</span>
            </span>

            <span className="inline-flex items-center gap-1 text-[#b77900] font-black">
              <Zap className="w-3.5 h-3.5 fill-[#ffc94a] text-[#b77900]" />
              <span>+{xpReward} XP</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 sm:p-5 pt-0">
        {isLocked ? (
          <button
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#f1eef6] text-[#a19ab0] font-black text-xs cursor-not-allowed"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Terkunci</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-black text-xs shadow-md transition-all cursor-pointer active:scale-95 ${
              isCompleted
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-[#5740a0] hover:bg-[#483387]"
            }`}
          >
            <span>{isCompleted ? "Tinjau Kembali" : actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#ffc94a]" />
          </button>
        )}
      </div>
    </article>
  );
}

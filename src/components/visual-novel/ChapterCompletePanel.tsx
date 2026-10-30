"use client";

import React from "react";
import { Trophy, Zap, ArrowRight, RotateCcw, BookOpen, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";

type Props = {
  chapterTitle: string;
  isPassed: boolean;
  score: number;
  xpEarned: number;
  passingScore?: number;
  correctCount: number;
  totalQuestions: number;
  onContinue: () => void;
  onRemedial?: () => void;
  onRetry?: () => void;
  className?: string;
};

export default function ChapterCompletePanel({
  chapterTitle,
  isPassed,
  score,
  xpEarned,
  passingScore = 75,
  correctCount,
  totalQuestions,
  onContinue,
  onRemedial,
  onRetry,
  className = "",
}: Props) {
  return (
    <div
      className={`relative rounded-3xl border-2 ${
        isPassed
          ? "border-emerald-400 bg-gradient-to-b from-white to-[#f4fbf7] shadow-[0_20px_50px_rgba(16,185,129,0.25)]"
          : "border-amber-400 bg-gradient-to-b from-white to-[#fffbf2] shadow-[0_20px_50px_rgba(245,158,11,0.25)]"
      } p-6 sm:p-9 text-center max-w-lg mx-auto backdrop-blur-xl animate-in zoom-in-95 duration-400 ${className}`}
    >
      {/* Decorative Top Glow Halo */}
      <div
        className={`pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-35 ${
          isPassed ? "bg-emerald-400" : "bg-amber-400"
        }`}
      />

      {/* Floating Trophy Emblem */}
      <div className="flex justify-center mb-5">
        <div
          className={`relative w-22 h-22 rounded-3xl flex items-center justify-center border-2 shadow-2xl ${
            isPassed
              ? "bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-700 border-emerald-200 text-white shadow-emerald-500/40 ring-4 ring-emerald-400/20"
              : "bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 border-amber-200 text-white shadow-amber-500/40 ring-4 ring-amber-400/20"
          }`}
        >
          {isPassed ? (
            <Trophy className="w-12 h-12 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] animate-bounce" />
          ) : (
            <ShieldAlert className="w-12 h-12 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" />
          )}

          <div className="absolute -bottom-2 px-3 py-0.5 rounded-full bg-[#1b1238] border border-white/40 text-[10px] font-black text-[#ffc94a] shadow-md uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#ffc94a]" />
            <span>{isPassed ? "LULUS" : "EVALUASI"}</span>
          </div>
        </div>
      </div>

      {/* Subtitle Eyebrow */}
      <span
        className={`text-xs font-black tracking-widest uppercase ${
          isPassed ? "text-emerald-700" : "text-amber-800"
        }`}
      >
        {isPassed ? "HASIL KONSULTASI · SUKSES BESAR" : "HASIL KONSULTASI · PERLU PENGUATAN"}
      </span>

      <h2 className="text-xl sm:text-2xl font-black text-[#261c42] mt-1.5 leading-snug">
        {chapterTitle}
      </h2>

      <p className="text-xs sm:text-sm text-[#736a8d] mt-2 max-w-sm mx-auto leading-relaxed font-semibold">
        {isPassed
          ? "Masya Allah! Seluruh keputusan transaksi telah kamu selesaikan sesuai rukun, syarat, dan kaidah fiqih muamalah."
          : `Skor akhirmu adalah ${score}%, sedangkan standar kompetensi kelulusan modul ini adalah ${passingScore}%. Mari pelajari materi remedial untuk memperkokoh pemahaman.`}
      </p>

      {/* Stats Breakdown Card Grid */}
      <div className="my-6 grid grid-cols-2 gap-3 max-w-sm mx-auto">
        <div className="p-4 rounded-2xl bg-white border border-[#e5dcf7] shadow-sm text-center">
          <span className="text-[10px] font-black text-[#8d86a3] uppercase tracking-wider block">
            Nilai Akhir
          </span>
          <span
            className={`text-3xl font-black block mt-1 ${
              isPassed ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {score}%
          </span>
          <span className="text-[11px] text-[#8d86a3] font-bold mt-0.5 block">
            {correctCount} dari {totalQuestions} benar
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e5dcf7] shadow-sm text-center">
          <span className="text-[10px] font-black text-[#8d86a3] uppercase tracking-wider block">
            Reward Capaian
          </span>
          <span className="text-3xl font-black text-[#b77900] flex items-center justify-center gap-1.5 mt-1">
            <Zap className="w-6 h-6 fill-[#ffc94a] text-[#b77900]" />
            <span>+{xpEarned}</span>
          </span>
          <span className="text-[11px] text-[#8d86a3] font-bold mt-0.5 block">
            Tersimpan di Profil
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5">
        {isPassed ? (
          <button
            type="button"
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#5740a0] via-[#6849b8] to-[#7858ca] hover:from-[#483387] hover:to-[#6345b5] active:scale-95 text-white font-black text-sm shadow-[0_8px_25px_rgba(87,64,160,0.35)] transition-all cursor-pointer group"
          >
            <span>Lanjutkan Petualangan</span>
            <ArrowRight className="w-4 h-4 text-[#ffc94a] group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <>
            {onRemedial && (
              <button
                type="button"
                onClick={onRemedial}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 active:scale-95 text-white font-black text-sm shadow-[0_8px_25px_rgba(245,158,11,0.35)] transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Pelajari Materi Remedial Sekarang</span>
              </button>
            )}

            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl border-2 border-[#ded3f4] bg-white hover:bg-[#f8f4ff] active:scale-95 text-[#5740a0] font-black text-xs transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ulangi Kasus Ini</span>
              </button>
            )}

            <button
              type="button"
              onClick={onContinue}
              className="w-full py-2 text-xs font-bold text-[#8d86a3] hover:text-[#5740a0] transition-colors"
            >
              Kembali ke Peta Kota
            </button>
          </>
        )}
      </div>
    </div>
  );
}

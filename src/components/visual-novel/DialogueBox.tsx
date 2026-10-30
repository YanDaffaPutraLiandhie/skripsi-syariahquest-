"use client";

import React from "react";
import { ArrowRight, Check, Sparkles, Volume2 } from "lucide-react";

type Props = {
  speaker: string;
  text: string;
  counter?: string; // e.g. "01 / 03"
  isFinal?: boolean;
  nextLabel?: string;
  onNext?: () => void;
  showNextButton?: boolean;
  className?: string;
};

export default function DialogueBox({
  speaker,
  text,
  counter,
  isFinal = false,
  nextLabel,
  onNext,
  showNextButton = true,
  className = "",
}: Props) {
  const defaultLabel = isFinal ? "Selesaikan Bab" : "Lanjutkan";

  return (
    <div
      className={`relative z-20 w-full rounded-2xl sm:rounded-3xl border-2 border-[#d5c7f5] bg-gradient-to-b from-[#fffdfc]/98 to-[#fbf8ff]/98 backdrop-blur-xl p-4 sm:p-6 shadow-[0_12px_35px_rgba(18,10,38,0.45)] text-[#30274d] ${className}`}
    >
      {/* Speaker Name Pill with Golden Border & Gem */}
      <div className="absolute -top-4 sm:-top-5 left-4 sm:left-6 inline-flex items-center gap-2">
        <div className="rounded-t-xl rounded-br-xl bg-gradient-to-r from-[#5740a0] via-[#6a49b8] to-[#7858ca] border border-[#ffc94a]/60 px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-black tracking-wide text-white shadow-lg flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#ffc94a]" />
          <span>{speaker}</span>
        </div>
      </div>

      {/* Dialogue Line with clear readability */}
      <div className="mt-2.5 sm:mt-3 min-h-[48px] sm:min-h-[58px] flex items-center">
        <p className="text-sm sm:text-base md:text-lg font-bold leading-relaxed whitespace-pre-line text-[#261c42]">
          {text}
        </p>
      </div>

      {/* Footer bar with counter & interactive action button */}
      <div className="mt-3 pt-3 border-t border-[#e8e1f3] flex items-center justify-between gap-3">
        {counter ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#eee8ff] text-[11px] font-black text-[#5740a0]">
            <span>ADENGAN</span>
            <span className="text-[#b77900]">{counter}</span>
          </div>
        ) : (
          <div />
        )}

        {showNextButton && onNext && (
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5740a0] via-[#6649b8] to-[#7858ca] hover:from-[#483387] hover:to-[#6345b5] active:scale-95 text-white text-xs sm:text-sm font-black shadow-lg transition-all cursor-pointer group"
          >
            <span>{nextLabel || defaultLabel}</span>
            {isFinal ? (
              <Check className="w-4 h-4 text-[#ffc94a] stroke-[3]" />
            ) : (
              <ArrowRight className="w-4 h-4 text-[#ffc94a] stroke-[3] group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

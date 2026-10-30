"use client";

import React from "react";
import { CheckCircle2, XCircle, ChevronRight } from "lucide-react";

type Props = {
  indexLetter: string; // "A", "B", "C", etc.
  text: string;
  onClick: () => void;
  isSelected?: boolean;
  disabled?: boolean;
  variant?: "default" | "correct" | "incorrect";
  className?: string;
};

export default function ChoiceButton({
  indexLetter,
  text,
  onClick,
  isSelected = false,
  disabled = false,
  variant = "default",
  className = "",
}: Props) {
  let cardStyles = "border-[#ded3f4] bg-white text-[#2a1d47] hover:border-[#7858ca] hover:bg-[#faf7ff] hover:shadow-md";
  let badgeStyles = "bg-gradient-to-br from-[#eee8ff] to-[#ded3f4] text-[#5740a0] border border-[#d5c7f5]";

  if (variant === "correct") {
    cardStyles = "border-emerald-500 bg-emerald-50/90 text-emerald-950 font-black ring-2 ring-emerald-400 shadow-emerald-500/20 shadow-lg";
    badgeStyles = "bg-emerald-600 text-white border-emerald-400";
  } else if (variant === "incorrect") {
    cardStyles = "border-rose-400 bg-rose-50/90 text-rose-950 ring-2 ring-rose-400/40 shadow-rose-500/20 shadow-lg";
    badgeStyles = "bg-rose-500 text-white border-rose-400";
  } else if (isSelected) {
    cardStyles = "border-[#7858ca] bg-gradient-to-r from-[#faf7ff] to-[#f4edff] text-[#2a1d47] ring-2 ring-[#7858ca] shadow-purple-500/25 shadow-lg scale-[1.01]";
    badgeStyles = "bg-gradient-to-br from-[#5740a0] to-[#7858ca] text-white border-[#ffc94a]";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group w-full text-left rounded-2xl border-2 p-3.5 sm:p-4 transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 shadow-sm active:scale-[0.99] ${cardStyles} ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <span
          className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-xl text-xs sm:text-sm font-black transition-all shadow-sm ${badgeStyles}`}
        >
          {indexLetter}
        </span>
        <span className="text-xs sm:text-sm font-bold leading-snug line-clamp-2">
          {text}
        </span>
      </div>

      <div className="shrink-0 ml-2">
        {variant === "correct" ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        ) : variant === "incorrect" ? (
          <XCircle className="w-5 h-5 text-rose-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[#8d86a3] group-hover:text-[#7858ca] group-hover:translate-x-0.5 transition-all" />
        )}
      </div>
    </button>
  );
}

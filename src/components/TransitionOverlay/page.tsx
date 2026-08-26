"use client";

import { motion } from "framer-motion";
import { Gamepad2, Sparkles } from "lucide-react";

type GameTransitionOverlayProps = {
  isVisible: boolean;
  message?: string;
};

export default function GameTransitionOverlay({
  isVisible,
  message = "MEMASUKI GAME...",
}: GameTransitionOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden pointer-events-auto">
      {/* Tirai Atas */}
      <motion.div
        initial={{ y: "-100%" }}
        animate={{ y: "0%" }}
        exit={{ y: "-100%" }}
        transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
        className="absolute top-0 left-0 w-full h-[50%] bg-[#2A2356] border-b-4 border-[#F59E0B] shadow-2xl flex items-end justify-center pb-4"
      />

      {/* Tirai Bawah */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: "0%" }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
        className="absolute bottom-0 left-0 w-full h-[50%] bg-[#2A2356] border-t-4 border-[#F59E0B] shadow-2xl flex items-start justify-center pt-4"
      />

      {/* Konten Center (Emblem & Status Game) */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4, type: "spring" }}
        className="relative z-10 flex flex-col items-center gap-4 text-center px-6"
      >
        {/* Emblem Game */}
        <div className="relative">
          <div className="w-20 h-20 bg-[#5B5288] rounded-2xl border-4 border-[#F59E0B] shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center animate-pulse">
            <Gamepad2 className="w-10 h-10 text-white" />
          </div>
          <Sparkles className="w-6 h-6 text-amber-300 absolute -top-2 -right-2 animate-spin" />
        </div>

        {/* Teks Status */}
        <div>
          <h2 className="text-xl md:text-2xl font-black text-amber-400 tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {message}
          </h2>
          <p className="text-xs text-purple-200 mt-1 font-bold animate-pulse">
            MENIAPKAN PROFILE & INVENTORY...
          </p>
        </div>

        {/* Loading Bar XP Style */}
        <div className="w-64 h-3 bg-black/50 border border-[#F59E0B]/50 rounded-full overflow-hidden p-0.5">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full shadow-[0_0_10px_#F59E0B]"
          />
        </div>
      </motion.div>
    </div>
  );
}
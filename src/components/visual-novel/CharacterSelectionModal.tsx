"use client";

import { useState } from "react";
import { MENTORS, MentorCharacter, saveSelectedMentor } from "@/constants/mentors";
import { Check, Sparkles, UserCheck, ShieldCheck, Award } from "lucide-react";

type Props = {
  isOpen: boolean;
  onSelect: (mentor: MentorCharacter) => void;
  onClose?: () => void;
  canDismiss?: boolean;
};

export default function CharacterSelectionModal({
  isOpen,
  onSelect,
  onClose,
  canDismiss = false,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>(MENTORS[0].id);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const chosen = MENTORS.find((m) => m.id === selectedId) || MENTORS[0];
    saveSelectedMentor(chosen.id);
    if (typeof window !== "undefined") {
      localStorage.setItem("syariah_mentor_chosen", "true");
    }
    onSelect(chosen);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-purple-500/30 bg-[#161330] p-6 sm:p-8 shadow-2xl text-white">
        {/* Glow ambient background */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />

        {/* Header */}
        <div className="relative text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Pilihan Mentor & Pengajar Karakter</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Pilih Mentor Konsultasi Syariah
          </h2>
          <p className="mt-2 text-sm text-purple-200/70 max-w-lg mx-auto">
            Pilihlah salah satu dari 2 pengajar yang akan membimbingmu menyelesaikan misi kasus, mendampingi di ruang kelas visual novel, dan membantumu saat sesi remedial.
          </p>
        </div>

        {/* 2 Characters Cards */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-6">
          {MENTORS.map((mentor) => {
            const isSelected = selectedId === mentor.id;
            return (
              <div
                key={mentor.id}
                onClick={() => setSelectedId(mentor.id)}
                className={`relative group cursor-pointer rounded-2xl p-5 border-2 transition-all duration-300 flex flex-col items-center text-center ${
                  isSelected
                    ? "border-amber-400 bg-gradient-to-b from-[#251e4b] to-[#1a143b] shadow-[0_0_25px_rgba(251,191,36,0.25)] scale-[1.02]"
                    : "border-purple-900/60 bg-[#1e1940]/60 hover:border-purple-500/50 hover:bg-[#231d4d]/80"
                }`}
              >
                {/* Selected badge */}
                {isSelected && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 bg-amber-400 text-slate-950 text-[11px] font-black px-2.5 py-1 rounded-full shadow">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Terpilih</span>
                  </div>
                )}

                {/* Character Avatar */}
                <div className="relative mb-4 mt-2">
                  <div
                    className={`w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 p-1 transition-all duration-300 ${
                      isSelected
                        ? "border-amber-400 ring-4 ring-amber-400/20 shadow-lg"
                        : "border-purple-500/30 group-hover:border-purple-400"
                    }`}
                  >
                    <img
                      src={mentor.avatar}
                      alt={mentor.name}
                      className="w-full h-full object-cover object-top rounded-xl"
                    />
                  </div>
                  <div className="absolute -bottom-2 bg-[#120f29] px-2.5 py-0.5 rounded-full border border-purple-400/40 text-[10px] text-purple-200 font-bold uppercase tracking-wider">
                    Pengajar
                  </div>
                </div>

                {/* Name & Title */}
                <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                  {mentor.name}
                </h3>
                <span className="text-xs font-semibold text-purple-300 mt-0.5">
                  {mentor.role}
                </span>

                {/* Specialty Pill */}
                <div className="mt-3 px-3 py-1 rounded-lg bg-purple-950/60 border border-purple-800/40 text-[11px] text-amber-200/90 font-medium leading-relaxed">
                  {mentor.specialty}
                </div>

                {/* Description */}
                <p className="mt-3 text-xs text-purple-200/60 leading-relaxed text-justify px-1 flex-1">
                  “{mentor.description}”
                </p>

                {/* Greeting preview */}
                <div className="mt-4 w-full p-2.5 rounded-xl bg-[#14102e] border border-purple-900/50 text-[11px] text-purple-300 italic text-left flex items-start gap-2">
                  <span className="text-amber-400 text-sm leading-none">“</span>
                  <span className="line-clamp-2">{mentor.greeting}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-purple-900/50">
          <div className="flex items-center gap-2 text-xs text-purple-300/70">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Karakter mentor dapat diganti kapan saja melalui menu Pengaturan.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {canDismiss && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-purple-700/50 text-purple-200 hover:bg-purple-900/30 text-sm font-semibold transition"
              >
                Batal
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-bold text-sm shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all hover:scale-105"
            >
              <UserCheck className="w-4 h-4" />
              <span>Konfirmasi & Mulai Misi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
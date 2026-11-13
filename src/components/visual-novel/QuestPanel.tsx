"use client";

import React from "react";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

export type QuestObjective = {
  id: string;
  title: string;
  isCompleted: boolean;
  reward?: string;
};

type Props = {
  title?: string;
  subtitle?: string;
  objectives: QuestObjective[];
  className?: string;
};

export default function QuestPanel({
  title = "Jurnal Objektif & Misi",
  subtitle = "Selesaikan target pembelajaran untuk membuka area berikutnya",
  objectives,
  className = "",
}: Props) {
  const completedCount = objectives.filter((o) => o.isCompleted).length;

  return (
    <div
      className={`rounded-2xl border border-[#e8e1f3] bg-white p-5 shadow-[0_5px_18px_rgba(59,43,92,0.06)] text-[#30274d] ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[#e8e1f3]">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#7858ca] uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-[#ffc94a]" />
            <span>Target Bab</span>
          </div>
          <h3 className="text-base font-black text-[#30274d] mt-0.5">{title}</h3>
          <p className="text-xs text-[#8d86a3]">{subtitle}</p>
        </div>

        <span className="px-3 py-1 rounded-full bg-[#eee8ff] text-[#5740a0] font-black text-xs">
          {completedCount} / {objectives.length} Selesai
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {objectives.map((obj) => (
          <div
            key={obj.id}
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
              obj.isCompleted
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                : "bg-[#fbf9ff] border-[#e8e1f3] text-[#30274d]"
            }`}
          >
            <div className="flex items-center gap-3">
              {obj.isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-[#8d86a3] shrink-0" />
              )}
              <span className={`text-xs font-bold ${obj.isCompleted ? "line-through opacity-80" : ""}`}>
                {obj.title}
              </span>
            </div>

            {obj.reward && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#fff] border border-[#e8e1f3] text-[#b77900]">
                {obj.reward}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

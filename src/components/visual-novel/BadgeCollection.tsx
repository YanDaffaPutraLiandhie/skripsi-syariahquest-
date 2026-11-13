"use client";

import React from "react";
import { Lock } from "lucide-react";

export type BadgeItem = {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or icon URL
  isUnlocked: boolean;
};

type Props = {
  badges: BadgeItem[];
  className?: string;
};

export default function BadgeCollection({ badges, className = "" }: Props) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3.5 ${className}`}>
      {badges.map((badge) => (
        <article
          key={badge.id}
          className={`rounded-2xl border p-4 sm:p-5 flex flex-col items-center text-center gap-2 transition-all ${
            badge.isUnlocked
              ? "bg-white border-[#e8e1f3] shadow-sm hover:shadow-md hover:border-[#7858ca]"
              : "bg-[#f8f6fc] border-[#ece6f7] opacity-60"
          }`}
        >
          <div className="relative text-3xl sm:text-4xl mb-1 flex items-center justify-center">
            {badge.isUnlocked ? (
              <span>{badge.icon}</span>
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#e8e1f3] flex items-center justify-center text-[#8d86a3]">
                <Lock className="w-5 h-5 text-[#8d86a3]" />
              </div>
            )}
          </div>

          <b className="text-xs sm:text-sm font-black text-[#30274d] line-clamp-1">
            {badge.name}
          </b>

          <small className="text-[10px] text-[#8d86a3] font-semibold leading-relaxed line-clamp-2">
            {badge.description}
          </small>
        </article>
      ))}
    </div>
  );
}

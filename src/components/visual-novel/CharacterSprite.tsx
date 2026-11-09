"use client";

import React from "react";
import type { Expression } from "@/lib/game/characterRegistry";

type Props = {
  src: string;
  alt?: string;
  name?: string;
  position?: "center" | "left" | "right";
  expression?: Expression;
  className?: string;
};

export default function CharacterSprite({
  src,
  alt = "Karakter Cerita",
  name,
  position = "center",
  expression = "normal",
  className = "",
}: Props) {
  const posClasses = {
    center: "left-1/2 -translate-x-1/2",
    left: "left-[12%]",
    right: "right-[12%]",
  };

  const expressionClasses: Record<Expression, string> = {
    normal: "",
    smile: "saturate-[1.08] brightness-[1.03]",
    happy: "scale-[1.03] saturate-[1.18] brightness-[1.06]",
    sad: "brightness-[0.78] saturate-[0.65]",
    confused: "-rotate-1 saturate-[0.9]",
    thinking: "rotate-1 brightness-[0.96]",
    surprised: "scale-[1.04] brightness-[1.1] contrast-[1.04]",
    serious: "contrast-[1.12] saturate-[0.9]",
    disappointed: "brightness-[0.72] saturate-[0.7]",
  };

  return (
    <div
      className={`absolute bottom-0 ${posClasses[position]} h-[82%] max-h-[580px] max-w-[85%] sm:max-w-[48%] z-10 pointer-events-none flex flex-col items-center justify-end transition-all duration-300 ${className}`}
    >
      {/* Floating Name Badge above Sprite if provided */}
      {name && (
        <div className="mb-2 px-3 py-1 rounded-full bg-[#1b1238]/90 border border-[#ffc94a]/60 text-[#ffc94a] text-[10px] font-black tracking-wide shadow-xl backdrop-blur-md animate-in fade-in duration-300">
          {name}
        </div>
      )}

      {/* Character Sprite Image with Soft Silhouette Ambient Glow */}
      <img
          src={src}
          alt={alt}
          data-expression={expression}
          className={`h-full w-auto max-w-full object-contain object-bottom brightness-[1.08] contrast-[1.05] drop-shadow-[0_8px_24px_rgba(15,8,30,0.70)] animate-in fade-in zoom-in-95 duration-400 transition-all ${expressionClasses[expression]}`}
          style={{ imageRendering: "auto" }}
      />
    </div>
  );
}

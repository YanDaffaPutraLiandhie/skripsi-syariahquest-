"use client";

import React from "react";

type Props = {
  src: string;
  alt?: string;
  name?: string;
  position?: "center" | "left" | "right";
  className?: string;
};

export default function CharacterSprite({
  src,
  alt = "Karakter Cerita",
  name,
  position = "center",
  className = "",
}: Props) {
  const posClasses = {
    center: "left-1/2 -translate-x-1/2",
    left: "left-[12%]",
    right: "right-[12%]",
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
        className="h-full w-auto max-w-full object-contain object-bottom filter drop-shadow-[0_15px_30px_rgba(15,8,30,0.85)] brightness-105 contrast-[1.02] animate-in fade-in zoom-in-95 duration-400"
      />
    </div>
  );
}

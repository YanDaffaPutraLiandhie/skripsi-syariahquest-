"use client";

import React, { useState } from "react";
import { Compass, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

type Props = {
  mapSrc?: string;
  title?: string;
  children?: React.ReactNode;
  className?: string;
};

export default function WorldMap({
  mapSrc = "/game/world-map.png",
  title = "PETA KOTA SYARIAH",
  children,
  className = "",
}: Props) {
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.15, 1.3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.15, 0.9));
  const handleReset = () => setZoomLevel(1);

  return (
    <div
      className={`relative w-full aspect-[16/9] min-h-[380px] max-h-[750px] rounded-3xl border-4 sm:border-8 border-[#2e2154] bg-[#160f30] overflow-hidden shadow-[0_20px_50px_rgba(20,12,40,0.6)] select-none group ${className}`}
    >
      {/* Decorative Golden Corner Ornaments */}
      <div className="pointer-events-none absolute top-2 left-2 w-4 sm:w-5 h-4 sm:h-5 border-t-2 border-l-2 border-[#ffc94a]/80 rounded-tl-lg z-30" />
      <div className="pointer-events-none absolute top-2 right-2 w-4 sm:w-5 h-4 sm:h-5 border-t-2 border-r-2 border-[#ffc94a]/80 rounded-tr-lg z-30" />
      <div className="pointer-events-none absolute bottom-2 left-2 w-4 sm:w-5 h-4 sm:h-5 border-b-2 border-l-2 border-[#ffc94a]/80 rounded-bl-lg z-30" />
      <div className="pointer-events-none absolute bottom-2 right-2 w-4 sm:w-5 h-4 sm:h-5 border-b-2 border-r-2 border-[#ffc94a]/80 rounded-br-lg z-30" />

      {/* Map Header Overlay Bar */}
      <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 z-30 flex items-center gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#1b1236]/90 border border-[#7858ca]/40 text-[#ffc94a] shadow-lg backdrop-blur-md">
        <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin-slow text-[#ffc94a]" />
        <span className="text-[10px] sm:text-[11px] font-black tracking-widest uppercase">
          {title}
        </span>
      </div>

      {/* Map Zoom Controls */}
      <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-30 flex items-center gap-1 sm:gap-1.5 bg-[#1b1236]/90 border border-[#7858ca]/40 rounded-2xl p-1 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Perbesar Peta"
          className="p-1 sm:p-1.5 rounded-xl hover:bg-[#7858ca]/40 text-purple-200 hover:text-white transition"
        >
          <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Perkecil Peta"
          className="p-1 sm:p-1.5 rounded-xl hover:bg-[#7858ca]/40 text-purple-200 hover:text-white transition"
        >
          <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          type="button"
          onClick={handleReset}
          title="Atur Ulang Tampilan"
          className="p-1 sm:p-1.5 rounded-xl hover:bg-[#7858ca]/40 text-purple-200 hover:text-white transition"
        >
          <Maximize2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
        </button>
      </div>

      {/* Zoomable Container */}
      <div
        className="relative w-full h-full transition-transform duration-500 origin-center"
        style={{ transform: `scale(${zoomLevel})` }}
      >
        {/* Background City Map Image (Always 16:9 matching container) */}
        <img
          src={mapSrc}
          alt="Peta Kota Syariah Quest HD"
          className="w-full h-full object-cover object-center filter brightness-[1.03] contrast-[1.04]"
        />

        {/* Ambient atmospheric vignettes & sunlight gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#150d2e]/35 via-transparent to-black/20" />

        {/* Pins Layer */}
        {children}
      </div>
    </div>
  );
}

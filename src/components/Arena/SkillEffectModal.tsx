"use client";

import dynamic from "next/dynamic";

const Player = dynamic(() => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player), { ssr: false });

export type SkillEffectConfig = {
  animationPath: string; 
  title: string;
  subtitle: string;
  colorClass: string; 
  // BARU: Properti opsional untuk ngatur ukuran & posisi tiap animasi yang beda-beda
  customStyle?: string; 
};

export default function SkillEffectModal({
  animationPath,
  title,
  subtitle,
  colorClass,
  customStyle, // Ambil propertinya di sini
}: SkillEffectConfig) {
  
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="text-center flex flex-col items-center">
        
        {/* PERBAIKAN: Masukkan customStyle ke className. 
            Kalau customStyle kosong, dia pakai ukuran default (w-80 h-80 dll) */}
        <div className={`mx-auto drop-shadow-2xl pointer-events-none ${customStyle || "w-80 h-80 md:w-[400px] md:h-[400px] scale-110 md:scale-125"}`}>
          <Player
            autoplay
            loop
            src={animationPath}
            style={{ height: '100%', width: '100%' }}
          />
        </div>

        <h2
          className={`text-5xl md:text-6xl font-black text-white text-stroke drop-shadow-2xl animate-pulse italic tracking-wider uppercase relative z-10 -mt-10 md:-mt-16 ${colorClass}`}
        >
          {title}
        </h2>
        
        <p className="text-white text-xl md:text-3xl font-bold mt-4 md:mt-6 drop-shadow-lg relative z-10">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
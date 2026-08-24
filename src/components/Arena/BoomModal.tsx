"use client";

import dynamic from "next/dynamic";

const Player = dynamic(() => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player), { ssr: false });

export default function BoomModal() {
  return (
    // pointer-events-none agar modal ini tidak memblokir klik apa-apa kalau misal mau ditutup
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-md transition-opacity pointer-events-none overflow-hidden">
      <div className="flex items-center justify-center w-full h-full">
        {/* Ukuran super raksasa dan di-zoom gila-gilaan */}
        <div className="w-[500px] h-[500px] md:w-[800px] md:h-[800px] lg:w-[1000px] lg:h-[1000px] drop-shadow-2xl scale-[2] md:scale-[2.5]">
          <Player
            autoplay
            loop={false} // Ku-set false biar ledakannya cuma sekali duarr, tapi ukurannya brutal
            src="/animations/bomb-explosion.json"
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
} 
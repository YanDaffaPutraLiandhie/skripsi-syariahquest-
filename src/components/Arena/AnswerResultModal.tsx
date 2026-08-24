"use client";

import dynamic from "next/dynamic";

// Memaksa Lottie HANYA jalan di Browser (Anti 'document is not defined')
const Player = dynamic(() => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player), { ssr: false });

export default function AnswerResultModal({ isCorrect }: { isCorrect: boolean }) {
  const path = isCorrect ? "/animations/correct.json" : "/animations/incorrect.json";

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="text-center">
        <div className="w-64 h-64 md:w-80 md:h-80 mx-auto drop-shadow-2xl">
          <Player
            autoplay
            loop
            src={path}
            style={{ height: '100%', width: '100%' }}
          />
        </div>
        <h2
          className={`text-6xl font-black text-white text-stroke drop-shadow-2xl animate-pulse italic tracking-wider uppercase -mt-6 ${
            isCorrect ? "text-green-500" : "text-red-500"
          }`}
        >
          {isCorrect ? "BENAR!" : "SALAH!"}
        </h2>
        <p className="text-white text-2xl font-bold mt-4 drop-shadow-lg">
          {isCorrect ? "Kamu Maju 1 Langkah!" : "Kamu Dihukum Mundur 2 Langkah!"}
        </p>
      </div>
    </div>
  );
}
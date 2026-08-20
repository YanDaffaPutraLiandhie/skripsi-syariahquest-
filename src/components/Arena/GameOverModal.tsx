"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Player = dynamic(() => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player), { ssr: false });

type GameOverModalProps = {
  isWinner: boolean;
  earnedBadge?: {
    nama_badge: string;
    icon_url: string;
  } | null;
};

export default function GameOverModal({ isWinner, earnedBadge }: GameOverModalProps) {
  const router = useRouter();
  const path = isWinner ? "/animations/victory-trophy.json" : "/animations/game-over.json";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-[420px] rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center gap-4 relative overflow-hidden">
        
        {isWinner && (
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-yellow-300/30 rounded-full blur-3xl"></div>
        )}

        {isWinner ? (
          <>
            <div className="w-40 h-40 relative z-10 -mb-2">
              <Player
                autoplay
                loop
                src={path}
                style={{ height: '100%', width: '100%' }}
              />
            </div>
            <h2 className="text-3xl font-extrabold text-[#5B5288] relative z-10">
              Kamu Menang! 🎉
            </h2>
            <p className="text-gray-500 text-sm mb-2 relative z-10">
              Kerja bagus! Kamu berhasil mencapai garis finish lebih dulu.
            </p>

            {earnedBadge && (
              <div className="w-full bg-purple-50 rounded-2xl p-4 mt-2 border border-purple-100 relative z-10 animate-in zoom-in-75 duration-500 delay-300">
                <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">Pencapaian Baru Dibuka!</p>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 bg-white rounded-full p-2 shadow-xl shadow-purple-200 animate-bounce">
                    <img src={earnedBadge.icon_url} alt="Badge" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="font-black text-[#5B5288] text-lg">{earnedBadge.nama_badge}</h3>
                </div>
              </div>
            )}
          </>
        ) : (
          <>

            <div className="w-40 h-40 relative z-10 -mb-2">
              <Player
                autoplay
                loop={true} // <-- UBAH INI JADI TRUE
                src={path}
                style={{ height: '100%', width: '100%' }}
              />
            </div>
            <h2 className="text-3xl font-extrabold text-[#5B5288]">
              Permainan Selesai
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              Pemain lain sudah lebih dulu mencapai garis finish. Jangan menyerah, balas di ronde berikutnya!
            </p>
          </>
        )}

        <button
          onClick={() => router.push("/arena")}
          className="w-full mt-4 py-3.5 rounded-xl bg-[#5B5288] text-white font-bold hover:bg-[#4A4270] hover:shadow-lg transition-all relative z-10"
        >
          Kembali ke Arena Kelas
        </button>
      </div>
    </div>
  );
}
"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const Player = dynamic(
  () =>
    import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
  { ssr: false }
);

type GameOverModalProps = {
  isWinner: boolean;
  earnedBadge?: {
    nama_badge: string;
    icon_url: string;
  } | null;
};

export default function GameOverModal({
  isWinner,
  earnedBadge,
}: GameOverModalProps) {
  const router = useRouter();
  const path = isWinner ? "/animations/victory-trophy.json" : "/animations/game-over.json";

  // State untuk efek loading di tombol
  const [isLoading, setIsLoading] = useState(false);

  // ==========================================
  // JURUS BERSIH-BERSIH MANDIRI (Bypass RLS)
  // ==========================================
  const handleBackToArena = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 1. Cari id_mahasiswa milik user ini
        const { data: userData } = await supabase
          .from("user")
          .select("id_mahasiswa")
          .eq("auth_user_id", user.id)
          .single();

        if (userData?.id_mahasiswa) {
          // 2. Reset status inRoom jadi FALSE di tabel mahasiswa
          await supabase
            .from("mahasiswa")
            .update({ inRoom: false })
            .eq("id_mahasiswa", userData.id_mahasiswa);
        }

        // 3. Pastikan juga dia terhapus dari room_player
        await supabase
          .from("room_player")
          .delete()
          .eq("id_user", user.id);
      }
    } catch (error) {
      console.error("Gagal mereset status pemain:", error);
    } finally {
      // Apapun yang terjadi, tetap kembalikan ke Arena
      router.push("/mahasiswa/arena");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-[420px] rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center gap-4 relative overflow-hidden">

        {isWinner && (
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-yellow-300/30 rounded-full blur-3xl" />
        )}

        {isWinner ? (
          <>
            <div className="w-40 h-40 relative z-10 -mb-2">
              <Player
                autoplay
                loop
                src={path}
                style={{ height: "100%", width: "100%" }}
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
                <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">
                  Pencapaian Baru Dibuka!
                </p>

                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 bg-white rounded-full p-2 shadow-xl shadow-purple-200 animate-bounce">
                    <img
                      src={earnedBadge.icon_url}
                      alt="Badge"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <h3 className="font-black text-[#5B5288] text-lg">
                    {earnedBadge.nama_badge}
                  </h3>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="w-40 h-40 relative z-10 -mb-2">
              <Player
                autoplay
                loop={true}
                src={path}
                style={{ height: "100%", width: "100%" }}
              />
            </div>

            <h2 className="text-3xl font-extrabold text-[#5B5288]">
              Permainan Selesai
            </h2>

            <p className="text-gray-500 text-sm mb-4">
              Pemain lain sudah lebih dulu mencapai garis finish. Jangan
              menyerah, balas di ronde berikutnya!
            </p>
          </>
        )}

        <button
          onClick={handleBackToArena}
          disabled={isLoading}
          className="w-full mt-4 py-3.5 rounded-xl bg-[#5B5288] text-white font-bold hover:bg-[#4A4270] hover:shadow-lg transition-all relative z-10 flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
          {isLoading ? "Membersihkan Arena..." : "Kembali ke Arena Permainan"}
        </button>
      </div>
    </div>
  );
}
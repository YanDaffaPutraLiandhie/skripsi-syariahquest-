"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function JoinByLinkPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function joinRoom() {
      // 1. PASTIKAN USER LOGIN DULU!
      // Kalau fetch room duluan, akan diblokir RLS jika belum login
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Belum login -> lempar ke login, lalu balik lagi ke sini setelah login
        router.push(`/login?redirect=/arena/join/${roomId}`);
        return;
      }

      // 2. BARU cek room-nya ada dan masih terbuka
      const { data: room, error: roomError } = await supabase
        .from("room")
        .select("id_room, id_game, status")
        .eq("id_room", roomId)
        .single();

      if (roomError || !room) {
        setErrorMsg("Ruang tidak ditemukan atau sudah tidak aktif.");
        return;
      }

      if (room.status === "finished") {
        setErrorMsg("Ruang ini sudah selesai dimainkan.");
        return;
      }

      // 3. Daftarkan user ke room_player (aman dipanggil berkali-kali karena upsert)
      const { error: joinError } = await supabase.from("room_player").upsert(
        {
          id_room: room.id_room,
          id_user: user.id,
          posisi: 0,
          is_host: false,
        },
        { onConflict: "id_room,id_user", ignoreDuplicates: true }
      );

      if (joinError) {
        console.error("Gagal join room lewat link:", joinError);
        setErrorMsg("Gagal bergabung ke ruang. Coba lagi.");
        return;
      }

      // 4. Masuk ke halaman arena
      router.replace(`/arena/play/${room.id_room}`); // ?gameId= sudah tidak dipakai
    }

    joinRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  if (errorMsg) {
    return (
      <div className="h-screen bg-[#F8F9FB] flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-red-500 font-bold text-lg">{errorMsg}</p>
        <button
          onClick={() => router.push("/arena")}
          className="mt-2 px-6 py-2.5 rounded-xl bg-[#5B5288] text-white font-bold hover:brightness-110 transition-all"
        >
          Kembali ke Arena Kelas
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F8F9FB] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-[#5B5288] animate-spin" />
      <p className="text-[#5B5288] font-semibold">Menghubungkan ke ruang...</p>
    </div>
  );
}
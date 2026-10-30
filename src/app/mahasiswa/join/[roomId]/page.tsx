"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Halaman undangan: /arena/join/[roomId]
 *
 * Tugasnya hanya satu: memasukkan pemain ke room lalu mengarahkannya ke
 * /arena/play/[roomId]. Versi sebelumnya berisi salinan lengkap halaman
 * Arena Kelas di bawah `return` yang tidak pernah bisa tercapai
 * (kode mati), jadi sekarang dihapus.
 */
export default function JoinArenaRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function joinInvitedRoom() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const target = encodeURIComponent(`/arena/join/${roomId}`);
        router.replace(`/login?redirect=${target}`);
        return;
      }

      const { data: room, error: roomError } = await supabase
        .from("room")
        .select("id_room, status")
        .eq("id_room", roomId)
        .neq("status", "finished")
        .maybeSingle();

      if (roomError || !room) {
        if (!isCancelled) setErrorMessage("Ruangan tidak ditemukan atau sudah selesai.");
        return;
      }

      const { error: upsertError } = await supabase.from("room_player").upsert(
        {
          id_room: room.id_room,
          id_user: user.id,
          posisi: 0,
          is_host: false,
          is_inRoom: true,
        },
        { onConflict: "id_room,id_user", ignoreDuplicates: false },
      );

      if (upsertError) {
        console.error("Gagal bergabung ke room:", upsertError);
        if (!isCancelled) setErrorMessage("Gagal masuk ke ruang tunggu. Coba lagi.");
        return;
      }

      const { data: userData } = await supabase
        .from("user")
        .select("id_mahasiswa")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (userData?.id_mahasiswa) {
        await supabase
          .from("mahasiswa")
          .update({ inRoom: true })
          .eq("id_mahasiswa", userData.id_mahasiswa);
      }

      if (!isCancelled) {
        router.replace(`/arena/play/${roomId}`);
      }
    }

    joinInvitedRoom().catch((err) => {
      console.error("Gagal memproses undangan:", err);
      if (!isCancelled) setErrorMessage("Terjadi kesalahan. Coba buka tautan undangan lagi.");
    });

    return () => {
      isCancelled = true;
    };
  }, [roomId, router]);

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB] px-6 text-center">
        <p className="font-bold text-red-500">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F8F9FB]">
      <Loader2 className="h-8 w-8 animate-spin text-[#5B5288]" />
      <p className="font-semibold text-[#5B5288]">Memasukkanmu ke ruang tunggu...</p>
    </div>
  );
}
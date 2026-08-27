"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type CreateRoomResult = {
  idRoom: string;
  pin: string | null;
};

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4 digit, 1000-9999
}

export function useCreateRoom() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createRoom(
    gameId: number,
    isPrivate: boolean
  ): Promise<CreateRoomResult | null> {
    setIsCreating(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Kamu harus login dulu untuk membuat ruang.");
      setIsCreating(false);
      return null;
    }

    const pin = isPrivate ? generatePin() : null;

    // Insert row room
    const { data: roomData, error: roomError } = await supabase
      .from("room")
      .insert({
        id_game: gameId,
        host_user_id: user.id,
        is_private: isPrivate,
        pin,
        status: "waiting",
      })
      .select("id_room")
      .single();

    if (roomError || !roomData) {
      console.error("Gagal membuat room:", roomError);
      setError("Gagal membuat ruang. Coba lagi.");
      setIsCreating(false);
      return null;
    }

    // Insert host sebagai pemain pertama di room_player
    const { error: playerError } = await supabase.from("room_player").insert({
      id_room: roomData.id_room,
      id_user: user.id,
      posisi: 0,
      is_host: true,
      is_inRoom: true,
    });

    if (playerError) {
      console.error("Gagal mendaftarkan host ke room:", playerError);
      setError("Gagal masuk ke ruang yang baru dibuat.");
      setIsCreating(false);
      return null;
    }

    // Update status inRoom di tabel mahasiswa
    await supabase.from("mahasiswa").update({ inRoom: true }).eq("auth_user_id", user.id);

    setIsCreating(false);
    return { idRoom: roomData.id_room, pin };
  }

  return { createRoom, isCreating, error };
}
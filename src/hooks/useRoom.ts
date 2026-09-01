"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type RoomPlayer = {
  id_room_player: string;
  id_room: string;
  id_user: string;
  posisi: number;
  is_host: boolean;
  joined_at: string;
};

export type RoomInfo = {
  id_room: string;
  id_game: number;
  host_user_id: string;
  status: "waiting" | "playing" | "finished";
  current_turn_user_id: string | null;
  winner_user_id: string | null;
  is_private: boolean;
  pin: string | null;
  turn_started_at: string | null;
  trap_tiles: number[];
};

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roomDeleted, setRoomDeleted] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function fetchInitial() {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isCancelled) setCurrentUserId(user?.id ?? null);

      const { data: roomData } = await supabase
        .from("room")
        .select(
          "id_room, id_game, host_user_id, status, current_turn_user_id, winner_user_id, is_private, pin, turn_started_at, trap_tiles"
        )
        .eq("id_room", roomId)
        .single();

      if (!isCancelled && roomData) setRoom(roomData as RoomInfo);

      // Ambil data pemain (tanpa is_inRoom karena sekarang kita main hapus)
      const { data: playerData } = await supabase
        .from("room_player")
        .select("id_room_player, id_room, id_user, posisi, is_host, joined_at")
        .eq("id_room", roomId)
        .order("joined_at", { ascending: true });

      if (!isCancelled && playerData) setPlayers(playerData as RoomPlayer[]);

      if (!isCancelled) setIsLoading(false);
    }

    fetchInitial();

    return () => {
      isCancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    const channel = supabase
      .channel(`room-${roomId}`)
      // 1. Antena INSERT (Pakai filter id_room)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_player",
          filter: `id_room=eq.${roomId}`,
        },
        (payload) => {
          setPlayers((prev) => {
            const newRow = payload.new as RoomPlayer;
            if (prev.some((p) => p.id_room_player === newRow.id_room_player)) {
              return prev;
            }
            return [...prev, newRow].sort(
              (a, b) =>
                new Date(a.joined_at).getTime() -
                new Date(b.joined_at).getTime()
            );
          });
        }
      )
      // 2. Antena UPDATE (Pakai filter id_room)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_player",
          filter: `id_room=eq.${roomId}`,
        },
        (payload) => {
          setPlayers((prev) => {
            const updated = payload.new as RoomPlayer;
            return prev.map((p) =>
              p.id_room_player === updated.id_room_player ? updated : p
            );
          });
        }
      )
      // 3. Antena DELETE (SENGAJA TANPA FILTER biar sinyalnya nembus)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "room_player",
        },
        (payload) => {
          setPlayers((prev) => {
            const removed = payload.old as RoomPlayer;
            return prev.filter(
              (p) => p.id_room_player !== removed.id_room_player
            );
          });
        }
      )
      // 4. Antena UPDATE & DELETE Room Utama
      .on(
        "postgres_changes",
        {
          event: "*", // Tangkap UPDATE dan DELETE untuk room
          schema: "public",
          table: "room",
          filter: `id_room=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setRoomDeleted(true);
            setRoom(null);
            return;
          }
          if (payload.eventType === "UPDATE") {
            setRoom(payload.new as RoomInfo);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const isHost = !!(
    currentUserId && room && room.host_user_id === currentUserId
  );

  const isMyTurn = !!(
    currentUserId &&
    room &&
    room.current_turn_user_id === currentUserId
  );

  const startGame = useCallback(async (trapTiles: number[]) => {
    const firstPlayer = players[0];
    await supabase
      .from("room")
      .update({
        status: "playing",
        current_turn_user_id: firstPlayer?.id_user ?? null,
        turn_started_at: new Date().toISOString(),
        trap_tiles: trapTiles
      })
      .eq("id_room", roomId);
  }, [roomId, players]);

  const updateMyPosisi = useCallback(
    async (posisi: number) => {
      if (!currentUserId) return;
      await supabase
        .from("room_player")
        .update({ posisi })
        .eq("id_room", roomId)
        .eq("id_user", currentUserId);
    },
    [roomId, currentUserId]
  );

  const passTurnToNext = useCallback(async () => {
    if (players.length === 0 || !room) return;

    const currentIndex = players.findIndex(
      (p) => p.id_user === room.current_turn_user_id
    );
    const nextIndex = (currentIndex + 1) % players.length;
    const nextPlayer = players[nextIndex];

    await supabase
      .from("room")
      .update({
        current_turn_user_id: nextPlayer.id_user,
        turn_started_at: new Date().toISOString(),
      })
      .eq("id_room", roomId);
  }, [roomId, players, room]);

  const finishGame = useCallback(
    async (winnerUserId: string) => {
      await supabase
        .from("room")
        .update({ status: "finished", winner_user_id: winnerUserId })
        .eq("id_room", roomId);
    },
    [roomId]
  );

  // =====================================================
  // FUNGSI LEAVE ROOM (Host kabur, mahkota pindah)
  // =====================================================
  const leaveRoom = useCallback(async () => {
    if (!currentUserId) return;

    const remainingPlayers = players.filter(
      (p) => p.id_user !== currentUserId
    );

    // Kasus 1: Ini pemain terakhir di room -> hapus room sekalian
    if (remainingPlayers.length === 0) {
      await supabase.from("room").delete().eq("id_room", roomId);
    } 
    // Kasus 2: Yang keluar adalah host (dan masih ada pemain lain) -> transfer host
    else if (isHost) {
      const nextHost = remainingPlayers[0]; // Oper ke pemain urutan selanjutnya

      // 1. Ubah kepemilikan room
      const { error: errRoom } = await supabase
        .from("room")
        .update({ host_user_id: nextHost.id_user })
        .eq("id_room", roomId);

      // 2. Beri mahkota (is_host: true) ke pemain tersebut
      const { error: errPlayer } = await supabase
        .from("room_player")
        .update({ is_host: true })
        .eq("id_room_player", nextHost.id_room_player);

      if (errRoom || errPlayer) {
        console.error("Gagal transfer host (Cek RLS):", errRoom, errPlayer);
      }
    }

    // Eksekusi WAJIB: Hapus baris room_player milik user yang keluar
    await supabase
      .from("room_player")
      .delete()
      .eq("id_room", roomId)
      .eq("id_user", currentUserId);
      
    // Eksekusi WAJIB: Update mahasiswa status (biar bisa diundang lagi)
    const { data: userData } = await supabase
      .from("user")
      .select("id_mahasiswa")
      .eq("auth_user_id", currentUserId)
      .single();

    if (userData?.id_mahasiswa) {
      await supabase
        .from("mahasiswa")
        .update({ inRoom: false })
        .eq("id_mahasiswa", userData.id_mahasiswa);
    }
  }, [roomId, currentUserId, players, isHost]);

  return {
    room,
    players,
    currentUserId,
    isHost,
    isMyTurn,
    isLoading,
    roomDeleted,
    startGame,
    updateMyPosisi,
    passTurnToNext,
    finishGame,
    leaveRoom,
  };
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type PetakCoord = {
  x: number;
  y: number;
  nomor: number;
};

export type GameBoard = {
  id_game: number;
  nama_game: string;
  deskripsi: string;
  thumbnail_url: string;
  jumlah_petak: number;
  posisi_petak: PetakCoord[];
  is_aktif: boolean;
};

/**
 * Fetch 1 row data papan dari table `game` berdasarkan gameId.
 * gameId boleh `null` atau `undefined` (misal masih nunggu room selesai loading dulu
 * buat tahu id_game-nya) -- selama kosong, hook ini tidak melakukan
 * fetch apapun dan tetap dalam kondisi isLoading = true.
 */
export function useGameBoard(gameId: number | null | undefined) {
  const [boardData, setBoardData] = useState<GameBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // PERBAIKAN 1: Pakai !gameId biar null & undefined langsung dicegat
    if (!gameId) {
      setIsLoading(true);
      return;
    }

    let isCancelled = false;

    async function fetchBoard() {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("game")
        .select(
          "id_game, nama_game, deskripsi, thumbnail_url, jumlah_petak, posisi_petak, is_aktif"
        )
        .eq("id_game", gameId)
        .eq("is_aktif", true)
        .single();

      if (isCancelled) return;

      if (error) {
        // PERBAIKAN 2: Pakai console.warn biar Next.js Turbopack gak ngamuk ngeluarin layar merah
        console.warn("Info: Papan belum tersedia atau id tidak valid.", error);
        setError("Papan tidak ditemukan atau sedang tidak aktif.");
      } else if (data) {
        setBoardData(data as GameBoard);
      }

      setIsLoading(false);
    }

    fetchBoard();

    return () => {
      isCancelled = true;
    };
  }, [gameId]);

  const mapCoords: PetakCoord[] = boardData
    ? [...boardData.posisi_petak].sort((a, b) => a.nomor - b.nomor)
    : [];

  return { boardData, mapCoords, isLoading, error };
}
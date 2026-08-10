"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Jawaban = {
  id_jawaban: number;
  jawaban: string;
};

export type Soal = {
  id_soal: number;
  soal: string;
  jawaban: Jawaban[];
};

// Soal cadangan kalau bank soal di database kosong (misal koneksi bermasalah)
export const FALLBACK_SOAL: Soal = {
  id_soal: 999,
  soal:
    "Apa hukum dari melakukan praktik riba dalam transaksi jual beli menurut syariat Islam? (Soal Backup)",
  jawaban: [
    { id_jawaban: 1, jawaban: "Makruh" },
    { id_jawaban: 2, jawaban: "Haram" },
    { id_jawaban: 3, jawaban: "Mubah" },
    { id_jawaban: 4, jawaban: "Sunnah" },
  ],
};

export function useSoalBank() {
  const [soalList, setSoalList] = useState<Soal[]>([]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchSoal() {
      const { data, error } = await supabase.from("soal").select(`
          id_soal,
          soal,
          jawaban (
            id_jawaban,
            jawaban
          )
        `);

      if (isCancelled) return;

      if (error) {
        console.error("Gagal menarik data soal:", error);
      } else if (data) {
        setSoalList(data as Soal[]);
      }
    }

    fetchSoal();

    return () => {
      isCancelled = true;
    };
  }, []);

  function pickRandomSoal(): Soal {
    if (soalList.length === 0) return FALLBACK_SOAL;
    const randomIndex = Math.floor(Math.random() * soalList.length);
    return soalList[randomIndex];
  }

  return { soalList, pickRandomSoal };
}
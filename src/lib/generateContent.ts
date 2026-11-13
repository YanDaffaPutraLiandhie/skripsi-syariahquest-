// lib/generateContent.ts
// Helper client untuk memicu generate Learning Objects (LO) dan soal otomatis via AI.

import { supabase } from "@/lib/supabase";

async function getAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Sesi login berakhir. Silakan muat ulang halaman.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export type LearningObject = {
  id_sub_topik: number;
  lo_code: string | null;
  judul: string;
  keywords?: string | null;
  remedial_text?: string | null;
};

/**
 * Generate Learning Objects dari teks materi modul via AI (Gemini).
 * Hasilnya otomatis disimpan ke tabel sub_topik oleh server.
 */
export async function generateLearningObjects(
  idModul: number,
): Promise<LearningObject[]> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/generate-lo", {
    method: "POST",
    headers,
    body: JSON.stringify({ idModul }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Gagal generate Learning Objects");
  }
  return (data.los ?? []) as LearningObject[];
}

/**
 * Ambil Learning Objects yang sudah ada di database untuk modul.
 */
export async function fetchLearningObjects(
  idModul: number,
): Promise<LearningObject[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `/api/generate-lo?idModul=${encodeURIComponent(idModul)}`,
    { headers },
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Gagal mengambil Learning Objects");
  }
  return (data.los ?? []) as LearningObject[];
}

export type GeneratedSoal = {
  id_soal: number;
  soal: string;
  lo_code: string;
  id_sub_topik: number | null;
  difficulty_rating: number;
  jawaban: Array<{ id_jawaban: number; jawaban: string; jawaban_benar: boolean }>;
};

/**
 * Generate soal otomatis per LO via AI (Gemini) dan simpan ke database.
 * Setiap LO digenerate `numQuestions` soal (default 5, max 10).
 */
export async function generateSoalOtomatis(
  idModul: number,
  numQuestions: number = 5,
): Promise<GeneratedSoal[]> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/generate-questions", {
    method: "POST",
    headers,
    body: JSON.stringify({ idModul, numQuestions, saveToDb: true }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Gagal generate soal");
  }
  return (data.questions ?? []) as GeneratedSoal[];
}
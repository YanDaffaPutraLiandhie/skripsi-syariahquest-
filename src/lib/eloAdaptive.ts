// lib/eloAdaptive.ts  (menggantikan versi lama + menggantikan adaptiveLearning.ts)
// Satu-satunya sistem adaptif: Elo mahasiswa vs rating soal / level modul.
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_ELO_CONFIG,
  getEloContext,
  type EloLevelConfig,
} from "@/lib/elo";

export const MAX_SOAL_KUIS = 50;
export const MIN_SOAL_KUIS = 10;
/** Tiap sub-topik minimal diwakili sekian soal agar hasil kuis bisa diagnosis. */
export const MIN_SOAL_PER_SUB_TOPIK = 2;

/** Peluang mahasiswa (elo) menjawab benar soal/materi dengan rating tertentu. */
export function expectedScore(elo: number, difficulty: number): number {
  return 1 / (1 + Math.pow(10, (difficulty - elo) / 400));
}

/** Nama kategori (Easy/Medium/Hard) dari rating terdekat dengan config level. */
export function kategoriDariRating(
  rating: number,
  config: EloLevelConfig[] = DEFAULT_ELO_CONFIG,
): string {
  const nearest = config.reduce((a, b) =>
    Math.abs(b.difficulty - rating) < Math.abs(a.difficulty - rating) ? b : a,
  );
  return nearest.nama;
}

// ---------------------------------------------------------------------
// SOAL
// ---------------------------------------------------------------------

type SoalBerating = {
  id_soal: number;
  difficulty_rating?: number | null;
  id_sub_topik?: number | null;
};

/**
 * Pilih & urutkan soal sesuai Elo:
 *  1. Tiap sub-topik diwakili minimal MIN_SOAL_PER_SUB_TOPIK soal
 *     (yang ratingnya paling dekat dengan Elo).
 *  2. Sisa kuota diisi soal yang ratingnya paling dekat dengan Elo
 *     (+ sedikit acak agar kuis tidak selalu sama).
 *  3. Jumlah: bank <= 10 -> semua; selain itu ~70% (min 10, maks 50).
 *  4. Urutan tampil dari mudah ke sulit.
 *
 * Soal TANPA rating memakai `fallbackDifficulty` (difficulty level modul).
 */
export function selectQuestionsByElo<T extends SoalBerating>(
  questions: T[],
  elo: number,
  fallbackDifficulty: number,
): T[] {
  const rating = (q: T) => {
    const r = q.difficulty_rating;
    return r === null || r === undefined || Number.isNaN(Number(r))
      ? fallbackDifficulty
      : Number(r);
  };

  const total = questions.length;
  const count =
    total <= MIN_SOAL_KUIS
      ? total
      : Math.min(MAX_SOAL_KUIS, Math.max(MIN_SOAL_KUIS, Math.ceil(total * 0.7)));

  const scored = questions
    .map((q) => ({ q, skor: Math.abs(rating(q) - elo) + Math.random() * 80 }))
    .sort((a, b) => a.skor - b.skor);

  const picked = new Map<number, T>();

  // 1. wakili tiap sub-topik
  const perTopik = new Map<number, typeof scored>();
  for (const s of scored) {
    const key = s.q.id_sub_topik;
    if (key === null || key === undefined) continue;
    const arr = perTopik.get(key) ?? [];
    arr.push(s);
    perTopik.set(key, arr);
  }
  for (const arr of perTopik.values()) {
    for (const s of arr.slice(0, MIN_SOAL_PER_SUB_TOPIK)) {
      picked.set(s.q.id_soal, s.q);
    }
  }

  // 2. isi sisa kuota
  for (const s of scored) {
    if (picked.size >= count) break;
    picked.set(s.q.id_soal, s.q);
  }

  return Array.from(picked.values())
    .slice(0, MAX_SOAL_KUIS)
    .sort((a, b) => rating(a) - rating(b));
}

/** Elo mahasiswa + difficulty level modul (cadangan untuk soal tanpa rating). */
export async function siapkanKonteksSoal(
  idMahasiswa: number,
  idModul: number,
): Promise<{ elo: number; fallback: number }> {
  const [ctx, modulRes] = await Promise.all([
    getEloContext(idMahasiswa),
    supabase.from("modul").select("id_level").eq("id_modul", idModul).maybeSingle(),
  ]);

  if (modulRes.error) throw modulRes.error;

  const level = ctx.config.find(
    (c) => c.id_level === Number(modulRes.data?.id_level),
  );

  return { elo: ctx.elo, fallback: level?.difficulty ?? 1000 };
}

export type JawabanSiswa = { id_soal: number; id_jawaban: number | null };

/**
 * Panggil SATU KALI saat kuis selesai untuk mengkalibrasi rating tiap soal.
 * Benar/salah dinilai di server. Kegagalan tidak boleh mengganggu mahasiswa.
 */
export async function kalibrasiSoal(
  idMahasiswa: number,
  jawaban: JawabanSiswa[],
): Promise<void> {
  const dijawab = jawaban.filter((j) => j.id_jawaban !== null);
  if (dijawab.length === 0) return;

  const { error } = await supabase.rpc("kalibrasi_soal", {
    p_id_mahasiswa: idMahasiswa,
    p_jawaban: dijawab,
  });

  if (error) console.error("Gagal kalibrasi soal:", error.message);
}

// ---------------------------------------------------------------------
// MATERI (MODUL)
// ---------------------------------------------------------------------

export type RekomendasiModul = {
  status: "rekomendasi" | "tantangan" | "mudah";
  label: string;
  peluang: number; // 0-100, perkiraan peluang lulus
};

/** Seberapa cocok sebuah modul (levelnya) untuk Elo mahasiswa. */
export function getRekomendasiModul(
  elo: number,
  idLevel: number,
  config: EloLevelConfig[] = DEFAULT_ELO_CONFIG,
): RekomendasiModul {
  const level = config.find((c) => c.id_level === Number(idLevel));
  const difficulty = level?.difficulty ?? 1000;
  const selisih = difficulty - elo;
  const peluang = Math.round(expectedScore(elo, difficulty) * 100);

  if (selisih > 100) return { status: "tantangan", label: "Tantangan", peluang };
  if (selisih < -100) return { status: "mudah", label: "Penguatan", peluang };
  return { status: "rekomendasi", label: "Cocok untukmu", peluang };
}
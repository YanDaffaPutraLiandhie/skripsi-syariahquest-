// lib/elo.ts  (hanya getEloContext yang berubah: error tidak lagi ditelan)
// Perhitungan Elo utama dilakukan di SERVER (fungsi submit_attempt_modul).
// File ini membaca Elo + konfigurasi level untuk menentukan modul mana yang terbuka,
// dan menyediakan penalti Elo saat gagal (dipakai sebagai pengaman di client).
import { supabase } from "@/lib/supabase";

export type EloLevelConfig = {
  id_level: number;
  nama: string;
  difficulty: number; // rating kesulitan materi
  min_elo: number;    // Elo minimal agar level terbuka
};

export type EloContext = {
  elo: number;
  config: EloLevelConfig[];
};

// Cadangan jika tabel elo_level_config kosong / gagal dibaca
export const DEFAULT_ELO_CONFIG: EloLevelConfig[] = [
  { id_level: 1, nama: "Easy", difficulty: 950, min_elo: 0 },
  { id_level: 2, nama: "Medium", difficulty: 1100, min_elo: 1050 },
  { id_level: 3, nama: "Hard", difficulty: 1250, min_elo: 1150 },
];

export const START_ELO = 1000;

// Faktor K Elo (besar perubahan maksimum per percobaan)
export const ELO_K = 32;

/**
 * Elo mahasiswa + konfigurasi level.
 * - Gagal membaca Elo mahasiswa  -> MELEMPAR error (jangan diam-diam dianggap 1000,
 *   karena mahasiswa ber-Elo tinggi akan melihat modul terkunci).
 * - Konfigurasi level kosong/gagal -> memakai DEFAULT_ELO_CONFIG.
 */
export async function getEloContext(idMahasiswa: number): Promise<EloContext> {
  const [mhsRes, cfgRes] = await Promise.all([
    supabase.from("mahasiswa").select("elo").eq("id_mahasiswa", idMahasiswa).maybeSingle(),
    supabase.from("elo_level_config").select("id_level, nama, difficulty, min_elo").order("id_level"),
  ]);

  if (mhsRes.error) throw mhsRes.error;
  if (cfgRes.error) console.error("Gagal membaca elo_level_config:", cfgRes.error.message);

  const cfg = cfgRes.data;

  return {
    elo: Number(mhsRes.data?.elo ?? START_ELO),
    config: cfg && cfg.length > 0 ? (cfg as EloLevelConfig[]) : DEFAULT_ELO_CONFIG,
  };
}

export type EloAccess = {
  isUnlocked: boolean;
  requiredElo: number;
  reason: string;
};

/** Modul terbuka jika Elo mahasiswa >= Elo minimal level modul tsb. */
export function getEloAccess(
  elo: number,
  idLevel: number,
  config: EloLevelConfig[] = DEFAULT_ELO_CONFIG
): EloAccess {
  const level = config.find((c) => c.id_level === Number(idLevel));
  const requiredElo = level?.min_elo ?? 0;
  const isUnlocked = elo >= requiredElo;

  return {
    isUnlocked,
    requiredElo,
    reason: isUnlocked
      ? `Elo kamu ${elo} sudah cukup untuk level ${level?.nama ?? ""}.`
      : `Butuh Elo ${requiredElo} untuk membuka level ${level?.nama ?? "ini"}. Elo kamu saat ini ${elo}. Selesaikan modul yang lebih mudah untuk menaikkan Elo.`,
  };
}

/**
 * Penalti Elo saat gagal mencapai nilai minimal.
 * Selalu negatif (minimal -1), berapa pun status modulnya
 * (baru pertama dikerjakan, retake, atau sudah pernah lulus).
 * Makin mudah materi (expected tinggi), makin besar penaltinya.
 */
export function calcFailPenalty(elo: number, difficulty: number, k: number = ELO_K): number {
  const expected = 1 / (1 + Math.pow(10, (difficulty - elo) / 400));
  return -Math.max(1, Math.round(k * expected));
}

/**
 * Kenaikan Elo saat LULUS (selalu positif, minimal +1).
 * Dipakai saat mahasiswa akhirnya lulus setelah mengulang kuis.
 * Makin sulit materi dibanding Elo (expected rendah), makin besar kenaikannya.
 */
export function calcPassGain(elo: number, difficulty: number, k: number = ELO_K): number {
  const expected = 1 / (1 + Math.pow(10, (difficulty - elo) / 400));
  return Math.max(1, Math.round(k * (1 - expected)));
}

/** Level tersulit yang sudah terbuka untuk Elo ini (untuk rekomendasi). */
export function highestUnlockedLevel(
  elo: number,
  config: EloLevelConfig[] = DEFAULT_ELO_CONFIG
): EloLevelConfig {
  const unlocked = config.filter((c) => elo >= c.min_elo);
  return unlocked.length > 0
    ? unlocked.reduce((a, b) => (b.id_level > a.id_level ? b : a))
    : config[0];
}

export function getEloRank(elo: number): string {
  if (elo >= 1150) return "Mahir";
  if (elo >= 1050) return "Menengah";
  return "Pemula";
}
// =============================================================
// lib/deadline.ts
// Helper untuk fitur deadline modul & kuis.
// =============================================================

// Batas nilai minimal untuk kuis mandiri (tabel `quis` tidak punya
// kolom parameter_nilai seperti tabel `modul`). Ubah sesuai kebutuhan.
export const KUIS_NILAI_MINIMAL = 70;

/**
 * Deadline disimpan sebagai tipe `date` (YYYY-MM-DD) di database.
 * Dianggap berakhir pada pukul 23:59:59 di tanggal tersebut.
 */
export function parseDeadline(deadline?: string | null): Date | null {
  if (!deadline) return null;
  const d = new Date(`${deadline.slice(0, 10)}T23:59:59`);
  return isNaN(d.getTime()) ? null : d;
}

export function isPastDeadline(
  deadline?: string | null,
  now = new Date(),
): boolean {
  const d = parseDeadline(deadline);
  return d ? now.getTime() > d.getTime() : false;
}

export function formatDeadline(deadline?: string | null): string {
  const d = parseDeadline(deadline);
  return d
    ? d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
}

/** Tanggal hari ini (zona waktu lokal) dalam format YYYY-MM-DD untuk <input type="date" min=...> */
export function todayInputValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/**
 * Aturan nilai:
 * - Sebelum deadline             -> nilai apa adanya
 * - Setelah deadline & lolos     -> nilai dipatok = nilai minimal
 * - Setelah deadline & tak lolos -> nilai apa adanya, tetap tidak lolos
 *                                   (tidak bisa lanjut, harus mengulang kuis)
 */
export function applyDeadlineScore(
  score: number,
  minScore: number,
  deadline?: string | null,
  now = new Date(),
) {
  const isLate = isPastDeadline(deadline, now);
  const passed = score >= minScore;
  const finalScore = isLate && passed ? minScore : score;

  return {
    finalScore,
    passed,
    isLate,
    wasCapped: finalScore !== score,
  };
}
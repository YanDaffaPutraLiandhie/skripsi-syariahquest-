// =============================================================
// lib/deadline.ts
// Helper untuk fitur deadline modul & kuis.
//
// - Kuis (`quis.deadline`) disimpan sebagai `date` (YYYY-MM-DD),
//   dianggap berakhir pukul 23:59:59 di tanggal tersebut.
// - Modul (`modul.deadline`) disimpan sebagai `timestamp`
//   (tanggal + jam), dosen menentukan tanggal DAN jam persisnya.
//
// Semua fungsi di bawah otomatis mendeteksi mana yang berupa
// tanggal saja dan mana yang sudah membawa jam, berdasarkan
// panjang string yang tersimpan.
// =============================================================

// Batas nilai minimal untuk kuis mandiri (tabel `quis` tidak punya
// kolom parameter_nilai seperti tabel `modul`). Ubah sesuai kebutuhan.
export const KUIS_NILAI_MINIMAL = 70;

/** Postgres timestamp kadang dikembalikan dengan spasi ("YYYY-MM-DD HH:mm:ss"). */
function normalizeDeadlineString(deadline: string): string {
  return deadline.includes(" ") && !deadline.includes("T")
    ? deadline.replace(" ", "T")
    : deadline;
}

/** True jika string deadline sudah membawa komponen jam (bukan cuma tanggal). */
function hasExplicitTime(deadline: string): boolean {
  return deadline.trim().length > 10;
}

export function parseDeadline(deadline?: string | null): Date | null {
  if (!deadline) return null;
  const normalized = normalizeDeadlineString(deadline);
  const value = hasExplicitTime(normalized)
    ? normalized
    : `${normalized.slice(0, 10)}T23:59:59`;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function isPastDeadline(
  deadline?: string | null,
  now = new Date(),
): boolean {
  const d = parseDeadline(deadline);
  return d ? now.getTime() > d.getTime() : false;
}

/**
 * Format tampilan deadline.
 * - Deadline modul (tanggal+jam) -> "25 September 2026, 23:59"
 * - Deadline kuis (tanggal saja) -> "25 September 2026"
 */
export function formatDeadline(deadline?: string | null): string {
  if (!deadline) return "";
  const d = parseDeadline(deadline);
  if (!d) return "";

  const datePart = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (!hasExplicitTime(deadline)) return datePart;

  const timePart = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${datePart}, ${timePart}`;
}

/** Tanggal hari ini (YYYY-MM-DD) untuk <input type="date" min=...> milik kuis. */
export function todayInputValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/** Tanggal & jam saat ini (YYYY-MM-DDTHH:mm) untuk <input type="datetime-local" min=...> milik modul. */
export function nowInputValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/**
 * Ubah nilai deadline dari database (mis. "2026-09-25T23:59:00" atau
 * "2026-09-25 23:59:00") menjadi format yang dipahami
 * <input type="datetime-local"> ("2026-09-25T23:59").
 */
export function toDatetimeLocalValue(deadline?: string | null): string {
  if (!deadline) return "";
  return normalizeDeadlineString(deadline).slice(0, 16);
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
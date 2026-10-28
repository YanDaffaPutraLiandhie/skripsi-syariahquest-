// lib/remedial.ts  (menggantikan versi lama)
// Remedial dipilih berdasarkan SUB-TOPIK yang lemah pada attempt gagal terakhir.
// Data lama (remedial yang terikat id_soal) tetap didukung.
//
// CATATAN: fungsi di sini MELEMPAR error jika query gagal (tidak lagi diam-diam
// menganggap mahasiswa "belum mengerjakan"). Pemanggil harus memakai try/catch.
import { supabase } from "@/lib/supabase";
import {
  getSubTopikModul,
  hitungPerSubTopik,
  subTopikLemah,
  type HasilSubTopik,
} from "@/lib/subTopik";

/** Standar lulus modul jika kolom parameter_nilai kosong. */
export const DEFAULT_PASS_SCORE = 80;

export type RemedialItem = {
  id_remedial: number;
  id_soal: number | null;
  id_sub_topik: number | null;
  judul: string;
  tipe: "teks" | "video" | "dokumen";
  konten: string;
  urutan: number;
  selesai: boolean;
};

export type ModulStatus =
  | "belum"     // belum pernah mengerjakan kuis
  | "lulus"     // nilai terbaik >= standar -> modul selesai, modul berikutnya terbuka
  | "remedial"  // gagal, wajib selesaikan remedial, tombol retake terkunci
  | "retake";   // gagal, remedial beres, retake aktif

export type ModulState = {
  status: ModulStatus;
  passScore: number;
  bestScore: number;
  attemptCount: number;
  lastAttemptKe: number;
  remedial: RemedialItem[];
  subTopikLemah: HasilSubTopik[]; // sub-topik yang perlu diperkuat (attempt terakhir)
  canRetake: boolean;             // true jika status "belum" / "lulus" / "retake"
  nextLocked: boolean;            // true jika modul lanjutan harus terkunci
};

export async function getModulState(
  idMahasiswa: number,
  idModul: number,
): Promise<ModulState> {
  const { data: modul, error: modulError } = await supabase
    .from("modul")
    .select("parameter_nilai")
    .eq("id_modul", idModul)
    .maybeSingle();
  if (modulError) throw modulError;
  const passScore = Number(modul?.parameter_nilai ?? DEFAULT_PASS_SCORE);

  const { data: attempts, error: attemptError } = await supabase
    .from("attempt_kuis_modul")
    .select("attempt_ke, nilai")
    .eq("id_mahasiswa", idMahasiswa)
    .eq("id_modul", idModul)
    .order("attempt_ke", { ascending: true });
  if (attemptError) throw attemptError;

  const list = attempts ?? [];
  const base = {
    passScore,
    attemptCount: list.length,
    lastAttemptKe: list.length ? list[list.length - 1].attempt_ke : 0,
    remedial: [] as RemedialItem[],
    subTopikLemah: [] as HasilSubTopik[],
  };

  if (list.length === 0) {
    return { ...base, status: "belum", bestScore: 0, canRetake: true, nextLocked: true };
  }

  // Aturan NILAI TERTINGGI
  const bestScore = Math.max(...list.map((a) => Number(a.nilai)));
  if (bestScore >= passScore) {
    return { ...base, status: "lulus", bestScore, canRetake: true, nextLocked: false };
  }

  // ---- Gagal: tentukan materi remedial dari sub-topik yang lemah ----
  const { data: riwayat, error: riwayatError } = await supabase
    .from("riwayat_jawaban_kuis")
    .select("id_soal, is_benar")
    .eq("id_mahasiswa", idMahasiswa)
    .eq("id_modul", idModul);
  if (riwayatError) throw riwayatError;

  const jawabanTerakhir = riwayat ?? [];
  const idSoalList = jawabanTerakhir.map((r) => r.id_soal as number);

  const soalKeSubTopik = new Map<number, number | null>();
  if (idSoalList.length > 0) {
    const { data: soalRows, error: soalError } = await supabase
      .from("soal")
      .select("id_soal, id_sub_topik")
      .in("id_soal", idSoalList);
    if (soalError) throw soalError;
    for (const s of soalRows ?? []) {
      soalKeSubTopik.set(s.id_soal as number, (s.id_sub_topik as number | null) ?? null);
    }
  }

  const daftarSubTopik = await getSubTopikModul(idModul);
  const hasilSubTopik = hitungPerSubTopik(
    jawabanTerakhir.map((r) => ({
      id_sub_topik: soalKeSubTopik.get(r.id_soal as number) ?? null,
      is_benar: Boolean(r.is_benar),
    })),
    daftarSubTopik,
  );
  const lemah = subTopikLemah(hasilSubTopik, passScore);
  const lemahIds = new Set(lemah.map((l) => l.id_sub_topik));
  const soalSalah = new Set(
    jawabanTerakhir.filter((r) => !r.is_benar).map((r) => r.id_soal as number),
  );

  const { data: semua, error: remedialError } = await supabase
    .from("modul_remedial")
    .select("id_remedial, id_soal, id_sub_topik, judul, tipe, konten, urutan")
    .eq("id_modul", idModul)
    .order("urutan", { ascending: true });
  if (remedialError) throw remedialError;

  const all = semua ?? [];
  let relevan = all.filter((r) => {
    const umum = r.id_sub_topik === null && r.id_soal === null;
    const cocokSubTopik = r.id_sub_topik !== null && lemahIds.has(r.id_sub_topik);
    const cocokSoal = r.id_soal !== null && soalSalah.has(r.id_soal); // data lama
    return umum || cocokSubTopik || cocokSoal;
  });
  if (relevan.length === 0) relevan = all; // fallback: tampilkan semua remedial modul

  const { data: done, error: doneError } = await supabase
    .from("remedial_selesai")
    .select("id_remedial")
    .eq("id_mahasiswa", idMahasiswa)
    .eq("id_modul", idModul)
    .eq("after_attempt_ke", base.lastAttemptKe);
  if (doneError) throw doneError;
  const doneSet = new Set((done ?? []).map((d) => d.id_remedial as number));

  const remedial: RemedialItem[] = relevan.map((r) => ({
    ...(r as Omit<RemedialItem, "selesai">),
    selesai: doneSet.has(r.id_remedial),
  }));

  // Jika dosen belum menyiapkan remedial, [].every(...) = true -> retake tidak buntu
  const canRetake = remedial.every((r) => r.selesai);

  return {
    ...base,
    remedial,
    subTopikLemah: lemah,
    status: canRetake ? "retake" : "remedial",
    bestScore,
    canRetake,
    nextLocked: true,
  };
}

/** Panggil sekali saat kuis modul selesai dinilai. */
export async function submitAttemptModul(
  idMahasiswa: number,
  idModul: number,
  nilai: number,
) {
  const { data, error } = await supabase.rpc("submit_attempt_modul", {
    p_id_mahasiswa: idMahasiswa,
    p_id_modul: idModul,
    p_nilai: nilai,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("submit_attempt_modul tidak mengembalikan data.");

  return {
    attemptKe: row.o_attempt_ke as number,
    lulus: row.o_lulus as boolean,
    nilaiTerbaik: Number(row.o_nilai_terbaik),
    xpDidapat: Number(row.o_xp ?? 0),
    eloSesudah: Number(row.o_elo ?? 1000),
    eloDelta: Number(row.o_elo_delta ?? 0),
  };
}

/** Tandai satu materi remedial selesai untuk attempt gagal terakhir. */
export async function markRemedialDone(
  idMahasiswa: number,
  idModul: number,
  idRemedial: number,
  afterAttemptKe: number,
) {
  const { error } = await supabase.from("remedial_selesai").upsert(
    {
      id_mahasiswa: idMahasiswa,
      id_modul: idModul,
      id_remedial: idRemedial,
      after_attempt_ke: afterAttemptKe,
    },
    { onConflict: "id_mahasiswa,id_remedial,after_attempt_ke" },
  );
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Versi ringan untuk DAFTAR modul: 1 query untuk semua modul (bukan 1 per kartu)
// ---------------------------------------------------------------------
export type ModulBadgeInfo = {
  status: "belum" | "lulus" | "gagal";
  best: number;
  attempts: number;
};

export async function getStatusBatch(
  idMahasiswa: number,
  modulList: { id_modul: number; parameter_nilai: number | null }[],
): Promise<Record<number, ModulBadgeInfo>> {
  const { data, error } = await supabase
    .from("attempt_kuis_modul")
    .select("id_modul, nilai")
    .eq("id_mahasiswa", idMahasiswa);
  if (error) throw error;

  const byModul = new Map<number, number[]>();
  for (const r of data ?? []) {
    const arr = byModul.get(r.id_modul) ?? [];
    arr.push(Number(r.nilai));
    byModul.set(r.id_modul, arr);
  }

  const out: Record<number, ModulBadgeInfo> = {};
  for (const m of modulList) {
    const scores = byModul.get(m.id_modul) ?? [];
    const best = scores.length ? Math.max(...scores) : 0;
    const pass = Number(m.parameter_nilai ?? DEFAULT_PASS_SCORE);
    out[m.id_modul] = {
      attempts: scores.length,
      best,
      status: scores.length === 0 ? "belum" : best >= pass ? "lulus" : "gagal",
    };
  }
  return out;
}
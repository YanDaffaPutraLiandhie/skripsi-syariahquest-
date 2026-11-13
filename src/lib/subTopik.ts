// lib/subTopik.ts  (BARU)
import { supabase } from "@/lib/supabase";

export type SubTopik = {
  id_sub_topik: number;
  judul: string;
  urutan: number;
  lo_code?: string | null;
  remedial_text?: string | null;
};

export type HasilSubTopik = {
  id_sub_topik: number;
  judul: string;
  benar: number;
  total: number;
  masteryProbability?: number;
  remedialText?: string | null;
};

export async function getSubTopikModul(idModul: number): Promise<SubTopik[]> {
  const { data, error } = await supabase
    .from("sub_topik")
    .select("id_sub_topik, judul, urutan, lo_code, remedial_text")
    .eq("id_modul", idModul)
    .order("urutan", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SubTopik[];
}

/** Hitung benar/total per sub-topik. Soal tanpa sub-topik diabaikan. */
export function hitungPerSubTopik(
  rows: { id_sub_topik: number | null | undefined; is_benar: boolean }[],
  daftar: SubTopik[],
): HasilSubTopik[] {
  const judulMap = new Map(daftar.map((s) => [s.id_sub_topik, s.judul]));
  const urutanMap = new Map(daftar.map((s) => [s.id_sub_topik, s.urutan]));
  const acc = new Map<number, HasilSubTopik>();

  for (const r of rows) {
    if (r.id_sub_topik === null || r.id_sub_topik === undefined) continue;

    const cur: HasilSubTopik = acc.get(r.id_sub_topik) ?? {
      id_sub_topik: r.id_sub_topik,
      judul: judulMap.get(r.id_sub_topik) ?? `Sub-topik ${r.id_sub_topik}`,
      benar: 0,
      total: 0,
      remedialText:
        daftar.find((subTopik) => subTopik.id_sub_topik === r.id_sub_topik)
          ?.remedial_text ?? null,
    };

    cur.total += 1;
    if (r.is_benar) cur.benar += 1;
    acc.set(r.id_sub_topik, cur);
  }

  return Array.from(acc.values()).sort(
    (a, b) =>
      (urutanMap.get(a.id_sub_topik) ?? 0) - (urutanMap.get(b.id_sub_topik) ?? 0),
  );
}

/**
 * Sub-topik yang perlu diperkuat: ada yang salah DAN rasio benar di bawah
 * standar lulus modul. Diurutkan dari yang paling lemah.
 */
export function subTopikLemah(
  hasil: HasilSubTopik[],
  passScore: number,
): HasilSubTopik[] {
  const batas = passScore / 100;
  return hasil
    .filter((h) => {
      if (h.masteryProbability !== undefined) {
        return h.masteryProbability < 0.8;
      }
      return h.total > 0 && h.benar < h.total && h.benar / h.total < batas;
    })
    .sort((a, b) => {
      const aMastery = a.masteryProbability ?? a.benar / Math.max(1, a.total);
      const bMastery = b.masteryProbability ?? b.benar / Math.max(1, b.total);
      return aMastery - bMastery;
    });
}
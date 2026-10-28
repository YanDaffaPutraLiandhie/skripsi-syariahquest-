"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { panggilGemini } from "@/lib/gemini";

type AIOutput = { sub_topik: { judul: string; id_soal: number[] }[] };

export async function generateSubTopikModul(idModul: number) {
  console.log("[generateSubTopik] mulai, idModul:", idModul);
  console.log("[generateSubTopik] API key terbaca:", !!process.env.GEMINI_API_KEY);

  // 1. Ambil soal modul yang belum punya sub-topik
  const { data: soalRows, error: soalErr } = await supabaseAdmin
    .from("soal")
    .select("id_soal, soal")
    .eq("id_modul", idModul)
    .is("id_sub_topik", null);
  if (soalErr) throw soalErr;

  console.log("[generateSubTopik] soal tanpa sub-topik:", soalRows?.length ?? 0);
  if (!soalRows || soalRows.length === 0) return { dibuat: 0 };

  const idSoalList = soalRows.map((s) => s.id_soal as number);

  // 2. Kunci jawaban + materi modul
  const [{ data: kunci }, { data: modul }] = await Promise.all([
    supabaseAdmin
      .from("jawaban")
      .select("id_soal, jawaban")
      .in("id_soal", idSoalList)
      .eq("jawaban_benar", true),
    supabaseAdmin
      .from("modul")
      .select("nama_modul, teks_materi")
      .eq("id_modul", idModul)
      .single(),
  ]);
  const kunciMap = new Map(
    (kunci ?? []).map((k) => [k.id_soal as number, k.jawaban as string]),
  );

  // 3. Prompt
  const daftarSoal = soalRows
    .map(
      (s) =>
        `[${s.id_soal}] ${s.soal}\n   Kunci: ${kunciMap.get(s.id_soal as number) ?? "-"}`,
    )
    .join("\n");

  const prompt = `Kamu membantu menyusun sub-topik pembelajaran.

Modul: ${modul?.nama_modul ?? "-"}
Materi (ringkas): ${(modul?.teks_materi ?? "").substring(0, 3000)}

Daftar soal:
${daftarSoal}

Tugas: kelompokkan SEMUA soal ke 2-5 sub-topik yang bermakna secara konsep,
berdasarkan materi di atas. Setiap soal masuk tepat satu sub-topik.
Judul sub-topik singkat (maks 6 kata).

Balas HANYA JSON tanpa teks lain:
{"sub_topik":[{"judul":"...","id_soal":[1,2]}]}`;

  // 4. Panggil Gemini (dengan retry otomatis)
  const text = await panggilGemini(prompt, { temperature: 0.2 });
  console.log("[generateSubTopik] respons AI:", text);

  // Ambil blok JSON saja (tahan terhadap teks/pagar kode di sekitarnya)
  const awal = text.indexOf("{");
  const akhir = text.lastIndexOf("}");
  if (awal === -1 || akhir === -1) throw new Error("Respons AI bukan JSON");
  const parsed: AIOutput = JSON.parse(text.slice(awal, akhir + 1));

  // 5. Validasi: hanya id_soal yang valid, tiap soal maksimal satu sub-topik
  const valid = new Set(idSoalList);
  const dipakai = new Set<number>();
  let dibuat = 0;

  for (const st of parsed.sub_topik ?? []) {
    const ids = (st.id_soal ?? []).filter(
      (id) => valid.has(id) && !dipakai.has(id),
    );
    if (!st.judul || ids.length === 0) continue;

    const { data: baru, error: insErr } = await supabaseAdmin
      .from("sub_topik")
      .insert({ id_modul: idModul, judul: st.judul })
      .select("id_sub_topik")
      .single();
    if (insErr) throw insErr;

    const { error: updErr } = await supabaseAdmin
      .from("soal")
      .update({ id_sub_topik: baru.id_sub_topik })
      .in("id_soal", ids);
    if (updErr) throw updErr;

    ids.forEach((id) => dipakai.add(id));
    dibuat++;
  }

  console.log("[generateSubTopik] sub-topik dibuat:", dibuat);
  return { dibuat };
}
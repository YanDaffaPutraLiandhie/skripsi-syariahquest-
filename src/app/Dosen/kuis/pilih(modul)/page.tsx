"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
// import MiniProfile from "@/components/layout/MiniProfile";
import { supabase } from "@/lib/supabase";

type ModulRow = {
  id: number;
  no: number;
  name: string;
  badge: string;
  badgeColor: string;
};

export default function PilihModul() {
  const router = useRouter();
  const [modules, setModules] = useState<ModulRow[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [namaKuis, setNamaKuis] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadModules() {
const { data, error } = await supabase.from("modul").select(`
        id_modul,
        nama_modul,
        id_level,
        status
      `).eq("status", true);
      if (error) {
        console.error("Supabase error:", error);
        return;
      }

      const rows = (data ?? []).map((item: any, index: number) => {
        const idLevel = item.id_level;
        const badge = idLevel === 1 ? "E" : idLevel === 2 ? "M" : "H";
        const badgeColor =
          idLevel === 1
            ? "bg-green-500"
            : idLevel === 2
              ? "bg-yellow-500"
              : "bg-red-500";

        return {
          id: item.id_modul ?? index + 1,
          no: index + 1,
          name: item.nama_modul ?? `Modul ${String.fromCharCode(65 + index)}`,
          badge,
          badgeColor,
        };
      });

setModules(rows);
    }

    loadModules();
  }, []);

  // Fungsi memilih / membatalkan pilihan
  const toggleSelected = (id: number) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  // Acak array (Fisher–Yates)
  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const handleFinish = async () => {
    setSuccessMessage("");
    setErrorMessage("");

    if (selected.length === 0) {
      setErrorMessage("Silakan pilih minimal satu modul.");
      return;
    }

    if (!namaKuis.trim()) {
      setErrorMessage("Silakan isi nama kuis.");
      return;
    }

    setSaving(true);

try {
      // Ambil modul yang dipilih dan nama kuis
      const selectedModules = modules.filter((m) => selected.includes(m.id));
      const kuisName = namaKuis.trim();

      let totalSoal = 0;

      // Kumpulkan semua soal dari setiap modul terpilih
      const semuaSoal: any[] = [];

      for (const modul of selectedModules) {
        const { data: soalList, error: soalError } = await supabase
          .from("soal")
          .select("id_soal, id_modul, soal")
          .eq("id_modul", modul.id);

        if (soalError) {
          console.error("Error ambil soal:", soalError);
          throw new Error(soalError.message);
        }

        // Acak dan batasi maksimal 10 soal per modul, lalu gabungkan
        const dipilih = shuffle(soalList ?? []).slice(0, 10);
        semuaSoal.push(...dipilih);
      }

      if (semuaSoal.length === 0) {
        throw new Error("Tidak ada soal pada modul yang dipilih.");
      }

      // Ambil semua id_soal dari kumpulan soal
      const idSoalList = semuaSoal.map((s) => s.id_soal);

      // Query tabel jawaban secara terpisah,
      // ambil semua jawaban yang id_soal-nya ada di daftar soal
      const { data: jawabanList, error: jawabanError } = await supabase
        .from("jawaban")
        .select("id_jawaban, id_soal, jawaban, jawaban_benar")
        .in("id_soal", idSoalList);

      if (jawabanError) {
        console.error("Error ambil jawaban:", jawabanError);
        throw new Error(jawabanError.message);
      }

      // Kelompokkan jawaban berdasarkan id_soal
      const jawabanBySoal: Record<number, any[]> = {};
      for (const j of jawabanList ?? []) {
        if (!jawabanBySoal[j.id_soal]) jawabanBySoal[j.id_soal] = [];
        jawabanBySoal[j.id_soal].push(j);
      }

      // =====================
      // BUAT SATU BARIS PADA TABEL QUIS (1 kuis = 1 id_quis)
      // =====================

      const { data: quisBaru, error: quisError } = await supabase
        .from("quis")
        .insert({ nama_kuis: kuisName })
        .select()
        .single();

      if (quisError) {
        console.error("Error insert quis:", quisError);
        throw new Error(quisError.message);
      }

      const idQuis = quisBaru.id_quis;

      // Simpan relasi ke tabel detail_kuis
      for (const soal of semuaSoal) {
        const jawaban = jawabanBySoal[soal.id_soal] ?? [];

        if (jawaban.length === 0) {
          // Soal tanpa jawaban, tetap simpan id_soal ke detail_kuis
          const { error: detailError } = await supabase
            .from("detail_kuis")
            .insert({
              id_quis: idQuis,
              id_soal: soal.id_soal,
            });

          if (detailError) {
            console.error("Error insert detail_kuis:", detailError);
            throw new Error(detailError.message);
          }
          totalSoal += 1;
          continue;
        }

        // Simpan id_soal beserta setiap id_jawaban yang memiliki id_soal sama
        for (const j of jawaban) {
          const { error: detailError } = await supabase
            .from("detail_kuis")
            .insert({
              id_quis: idQuis,
              id_soal: soal.id_soal,
              id_jawaban: j.id_jawaban,
            });

          if (detailError) {
            console.error("Error insert detail_kuis:", detailError);
            throw new Error(detailError.message);
          }
        }
        totalSoal += 1;
      }

      setSuccessMessage(
        `Kuis "${kuisName}" berhasil dibuat dengan id ${idQuis} (${totalSoal} soal).`,
      );
      setSelected([]);
      setNamaKuis("");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Terjadi kesalahan saat membuat kuis.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelected([]);
    setErrorMessage("");
    setSuccessMessage("");
  };

  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <Sidebar activeLabel="Modul Pembelajaran" />

      {/* Main */}
      <main className="flex-1 p-8">
{/* Topbar */}

        {/* Panel */}
        <div className="rounded-[24px] bg-[#4a3f7a] px-10 pb-8 pt-10 text-white">
<h1 className="mb-8 text-center text-3xl font-extrabold">
            Pilih Modul
          </h1>

          {/* Nama Kuis */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-white">
              Nama Kuis
            </label>
            <input
              type="text"
              value={namaKuis}
              onChange={(e) => setNamaKuis(e.target.value)}
              placeholder="Tulis nama kuis"
              className="h-11 w-full rounded-full bg-white px-4 text-sm text-[#2b2540] outline-none placeholder:text-[#c9c6d6]"
            />
          </div>

{/* Header */}
          <div className="mb-3 grid grid-cols-[50px_40px_1fr_70px] items-center gap-4 px-1 text-sm font-semibold">
            <span>No</span>
            <span>Level</span>
            <span>Nama Modul</span>
            <span className="text-center">Pilih</span>
          </div>

{/* List Modul */}
          <div className="flex flex-col gap-3">
            {modules.length === 0 ? (
              <div className="rounded-xl bg-white/10 p-4 text-center text-sm text-gray-300">
                Tidak ada modul aktif yang tersedia.
              </div>
            ) : (
              modules.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[50px_40px_1fr_70px] items-center gap-4"
              >
                {/* Nomor */}
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-semibold text-[#4a3f7a]">
                  {row.no}
                </div>

                {/* Badge Level */}
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${row.badgeColor}`}
                >
                  {row.badge}
                </div>

                {/* Nama Modul */}
                <input
                  type="text"
                  value={row.name}
                  readOnly
                  className="h-9 w-full rounded-full bg-white px-4 text-sm text-[#2b2540] outline-none"
                />

                {/* Checkbox Bulat */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={selected.includes(row.id)}
                    onClick={() => toggleSelected(row.id)}
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white transition-all duration-200 ${
                      selected.includes(row.id)
                        ? "bg-white"
                        : "bg-transparent hover:bg-white/20"
                    }`}
                  >
                    {selected.includes(row.id) && (
                      <div className="h-3 w-3 rounded-full bg-[#4a3f7a]" />
                    )}
                  </button>
</div>
              </div>
            ))
          )}
          </div>

          {/* Modul yang dipilih */}
          <div className="mt-6 rounded-xl bg-white/10 p-4">
            <p className="text-sm font-semibold">Modul dipilih:</p>

            {selected.length === 0 ? (
              <p className="mt-1 text-sm text-gray-300">
                Belum ada modul yang dipilih.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {modules
                  .filter((item) => selected.includes(item.id))
                  .map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#4a3f7a]"
                    >
                      {item.name}
                    </span>
                  ))}
              </div>
            )}
          </div>

{/* Pesan */}
          {errorMessage && (
            <p className="mt-6 rounded-xl bg-red-500/20 px-4 py-3 text-sm font-semibold text-red-100">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="mt-6 rounded-xl bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-100">
              {successMessage}
            </p>
          )}

          {/* Button */}
          <div className="mt-8 flex justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="rounded-full bg-[#c9c3e6] px-6 py-2 text-sm font-semibold text-[#3d3466] transition hover:bg-[#d8d3ef] disabled:opacity-50"
            >
              Batal
            </button>

            <button
              onClick={handleFinish}
              disabled={saving}
              className="rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Menyimpan..." : "Selesai"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
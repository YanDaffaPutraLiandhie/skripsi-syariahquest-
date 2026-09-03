"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";
import DosenContainer from "@/components/layout/DosenContainer";
import { Check, ArrowLeft } from "lucide-react";

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
            ? "bg-emerald-500 text-white"
            : idLevel === 2
              ? "bg-amber-500 text-white"
              : "bg-rose-500 text-white";

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

  const toggleSelected = (id: number) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

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
      const selectedModules = modules.filter((m) => selected.includes(m.id));
      const kuisName = namaKuis.trim();

      let totalSoal = 0;
      const semuaSoal: any[] = [];

      for (const modul of selectedModules) {
        const { data: soalList, error: soalError } = await supabase
          .from("soal")
          .select("id_soal, id_modul, soal")
          .eq("id_modul", modul.id);

        if (soalError) throw new Error(soalError.message);

        const dipilih = shuffle(soalList ?? []).slice(0, 10);
        semuaSoal.push(...dipilih);
      }

      if (semuaSoal.length === 0) {
        throw new Error("Tidak ada soal pada modul yang dipilih.");
      }

      const idSoalList = semuaSoal.map((s) => s.id_soal);

      const { data: jawabanList, error: jawabanError } = await supabase
        .from("jawaban")
        .select("id_jawaban, id_soal, jawaban, jawaban_benar")
        .in("id_soal", idSoalList);

      if (jawabanError) throw new Error(jawabanError.message);

      const jawabanBySoal: Record<number, any[]> = {};
      for (const j of jawabanList ?? []) {
        if (!jawabanBySoal[j.id_soal]) jawabanBySoal[j.id_soal] = [];
        jawabanBySoal[j.id_soal].push(j);
      }

      const { data: quisBaru, error: quisError } = await supabase
        .from("quis")
        .insert({ nama_kuis: kuisName })
        .select()
        .single();

      if (quisError) throw new Error(quisError.message);

      const idQuis = quisBaru.id_quis;

      for (const soal of semuaSoal) {
        const jawaban = jawabanBySoal[soal.id_soal] ?? [];

        if (jawaban.length === 0) {
          const { error: detailError } = await supabase
            .from("detail_kuis")
            .insert({
              id_quis: idQuis,
              id_soal: soal.id_soal,
            });

          if (detailError) throw new Error(detailError.message);
          totalSoal += 1;
          continue;
        }

        for (const j of jawaban) {
          const { error: detailError } = await supabase
            .from("detail_kuis")
            .insert({
              id_quis: idQuis,
              id_soal: soal.id_soal,
              id_jawaban: j.id_jawaban,
            });

          if (detailError) throw new Error(detailError.message);
        }
        totalSoal += 1;
      }

      await logActivity({
        fitur: "Kuis",
        jenis_aktivitas: "Tambah Kuis",
        keterangan: `Berhasil membuat kuis "${kuisName}" dengan ${totalSoal} soal`,
      });

      setSuccessMessage(
        `Kuis "${kuisName}" berhasil dibuat dengan id #${idQuis} (${totalSoal} soal).`,
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
    <DosenContainer
      categoryTag="GENERATE KUIS OTOMATIS"
      title="Pilih Modul Pembelajaran"
      subtitle="Sistem akan mengambil bank soal secara acak berdasarkan modul aktif yang Anda centang."
      headerAction={
        <button
          type="button"
          onClick={() => router.push("/Dosen/kuis")}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold text-white backdrop-blur-sm hover:bg-white/20 transition"
        >
          <ArrowLeft size={16} />
          Kembali ke Kuis
        </button>
      }
    >
      <div className="space-y-6">
        <div className="rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-black/5">
          <label className="mb-2 block text-sm font-bold text-[#3d3466]">
            Nama Kuis Baru
          </label>
          <input
            type="text"
            value={namaKuis}
            onChange={(e) => setNamaKuis(e.target.value)}
            placeholder="Contoh: Kuis Evaluasi Pekan 1..."
            className="h-12 w-full rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] px-4 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white"
          />
        </div>

        <div className="rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-black/5">
          <div className="mb-4 flex items-center justify-between border-b border-[#f0edf9] pb-4">
            <h2 className="text-lg font-bold text-[#3d3466]">Daftar Modul Aktif</h2>
            <span className="rounded-full bg-[#f8f7fd] px-3.5 py-1 text-xs font-bold text-[#4a3f7a]">
              {selected.length} Modul Terpilih
            </span>
          </div>

          <div className="space-y-3">
            {modules.length === 0 ? (
              <div className="py-8 text-center text-sm font-semibold text-[#8b84a5]">
                Tidak ada modul aktif yang tersedia.
              </div>
            ) : (
              modules.map((row) => {
                const isChecked = selected.includes(row.id);
                return (
                  <div
                    key={row.id}
                    onClick={() => toggleSelected(row.id)}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl p-4 transition ${
                      isChecked
                        ? "bg-[#f8f7fd] ring-2 ring-[#4a3f7a]"
                        : "bg-white ring-1 ring-[#4a3f7a]/10 hover:bg-[#f8f7fd]/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#4a3f7a] text-xs font-black text-white">
                        #{row.no}
                      </span>
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black shadow-xs ${row.badgeColor}`}
                      >
                        {row.badge}
                      </span>
                      <p className="text-sm font-bold text-[#2b2540]">{row.name}</p>
                    </div>

                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                        isChecked
                          ? "border-[#4a3f7a] bg-[#4a3f7a] text-white"
                          : "border-[#8b84a5]"
                      }`}
                    >
                      {isChecked && <Check size={14} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {errorMessage && (
            <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
              {successMessage}
            </p>
          )}

          <div className="mt-8 flex justify-end gap-3 border-t border-[#f0edf9] pt-6">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="rounded-full border border-[#e4e2ee] bg-white px-6 py-2.5 text-xs font-bold text-[#4a3f7a] hover:bg-[#f8f7fd] transition"
            >
              Batal
            </button>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="rounded-full bg-emerald-400 px-8 py-2.5 text-xs font-bold text-emerald-950 shadow-md shadow-emerald-900/20 hover:bg-emerald-300 transition disabled:opacity-70"
            >
              {saving ? "Membuat Kuis..." : "Generate Kuis"}
            </button>
          </div>
        </div>
      </div>
    </DosenContainer>
  );
}
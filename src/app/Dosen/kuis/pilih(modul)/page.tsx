"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";
import { todayInputValue } from "@/lib/deadline";
import DosenContainer from "@/components/layout/DosenContainer";
import { Check, ArrowLeft, ChevronLeft, ChevronRight, Search, Minus, Plus } from "lucide-react";

type ModulRow = {
  id: number;
  no: number;
  name: string;
  badge: string;
  badgeColor: string;
  // BARU: total soal yang tersedia di bank soal modul ini, dan jumlah
  // default (dari pengaturan modul) yang disarankan saat generate kuis.
  totalSoal: number;
  defaultJumlahSoal: number;
};

const FALLBACK_JUMLAH_SOAL = 10;

export default function PilihModul() {
  const MODULES_PER_PAGE = 10;
  const router = useRouter();
  const [modules, setModules] = useState<ModulRow[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  // BARU: jumlah soal yang mau diambil per modul, key = id_modul.
  // Nilai default diisi otomatis saat modul dicentang.
  const [jumlahSoalPerModul, setJumlahSoalPerModul] = useState<
    Record<number, number>
  >({});

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [namaKuis, setNamaKuis] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadModules() {
      const { data, error } = await supabase.from("modul").select(`
        id_modul,
        nama_modul,
        id_level,
        status,
        jumlah_soal_kuis
      `).eq("status", true);
      if (error) {
        console.error("Supabase error:", error);
        return;
      }

      // Hitung total soal yang tersedia per modul (dipakai untuk
      // membatasi & menampilkan sisa kuota soal saat generate kuis).
      const { data: soalCountData, error: soalCountError } = await supabase
        .from("soal")
        .select("id_soal, id_modul");

      if (soalCountError) {
        console.error("Gagal menghitung jumlah soal per modul:", soalCountError);
      }

      const totalSoalByModul: Record<number, number> = {};
      (soalCountData ?? []).forEach((row: { id_modul: number }) => {
        totalSoalByModul[row.id_modul] = (totalSoalByModul[row.id_modul] ?? 0) + 1;
      });

      const rows = (data ?? []).map((item: any, index: number) => {
        const idLevel = item.id_level;
        const badge = idLevel === 1 ? "E" : idLevel === 2 ? "M" : "H";
        const badgeColor =
          idLevel === 1
            ? "bg-emerald-500 text-white"
            : idLevel === 2
              ? "bg-amber-500 text-white"
              : "bg-rose-500 text-white";

        const idModul = item.id_modul ?? index + 1;
        const totalSoal = totalSoalByModul[idModul] ?? 0;
        const defaultJumlahSoal = item.jumlah_soal_kuis ?? FALLBACK_JUMLAH_SOAL;

        return {
          id: idModul,
          no: index + 1,
          name: item.nama_modul ?? `Modul ${String.fromCharCode(65 + index)}`,
          badge,
          badgeColor,
          totalSoal,
          defaultJumlahSoal,
        };
      });

      setModules(rows);
    }

    loadModules();
  }, []);

  function clampJumlah(value: number, totalSoal: number) {
    const max = totalSoal > 0 ? totalSoal : FALLBACK_JUMLAH_SOAL;
    if (Number.isNaN(value)) return 1;
    return Math.min(max, Math.max(1, Math.round(value)));
  }

  const toggleSelected = (row: ModulRow) => {
    setSelected((prev) => {
      const isSelected = prev.includes(row.id);

      if (isSelected) {
        return prev.filter((item) => item !== row.id);
      }

      // Saat modul baru dicentang, isi jumlah soal dengan nilai default
      // dari pengaturan modul (dibatasi maksimal soal yang tersedia).
      setJumlahSoalPerModul((current) => ({
        ...current,
        [row.id]: clampJumlah(row.defaultJumlahSoal, row.totalSoal),
      }));

      return [...prev, row.id];
    });
  };

  function updateJumlahSoal(row: ModulRow, value: number) {
    setJumlahSoalPerModul((prev) => ({
      ...prev,
      [row.id]: clampJumlah(value, row.totalSoal),
    }));
  }

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

    if (deadline && deadline < todayInputValue()) {
      setErrorMessage("Deadline tidak boleh sebelum hari ini.");
      return;
    }

    setSaving(true);

    try {
      const selectedModules = modules.filter((m) => selected.includes(m.id));
      const kuisName = namaKuis.trim();

      let totalSoal = 0;
      const semuaSoal: any[] = [];
      // Dipakai untuk catatan aktivitas: "Modul A: 10 soal, Modul B: 20 soal"
      const ringkasanPerModul: string[] = [];

      for (const modul of selectedModules) {
        const { data: soalList, error: soalError } = await supabase
          .from("soal")
          .select("id_soal, id_modul, soal")
          .eq("id_modul", modul.id);

        if (soalError) throw new Error(soalError.message);

        const jumlahDiminta = clampJumlah(
          jumlahSoalPerModul[modul.id] ?? modul.defaultJumlahSoal,
          modul.totalSoal,
        );

        const dipilih = shuffle(soalList ?? []).slice(0, jumlahDiminta);
        semuaSoal.push(...dipilih);
        ringkasanPerModul.push(`${modul.name}: ${dipilih.length} soal`);
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
        .insert({ nama_kuis: kuisName, deadline: deadline || null })
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
        keterangan: `Berhasil membuat kuis "${kuisName}" dengan ${totalSoal} soal (${ringkasanPerModul.join(", ")})${
          deadline ? ` (deadline ${deadline})` : ""
        }`,
      });

      setSuccessMessage(
        `Kuis "${kuisName}" berhasil dibuat dengan id #${idQuis} (${totalSoal} soal).`,
      );
      setSelected([]);
      setJumlahSoalPerModul({});
      setNamaKuis("");
      setDeadline("");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Terjadi kesalahan saat membuat kuis.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelected([]);
    setJumlahSoalPerModul({});
    setDeadline("");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const filteredModules = modules.filter((module) =>
    module.name.toLowerCase().includes(searchTerm.trim().toLowerCase()),
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredModules.length / MODULES_PER_PAGE),
  );
  const paginatedModules = filteredModules.slice(
    (currentPage - 1) * MODULES_PER_PAGE,
    currentPage * MODULES_PER_PAGE,
  );

  const totalSoalTerpilih = selected.reduce((sum, id) => {
    const modul = modules.find((m) => m.id === id);
    if (!modul) return sum;
    return sum + clampJumlah(jumlahSoalPerModul[id] ?? modul.defaultJumlahSoal, modul.totalSoal);
  }, 0);

  return (
    <DosenContainer
      categoryTag="GENERATE KUIS OTOMATIS"
      title="Pilih Modul Pembelajaran"
      subtitle="Sistem akan mengambil bank soal secara acak berdasarkan modul aktif yang Anda centang. Jumlah soal per modul bisa Anda atur sendiri."
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
        <div className="grid grid-cols-1 gap-5 rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-black/5 md:grid-cols-2">
          <div>
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

          <div>
            <label className="mb-2 block text-sm font-bold text-[#3d3466]">
              Deadline (opsional)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={deadline}
                min={todayInputValue()}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-12 w-full flex-1 rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] px-4 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white"
              />
              {deadline && (
                <button
                  type="button"
                  onClick={() => setDeadline("")}
                  className="h-12 shrink-0 rounded-2xl border border-[#e4e2ee] bg-white px-4 text-xs font-bold text-[#4a3f7a] transition hover:bg-[#f8f7fd]"
                >
                  Hapus
                </button>
              )}
            </div>
            <p className="mt-2 text-xs font-medium text-[#8b84a5]">
              Setelah deadline, nilai kuis yang lolos akan dipatok ke nilai
              minimal.
            </p>
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-black/5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#f0edf9] pb-4">
            <h2 className="text-lg font-bold text-[#3d3466]">Daftar Modul Aktif</h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#f8f7fd] px-3.5 py-1 text-xs font-bold text-[#4a3f7a]">
                {selected.length} Modul Terpilih
              </span>
              {selected.length > 0 && (
                <span className="rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                  Total {totalSoalTerpilih} Soal
                </span>
              )}
            </div>
          </div>

          <div className="relative mb-5">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8b84a5]"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama modul..."
              aria-label="Cari modul"
              className="h-12 w-full rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] pl-11 pr-4 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white"
            />
          </div>

          <div className="space-y-3">
            {modules.length === 0 ? (
              <div className="py-8 text-center text-sm font-semibold text-[#8b84a5]">
                Tidak ada modul aktif yang tersedia.
              </div>
            ) : filteredModules.length === 0 ? (
              <div className="py-8 text-center text-sm font-semibold text-[#8b84a5]">
                Modul yang dicari tidak ditemukan.
              </div>
            ) : (
              paginatedModules.map((row) => {
                const isChecked = selected.includes(row.id);
                const jumlahSoal = clampJumlah(
                  jumlahSoalPerModul[row.id] ?? row.defaultJumlahSoal,
                  row.totalSoal,
                );
                const tidakAdaSoal = row.totalSoal === 0;

                return (
                  <div
                    key={row.id}
                    className={`flex flex-col gap-4 rounded-2xl p-4 transition sm:flex-row sm:items-center sm:justify-between ${
                      isChecked
                        ? "bg-[#f8f7fd] ring-2 ring-[#4a3f7a]"
                        : "bg-white ring-1 ring-[#4a3f7a]/10 hover:bg-[#f8f7fd]/50"
                    }`}
                  >
                    <div
                      onClick={() => toggleSelected(row)}
                      className="flex flex-1 cursor-pointer items-center gap-4"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#4a3f7a] text-xs font-black text-white">
                        #{row.no}
                      </span>
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black shadow-xs ${row.badgeColor}`}
                      >
                        {row.badge}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-[#2b2540]">{row.name}</p>
                        <p className="text-xs font-semibold text-[#8b84a5]">
                          {row.totalSoal} soal tersedia di bank soal
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* INPUT JUMLAH SOAL (BARU): hanya aktif kalau modul dicentang */}
                      {isChecked && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 rounded-xl border border-[#e4e2ee] bg-white px-2 py-1.5 shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() => updateJumlahSoal(row, jumlahSoal - 1)}
                            disabled={tidakAdaSoal || jumlahSoal <= 1}
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-[#4a3f7a] hover:bg-[#f8f7fd] disabled:opacity-30"
                            aria-label={`Kurangi jumlah soal ${row.name}`}
                          >
                            <Minus size={13} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={row.totalSoal || undefined}
                            value={jumlahSoal}
                            disabled={tidakAdaSoal}
                            onChange={(e) =>
                              updateJumlahSoal(row, Number(e.target.value))
                            }
                            className="w-12 border-0 bg-transparent text-center text-sm font-black text-[#3d3466] outline-none disabled:opacity-40"
                          />
                          <button
                            type="button"
                            onClick={() => updateJumlahSoal(row, jumlahSoal + 1)}
                            disabled={tidakAdaSoal || jumlahSoal >= row.totalSoal}
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-[#4a3f7a] hover:bg-[#f8f7fd] disabled:opacity-30"
                            aria-label={`Tambah jumlah soal ${row.name}`}
                          >
                            <Plus size={13} />
                          </button>
                          <span className="pl-1 text-[11px] font-bold text-[#8b84a5]">
                            / {row.totalSoal} soal
                          </span>
                        </div>
                      )}

                      <div
                        onClick={() => toggleSelected(row)}
                        className={`flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition ${
                          isChecked
                            ? "border-[#4a3f7a] bg-[#4a3f7a] text-white"
                            : "border-[#8b84a5]"
                        }`}
                      >
                        {isChecked && <Check size={14} strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {filteredModules.length > 0 && (
            <div className="mt-6 flex items-center justify-between border-t border-[#f0edf9] pt-5">
              <p className="text-xs font-semibold text-[#8b84a5]">
                Menampilkan {Math.min((currentPage - 1) * MODULES_PER_PAGE + 1, filteredModules.length)}-
                {Math.min(currentPage * MODULES_PER_PAGE, filteredModules.length)} dari {filteredModules.length} modul
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  aria-label="Halaman sebelumnya"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e4e2ee] text-[#4a3f7a] transition hover:bg-[#f8f7fd] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={17} />
                </button>
                <span className="min-w-20 text-center text-xs font-bold text-[#4a3f7a]">
                  Halaman {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Halaman berikutnya"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e4e2ee] text-[#4a3f7a] transition hover:bg-[#f8f7fd] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          )}

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
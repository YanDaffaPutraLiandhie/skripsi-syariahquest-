"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DosenContainer from "@/components/layout/DosenContainer";

type AktivitasRow = {
  id: number;
  no: number;
  name: string;
  progress: number;
  nilai: number | null;
  selesai: boolean;
  statusKuis: "belum" | "lulus" | "tidak_lulus";
};

type SortKey = "default" | "name" | "status" | "nilai";
type SortDir = "asc" | "desc";

// Urutan prioritas status kuis untuk sorting (belum < tidak_lulus < lulus)
const STATUS_ORDER: Record<AktivitasRow["statusKuis"], number> = {
  belum: 0,
  tidak_lulus: 1,
  lulus: 2,
};

function AktivitasModulContent() {
  const route = useRouter();
  const searchParams = useSearchParams();

  // id modul dikirim lewat URL, contoh:
  // /Dosen/modul/aktivitas?id=12
  const idParam = searchParams.get("id");
  const idModul = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null;

  const [namaModul, setNamaModul] = useState("");
  const [rows, setRows] = useState<AktivitasRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // =========================================================
  // STATE SORTING
  // =========================================================
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: Exclude<SortKey, "default">) {
    if (sortKey === key) {
      // klik kolom yang sama -> balik arah
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      // klik kolom baru -> mulai dari desc (nilai/status tertinggi dulu),
      // kecuali nama yang lebih natural mulai dari A-Z (asc)
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function SortIcon({ column }: { column: Exclude<SortKey, "default"> }) {
    if (sortKey !== column) {
      return <span className="ml-1 inline-block text-[#c9c4dd]">↕</span>;
    }
    return (
      <span className="ml-1 inline-block text-[#4a3f7a]">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  useEffect(() => {
    async function load() {
      if (!idModul) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // =========================================================
      // 1. AMBIL NAMA MODUL (untuk judul halaman)
      // =========================================================
      const { data: modulData, error: modulError } = await supabase
        .from("modul")
        .select("nama_modul")
        .eq("id_modul", idModul)
        .maybeSingle();

      if (modulError) {
        console.error("Gagal fetch nama modul:", modulError);
      }

      setNamaModul(modulData?.nama_modul ?? "Modul");

      // =========================================================
      // 2. AMBIL SEMUA MAHASISWA YANG MENGAKSES MODUL INI SAJA
      // =========================================================
      const { data, error } = await supabase
        .from("progress_modul")
        .select(
          `
          id_mahasiswa,
          nilai,
          selesai,
          materi_dilihat,
          kuis_dicoba,
          mahasiswa:id_mahasiswa (
            id_mahasiswa,
            nama_mahasiswa
          )
        `
        )
        .eq("id_modul", idModul);

      if (error) {
        console.error("Gagal fetch progress_modul:", error);
        setIsLoading(false);
        return;
      }

      // =========================================================
      // 3. HITUNG PERSENTASE PROGRESS PER MAHASISWA UNTUK MODUL INI
      //
      // Progress 100% begitu kuis sudah DICOBA (kuis_dicoba = true),
      // baik hasilnya lulus (selesai = true) maupun tidak lulus
      // (selesai = false). Nilai tetap dicatat apa adanya.
      // =========================================================
      const mapped: AktivitasRow[] = (data ?? [])
        .filter((row: any) => row.id_mahasiswa)
        .map((row: any) => {
          const mhs = Array.isArray(row.mahasiswa) ? row.mahasiswa[0] : row.mahasiswa;
          const name = mhs?.nama_mahasiswa ?? "Mahasiswa";

          let persentase = 0;
          if (row.kuis_dicoba) {
            persentase = 100;
          } else if (row.materi_dilihat) {
            persentase = 40;
          }

          const statusKuis: AktivitasRow["statusKuis"] = !row.kuis_dicoba
            ? "belum"
            : row.selesai
            ? "lulus"
            : "tidak_lulus";

          return {
            id: row.id_mahasiswa,
            no: 0, // diisi ulang setelah sorting default
            name,
            progress: persentase,
            nilai: row.nilai,
            selesai: row.selesai,
            statusKuis,
          };
        });

      // =========================================================
      // 4. URUTAN DEFAULT: PROGRESS TERBESAR KE TERKECIL
      // =========================================================
      mapped.sort((a, b) => b.progress - a.progress);

      const numbered = mapped.map((row, index) => ({
        ...row,
        no: index + 1,
      }));

      setRows(numbered);
      setIsLoading(false);
      setSortKey("default");
      setSortDir("desc");
    }

    load();
  }, [idModul]);

  // =========================================================
  // DATA YANG SUDAH DIURUTKAN SESUAI PILIHAN USER (tanpa
  // mengubah urutan asli "rows" / nomor default-nya)
  // =========================================================
  const sortedRows = useMemo(() => {
    if (sortKey === "default") return rows;

    const dirMultiplier = sortDir === "asc" ? 1 : -1;
    const copy = [...rows];

    copy.sort((a, b) => {
      let compareValue = 0;

      if (sortKey === "name") {
        compareValue = a.name.localeCompare(b.name, "id", { sensitivity: "base" });
      } else if (sortKey === "status") {
        compareValue = STATUS_ORDER[a.statusKuis] - STATUS_ORDER[b.statusKuis];
      } else if (sortKey === "nilai") {
        const nilaiA = a.nilai ?? -1;
        const nilaiB = b.nilai ?? -1;
        compareValue = nilaiA - nilaiB;
      }

      return compareValue * dirMultiplier;
    });

    return copy;
  }, [rows, sortKey, sortDir]);

  // =========================================================
  // EKSPOR DATA KE CSV (bisa dibuka di Excel)
  // Mengikuti urutan yang sedang ditampilkan (sortedRows)
  // =========================================================
  function handleExport() {
    if (sortedRows.length === 0) return;

    setIsExporting(true);

    try {
      // Bantu escape koma/kutip agar CSV tidak rusak
      const escapeCsv = (value: string | number) => {
        const str = String(value ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const lines: string[] = [];

      // Baris judul / metadata
      lines.push(`Nama Modul,${escapeCsv(namaModul || "Modul")}`);
      lines.push(`Tanggal Ekspor,${escapeCsv(new Date().toLocaleString("id-ID"))}`);
      lines.push(`Jumlah Mahasiswa,${escapeCsv(sortedRows.length)}`);
      lines.push(""); // baris kosong pemisah

      // Header tabel
      lines.push(
        ["No", "Nama Mahasiswa", "Progress (%)", "Nilai", "Status"]
          .map(escapeCsv)
          .join(",")
      );

      // Isi tabel (mengikuti urutan tampilan saat ini)
      sortedRows.forEach((row) => {
        const statusLabel =
          row.statusKuis === "lulus"
            ? "Lulus"
            : row.statusKuis === "tidak_lulus"
            ? "Tidak Lulus"
            : "Belum Mengerjakan Kuis";

        lines.push(
          [row.no, row.name, row.progress, row.nilai ?? "-", statusLabel]
            .map(escapeCsv)
            .join(",")
        );
      });

      const csvContent = "\uFEFF" + lines.join("\n"); // \uFEFF = BOM agar Excel baca UTF-8 dgn benar
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const safeModulName = (namaModul || "modul")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const fileName = `aktivitas_${safeModulName}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <DosenContainer
      categoryTag="MODUL PEMBELAJARAN"
      title={`Aktivitas Modul${namaModul ? `: ${namaModul}` : ""}`}
      subtitle="Daftar mahasiswa yang mengakses modul ini beserta progress-nya."
      headerAction={
        <button
          type="button"
          onClick={() => route.push("/Dosen/modul")}
          className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          ← Kembali ke Modul
        </button>
      }
    >
      <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-black/5">
        <div className="mb-6 flex items-center justify-between border-b border-[#f0edf9] pb-4">
          <h2 className="text-xl font-bold text-[#3d3466]">Daftar Mahasiswa Mengakses Modul</h2>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || sortedRows.length === 0}
            className="rounded-full bg-emerald-400 px-6 py-2.5 text-xs font-bold text-emerald-950 hover:bg-emerald-300 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? "Mengekspor..." : "Ekspor Data (Excel/CSV)"}
          </button>
        </div>

        {!idModul ? (
          <div className="py-12 text-center text-sm font-semibold text-rose-600">
            Modul tidak ditemukan. Kembali ke daftar modul dan pilih modul terlebih dahulu.
          </div>
        ) : isLoading ? (
          <div className="py-12 text-center text-sm font-semibold text-[#8b84a5]">
            Memuat aktivitas mahasiswa...
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="py-12 text-center text-sm font-semibold text-[#8b84a5]">
            Belum ada mahasiswa yang mengakses modul ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#f0edf9] text-xs font-bold uppercase tracking-wider text-[#8b84a5]">
                  <th className="pb-3 px-4">No</th>
                  <th className="pb-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort("name")}
                      className="flex items-center hover:text-[#4a3f7a] transition"
                    >
                      Nama Mahasiswa
                      <SortIcon column="name" />
                    </button>
                  </th>
                  <th className="pb-3 px-4 text-center">Progress</th>
                  <th className="pb-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleSort("status")}
                      className="mx-auto flex items-center hover:text-[#4a3f7a] transition"
                    >
                      Status Kuis
                      <SortIcon column="status" />
                    </button>
                  </th>
                  <th className="pb-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleSort("nilai")}
                      className="mx-auto flex items-center hover:text-[#4a3f7a] transition"
                    >
                      Nilai
                      <SortIcon column="nilai" />
                    </button>
                  </th>
                  <th className="pb-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0edf9]">
                {sortedRows.map((row) => (
                  <tr key={row.id} className="group transition hover:bg-[#f8f7fd]">
                    <td className="py-4 px-4 font-bold text-[#4a3f7a]">#{row.no}</td>
                    <td className="py-4 px-4 font-bold text-[#2b2540]">{row.name}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                        {row.progress}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.statusKuis === "belum" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                          Belum Kuis
                        </span>
                      ) : row.statusKuis === "lulus" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                          Lulus
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                          Tidak Lulus
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-[#2b2540]">
                      {row.nilai ?? "-"}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() =>
                          route.push(
                            `/Dosen/modul/aktivitas/detail_aktivitas/${row.id}?id_modul=${idModul}`
                          )
                        }
                        className="rounded-full bg-amber-400 px-5 py-2 text-xs font-bold text-amber-950 hover:bg-amber-300 transition shadow-sm"
                      >
                        Detail Aktivitas
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DosenContainer>
  );
}

export default function AktivitasModulPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm font-semibold text-[#4a3f7a]">Memuat halaman aktivitas...</p>
        </div>
      }
    >
      <AktivitasModulContent />
    </Suspense>
  );
}
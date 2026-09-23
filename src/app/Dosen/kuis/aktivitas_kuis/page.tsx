"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DosenContainer from "@/components/layout/DosenContainer";

type AktivitasKuisRow = {
  id: number;
  no: number;
  idMahasiswa: number;
  name: string;
  nilai: number;
  lulus: boolean;
  dikerjakanPada: string | null;
};

type SortKey = "default" | "name" | "nilai" | "tanggal";
type SortDir = "asc" | "desc";

function formatTanggal(value: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function AktivitasKuisContent() {
  const route = useRouter();
  const searchParams = useSearchParams();

  // id kuis dikirim lewat URL, contoh:
  // /Dosen/kuis/aktivitas_kuis?id=110
  const idParam = searchParams.get("id");
  const idKuis = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null;

  const [namaKuis, setNamaKuis] = useState("");
  const [rows, setRows] = useState<AktivitasKuisRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: Exclude<SortKey, "default">) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
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
      if (!idKuis) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      // =========================================================
      // 1. AMBIL NAMA KUIS (untuk judul halaman)
      // =========================================================
      const { data: kuisData, error: kuisError } = await supabase
        .from("quis")
        .select("nama_kuis")
        .eq("id_quis", idKuis)
        .maybeSingle();

      if (kuisError) {
        console.error("Gagal fetch nama kuis:", JSON.stringify(kuisError, null, 2));
      }

      setNamaKuis(kuisData?.nama_kuis ?? "Kuis");

      // =========================================================
      // 2. AMBIL RIWAYAT UJIAN UNTUK KUIS INI
      //    (tanpa embed join, supaya tidak bergantung pada relasi
      //    foreign key yang mungkin belum terdaftar di Supabase)
      // =========================================================
      const { data: riwayatData, error: riwayatError } = await supabase
        .from("riwayat_ujian")
        .select("id, id_mahasiswa, nilai, lulus, dikerjakan_pada")
        .eq("id_quis", idKuis);

      if (riwayatError) {
        console.error(
          "Gagal fetch riwayat_ujian:",
          JSON.stringify(riwayatError, null, 2)
        );
        setLoadError(
          riwayatError.message ||
            "Terjadi kesalahan saat mengambil data riwayat ujian. Kemungkinan diblokir oleh RLS policy."
        );
        setIsLoading(false);
        return;
      }

      const rowsRaw = riwayatData ?? [];

      if (rowsRaw.length === 0) {
        setRows([]);
        setIsLoading(false);
        setSortKey("default");
        setSortDir("desc");
        return;
      }

      // =========================================================
      // 3. AMBIL NAMA MAHASISWA SECARA TERPISAH BERDASARKAN ID
      // =========================================================
      const idMahasiswaList = [
        ...new Set(rowsRaw.map((r) => r.id_mahasiswa).filter(Boolean)),
      ];

      const { data: mhsData, error: mhsError } = await supabase
        .from("mahasiswa")
        .select("id_mahasiswa, nama_mahasiswa")
        .in("id_mahasiswa", idMahasiswaList);

      if (mhsError) {
        console.error("Gagal fetch mahasiswa:", JSON.stringify(mhsError, null, 2));
      }

      const namaMap = new Map(
        (mhsData ?? []).map((m) => [m.id_mahasiswa, m.nama_mahasiswa])
      );

      const mapped: AktivitasKuisRow[] = rowsRaw.map((row: any) => ({
        id: row.id,
        no: 0, // diisi ulang setelah sorting
        idMahasiswa: row.id_mahasiswa,
        name: namaMap.get(row.id_mahasiswa) ?? "Mahasiswa",
        nilai: Number(row.nilai) || 0,
        lulus: Boolean(row.lulus),
        dikerjakanPada: row.dikerjakan_pada ?? null,
      }));

      // =========================================================
      // 4. URUTAN DEFAULT: NILAI TERBESAR KE TERKECIL
      // =========================================================
      mapped.sort((a, b) => b.nilai - a.nilai);

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
  }, [idKuis]);

  const sortedRows = useMemo(() => {
    if (sortKey === "default") return rows;

    const dirMultiplier = sortDir === "asc" ? 1 : -1;
    const copy = [...rows];

    copy.sort((a, b) => {
      let compareValue = 0;

      if (sortKey === "name") {
        compareValue = a.name.localeCompare(b.name, "id", { sensitivity: "base" });
      } else if (sortKey === "nilai") {
        compareValue = a.nilai - b.nilai;
      } else if (sortKey === "tanggal") {
        const tA = a.dikerjakanPada ? new Date(a.dikerjakanPada).getTime() : 0;
        const tB = b.dikerjakanPada ? new Date(b.dikerjakanPada).getTime() : 0;
        compareValue = tA - tB;
      }

      return compareValue * dirMultiplier;
    });

    return copy;
  }, [rows, sortKey, sortDir]);

  // =========================================================
  // EKSPOR DATA KE CSV (bisa dibuka di Excel)
  // =========================================================
  function handleExport() {
    if (sortedRows.length === 0) return;

    setIsExporting(true);

    try {
      const escapeCsv = (value: string | number) => {
        const str = String(value ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const lines: string[] = [];

      lines.push(`Nama Kuis,${escapeCsv(namaKuis || "Kuis")}`);
      lines.push(`Tanggal Ekspor,${escapeCsv(new Date().toLocaleString("id-ID"))}`);
      lines.push(`Jumlah Mahasiswa,${escapeCsv(sortedRows.length)}`);
      lines.push("");

      lines.push(
        ["No", "Nama Mahasiswa", "Nilai", "Dikerjakan Pada"]
          .map(escapeCsv)
          .join(",")
      );

      sortedRows.forEach((row) => {
        lines.push(
          [
            row.no,
            row.name,
            row.nilai,
            row.lulus ? "Lulus" : "Tidak Lulus",
            formatTanggal(row.dikerjakanPada),
          ]
            .map(escapeCsv)
            .join(",")
        );
      });

      const csvContent = "\uFEFF" + lines.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const safeKuisName = (namaKuis || "kuis")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const fileName = `aktivitas_kuis_${safeKuisName}_${new Date()
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
      categoryTag="EVALUASI & KUIS"
      title={`Aktivitas Kuis${namaKuis ? `: ${namaKuis}` : ""}`}
      subtitle="Daftar mahasiswa yang mengerjakan kuis ini beserta nilai yang diperoleh."
      headerAction={
        <button
          type="button"
          onClick={() => route.push("/Dosen/kuis")}
          className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          ← Kembali ke Kuis
        </button>
      }
    >
      <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-black/5">
        <div className="mb-6 flex items-center justify-between border-b border-[#f0edf9] pb-4">
          <h2 className="text-xl font-bold text-[#3d3466]">Daftar Mahasiswa Mengerjakan Kuis</h2>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || sortedRows.length === 0}
            className="rounded-full bg-emerald-400 px-6 py-2.5 text-xs font-bold text-emerald-950 hover:bg-emerald-300 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? "Mengekspor..." : "Ekspor Data (Excel/CSV)"}
          </button>
        </div>

        {!idKuis ? (
          <div className="py-12 text-center text-sm font-semibold text-rose-600">
            Kuis tidak ditemukan. Kembali ke daftar kuis dan pilih kuis terlebih dahulu.
          </div>
        ) : loadError ? (
          <div className="py-12 text-center text-sm font-semibold text-rose-600">
            Gagal memuat data aktivitas kuis: {loadError}
          </div>
        ) : isLoading ? (
          <div className="py-12 text-center text-sm font-semibold text-[#8b84a5]">
            Memuat aktivitas mahasiswa...
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="py-12 text-center text-sm font-semibold text-[#8b84a5]">
            Belum ada mahasiswa yang mengerjakan kuis ini.
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
                 
                  <th className="pb-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleSort("tanggal")}
                      className="mx-auto flex items-center hover:text-[#4a3f7a] transition"
                    >
                      Dikerjakan Pada
                      <SortIcon column="tanggal" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0edf9]">
                {sortedRows.map((row) => (
                  <tr key={row.id} className="group transition hover:bg-[#f8f7fd]">
                    <td className="py-4 px-4 font-bold text-[#4a3f7a]">#{row.no}</td>
                    <td className="py-4 px-4 font-bold text-[#2b2540]">{row.name}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                        {row.nilai}%
                      </span>
                    </td>
                    
                    <td className="py-4 px-4 text-center text-xs font-semibold text-[#8b84a5]">
                      {formatTanggal(row.dikerjakanPada)}
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

export default function AktivitasKuisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm font-semibold text-[#4a3f7a]">Memuat halaman aktivitas kuis...</p>
        </div>
      }
    >
      <AktivitasKuisContent />
    </Suspense>
  );
}
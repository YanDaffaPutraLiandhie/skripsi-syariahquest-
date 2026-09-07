"use client";

import { Suspense, useEffect, useState } from "react";
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
      // =========================================================
      const mapped: AktivitasRow[] = (data ?? [])
        .filter((row: any) => row.id_mahasiswa)
        .map((row: any) => {
          const mhs = Array.isArray(row.mahasiswa) ? row.mahasiswa[0] : row.mahasiswa;
          const name = mhs?.nama_mahasiswa ?? "Mahasiswa";

          let persentase = 0;
          if (row.selesai) {
            persentase = 100;
          } else if (row.kuis_dicoba) {
            persentase = 40 + Math.round(((row.nilai || 0) / 100) * 60);
          } else if (row.materi_dilihat) {
            persentase = 40;
          }

          return {
            id: row.id_mahasiswa,
            no: 0, // diisi ulang setelah sorting
            name,
            progress: persentase,
            nilai: row.nilai,
            selesai: row.selesai,
          };
        });

      // =========================================================
      // 4. URUTKAN DARI PROGRESS TERBESAR KE TERKECIL
      // =========================================================
      mapped.sort((a, b) => b.progress - a.progress);

      const numbered = mapped.map((row, index) => ({
        ...row,
        no: index + 1,
      }));

      setRows(numbered);
      setIsLoading(false);
    }

    load();
  }, [idModul]);

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
          <button className="rounded-full bg-emerald-400 px-6 py-2.5 text-xs font-bold text-emerald-950 hover:bg-emerald-300 transition shadow-sm">
            Ekspor Data (Excel/CSV)
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
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm font-semibold text-[#8b84a5]">
            Belum ada mahasiswa yang mengakses modul ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#f0edf9] text-xs font-bold uppercase tracking-wider text-[#8b84a5]">
                  <th className="pb-3 px-4">No</th>
                  <th className="pb-3 px-4">Nama Mahasiswa</th>
                  <th className="pb-3 px-4 text-center">Progress</th>
                  <th className="pb-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0edf9]">
                {rows.map((row) => (
                  <tr key={row.id} className="group transition hover:bg-[#f8f7fd]">
                    <td className="py-4 px-4 font-bold text-[#4a3f7a]">#{row.no}</td>
                    <td className="py-4 px-4 font-bold text-[#2b2540]">{row.name}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                        {row.progress}%
                      </span>
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
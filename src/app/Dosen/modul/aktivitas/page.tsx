"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DosenContainer from "@/components/layout/DosenContainer";

type AktivitasRow = {
  id: number;
  no: number;
  name: string;
  progress: number;
};

export default function Aktivitas() {
  const route = useRouter();
  const [rows, setRows] = useState<AktivitasRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);

      const { data, error } = await supabase.from("progress_modul").select(
        `
        id_mahasiswa,
        nilai,
        selesai,
        mahasiswa:id_mahasiswa (
          id_mahasiswa,
          nama_mahasiswa
        )
      `
      );

      if (error) {
        console.error("Gagal fetch progress_modul:", error);
        setIsLoading(false);
        return;
      }

      const grouped = new Map<number, { name: string; totalNilai: number; count: number }>();

      (data ?? []).forEach((row: any) => {
        const idM = row.id_mahasiswa;
        if (!idM) return;

        const mhs = Array.isArray(row.mahasiswa) ? row.mahasiswa[0] : row.mahasiswa;
        const name = mhs?.nama_mahasiswa ?? "Mahasiswa";

        const existing = grouped.get(idM);
        if (existing) {
          existing.totalNilai += Number(row.nilai) || 0;
          existing.count += 1;
        } else {
          grouped.set(idM, { name, totalNilai: Number(row.nilai) || 0, count: 1 });
        }
      });

      const mapped: AktivitasRow[] = Array.from(grouped.entries()).map(([idM, val], index) => ({
        id: idM,
        no: index + 1,
        name: val.name,
        progress: val.count ? Math.round(val.totalNilai / val.count) : 0,
      }));

      setRows(mapped);
      setIsLoading(false);
    }

    load();
  }, []);

  return (
    <DosenContainer
      categoryTag="MODUL PEMBELAJARAN"
      title="Aktivitas Pembelajaran Mahasiswa"
      subtitle="Pantau pencapaian progress dan nilai rata-rata modul seluruh mahasiswa."
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
          <h2 className="text-xl font-bold text-[#3d3466]">Daftar Progress Mahasiswa</h2>
          <button className="rounded-full bg-emerald-400 px-6 py-2.5 text-xs font-bold text-emerald-950 hover:bg-emerald-300 transition shadow-sm">
            Ekspor Data (Excel/CSV)
          </button>
        </div>

        {isLoading ? (
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
                  <th className="pb-3 px-4 text-center">Rata-rata Progress</th>
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
                        onClick={() => route.push(`/Dosen/modul/aktivitas/detail_aktivitas/${row.id}`)}
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
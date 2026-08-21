"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AktivitasRow = {
  id: number; // id_mahasiswa
  no: number;
  name: string;
  progress: number; // rata-rata nilai dari semua modul yang dikerjakan
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

      // Kelompokkan per mahasiswa
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
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <main className="flex-1 p-8">
        <div className="rounded-[24px] bg-[#4a3f7a] px-10 pb-8 pt-10 text-white">
          <h1 className="mb-8 text-center text-3xl font-extrabold">Aktivitas</h1>

          <div className="mb-3 grid grid-cols-[60px_1fr_100px_100px] items-center gap-4 px-1 text-sm font-semibold">
            <span>No</span>
            <span>Nama Mahasiswa</span>
            <span>progress</span>
            <span>Aksi</span>
          </div>

          {isLoading ? (
            <p className="py-6 text-center text-sm text-white/70">Memuat data...</p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/70">
              Belum ada mahasiswa yang mengakses modul.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {rows.map((row) => (
                <div key={row.id} className="grid grid-cols-[60px_1fr_100px_100px] items-center gap-4">
                  <div className="flex h-9 w-16 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#2b2540]">
                    {row.no}
                  </div>
                  <input
                    type="text"
                    defaultValue={row.name}
                    readOnly
                    className="h-9 w-full rounded-full border-none bg-white px-4 text-sm text-[#2b2540] outline-none"
                  />
                  <div className="flex h-9 w-16 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#2b2540]">
                    {row.progress}%
                  </div>
                  <button
                    onClick={() => route.push(`/Dosen/modul/aktivitas/detail_aktivitas/${row.id}`)}
                    className="h-9 rounded-full bg-amber-400 text-sm font-semibold text-amber-950 hover:bg-amber-300"
                  >
                    Detail
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button className="rounded-full bg-emerald-400 px-8 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-300">
              Ekspor
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
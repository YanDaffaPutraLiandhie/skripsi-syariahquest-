"use client";

import {useRouter} from "next/navigation";

import { useEffect, useState } from "react";
import MiniProfile from "@/components/layout/MiniProfile";
import { supabase } from "@/lib/supabase";

type AktivitasRow = {
  id: number;
  no: number;
  name: string;
  progress: number;
};

const FALLBACK_ROWS: AktivitasRow[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  no: i + 1,
  name: "Mahasiswa",
  progress: 80,
}));

export default function Aktivitas() {
  const route = useRouter();
  const [rows, setRows] = useState<AktivitasRow[]>(FALLBACK_ROWS);

  useEffect(() => {
    async function load() {
const { data, error } = await supabase
        .from("mahasiswa")
        .select("id_mahasiswa, nama_mahasiswa, Nilai");

      if (error) {
        console.error("Supabase error:", error);
        return;
      }

      const mapped = (data ?? []).map((item: any, index: number) => ({
        id: item.id_mahasiswa ?? index + 1,
        no: index + 1,
        name: item.nama_mahasiswa ?? "Mahasiswa",
        progress: Number(item.Nilai) || 0,
      }));

      setRows(mapped.length ? mapped : FALLBACK_ROWS);
    }

    load();
  }, []);

  const ROWS = rows;

  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      {/* Main */}
      <main className="flex-1 p-8">
        {/* Topbar */}
        

        {/* Purple panel */}
        <div className="rounded-[24px] bg-[#4a3f7a] px-10 pb-8 pt-10 text-white">
          <h1 className="mb-8 text-center text-3xl font-extrabold">Aktivitas</h1>

          <div className="mb-3 grid grid-cols-[60px_1fr_100px_100px] items-center gap-4 px-1 text-sm font-semibold">
            <span>No</span>
            <span>Nama Mahasiswa</span>
            <span>progress</span>
            <span>Aksi</span>
          </div>

          <div className="flex flex-col gap-3">
            {ROWS.map((row) => (
              <div
                key={row.no}
                className="grid grid-cols-[60px_1fr_100px_100px] items-center gap-4"
              >
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
                onClick={()=> route.push(`/Dosen/modul/aktivitas/detail_aktivitas/${row.id}`)}
                className="h-9 rounded-full bg-amber-400 text-sm font-semibold text-amber-950 hover:bg-amber-300">
                  Detail
                </button>
              </div>
            ))}
          </div>

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
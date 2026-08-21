"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ModulDone = {
  no: number;
  name: string;
  badge: string;
  badgeColor: string;
  score: number;
};

function getBadgeInfo(namaLevel: string | null | undefined) {
  const lvl = (namaLevel ?? "").toLowerCase();
  if (lvl.includes("easy") || lvl.includes("mudah")) return { badge: "E", badgeColor: "bg-emerald-500" };
  if (lvl.includes("medium") || lvl.includes("sedang")) return { badge: "M", badgeColor: "bg-amber-400" };
  if (lvl.includes("hard") || lvl.includes("sulit")) return { badge: "H", badgeColor: "bg-red-600" };
  return { badge: "-", badgeColor: "bg-gray-400" };
}

export default function DetailMahasiswa() {
  const params = useParams();
  const idMahasiswa = params?.id as string;

  const [namaMahasiswa, setNamaMahasiswa] = useState("Mahasiswa");
  const [modulDone, setModulDone] = useState<ModulDone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!idMahasiswa) return;

    async function load() {
      setIsLoading(true);

      // Nama mahasiswa
      const { data: mhs, error: mhsError } = await supabase
        .from("mahasiswa")
        .select("nama_mahasiswa")
        .eq("id_mahasiswa", idMahasiswa)
        .maybeSingle();

      if (mhsError) console.error("Gagal fetch mahasiswa:", mhsError);
      setNamaMahasiswa(mhs?.nama_mahasiswa ?? "Mahasiswa");

      // Modul yang sudah diselesaikan mahasiswa ini
      const { data, error } = await supabase
        .from("progress_modul")
        .select(
          `
          id,
          nilai,
          selesai,
          modul:id_modul (
            id_modul,
            nama_modul,
            level:id_level (
              id_level,
              nama_level
            )
          )
        `
        )
        .eq("id_mahasiswa", idMahasiswa)
        .eq("selesai", true);

      if (error) {
        console.error("Gagal fetch progress_modul:", error);
        setIsLoading(false);
        return;
      }

      const mapped: ModulDone[] = (data ?? []).map((row: any, index: number) => {
        const modul = Array.isArray(row.modul) ? row.modul[0] : row.modul;
        const level = Array.isArray(modul?.level) ? modul.level[0] : modul?.level;
        const { badge, badgeColor } = getBadgeInfo(level?.nama_level);

        return {
          no: index + 1,
          name: modul?.nama_modul ?? "Modul",
          badge,
          badgeColor,
          score: Number(row.nilai) || 0,
        };
      });

      setModulDone(mapped);
      setIsLoading(false);
    }

    load();
  }, [idMahasiswa]);

  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <main className="flex-1 p-8">
        <div className="rounded-[24px] bg-[#4a3f7a] px-10 pb-8 pt-10 text-white">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#dcdae3]">
              <svg className="h-10 w-10 text-[#a3a0b5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
              </svg>
            </div>
            <h1 className="mb-4 text-2xl font-bold">{namaMahasiswa}</h1>
            <h2 className="text-base font-semibold">Modul Yang Telah diselesaikan</h2>
          </div>

          {isLoading ? (
            <p className="py-6 text-center text-sm text-white/70">Memuat data...</p>
          ) : modulDone.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/70">
              Mahasiswa ini belum menyelesaikan modul apa pun.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {modulDone.map((row) => (
                <div key={row.no} className="grid grid-cols-[60px_1fr_90px] items-center gap-4">
                  <div className="flex h-9 w-16 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#2b2540]">
                    {row.no}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      defaultValue={row.name}
                      readOnly
                      className="h-9 w-full rounded-full border-none bg-white px-4 pr-10 text-sm text-[#2b2540] outline-none"
                    />
                    <span
                      className={`absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white ${row.badgeColor}`}
                    >
                      {row.badge}
                    </span>
                  </div>
                  <div className="flex h-9 w-16 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#2b2540]">
                    {row.score}
                  </div>
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
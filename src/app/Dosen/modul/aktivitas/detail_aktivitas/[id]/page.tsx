"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DosenContainer from "@/components/layout/DosenContainer";

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
  const router = useRouter();
  const params = useParams();
  const idMahasiswa = params?.id as string;

  const [namaMahasiswa, setNamaMahasiswa] = useState("Mahasiswa");
  const [modulDone, setModulDone] = useState<ModulDone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!idMahasiswa) return;

    async function load() {
      setIsLoading(true);

      const { data: mhs, error: mhsError } = await supabase
        .from("mahasiswa")
        .select("nama_mahasiswa")
        .eq("id_mahasiswa", idMahasiswa)
        .maybeSingle();

      if (mhsError) console.error("Gagal fetch mahasiswa:", mhsError);
      setNamaMahasiswa(mhs?.nama_mahasiswa ?? "Mahasiswa");

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
    <DosenContainer
      categoryTag="DETAIL AKTIVITAS MAHASISWA"
      title={namaMahasiswa}
      subtitle="Riwayat modul dan pencapaian nilai yang telah diselesaikan mahasiswa."
      headerAction={
        <button
          type="button"
          onClick={() => router.push("/Dosen/modul/aktivitas")}
          className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          ← Kembali ke Aktivitas
        </button>
      }
    >
      <div className="mx-auto max-w-4xl rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-black/5">
        <div className="mb-8 flex flex-col items-center border-b border-[#f0edf9] pb-6">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#4a3f7a] to-[#3d3466] text-white shadow-md">
            <svg className="h-10 w-10 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#3d3466]">{namaMahasiswa}</h2>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#f8f7fd] px-3.5 py-1 text-xs font-semibold text-[#4a3f7a] ring-1 ring-[#4a3f7a]/10">
            Daftar Modul Diselesaikan ({modulDone.length})
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm font-semibold text-[#8b84a5]">
            Memuat detail progress mahasiswa...
          </div>
        ) : modulDone.length === 0 ? (
          <div className="py-12 text-center text-sm font-semibold text-[#8b84a5]">
            Mahasiswa ini belum menyelesaikan modul pembelajaran apapun.
          </div>
        ) : (
          <div className="space-y-3">
            {modulDone.map((row) => (
              <div
                key={row.no}
                className="flex items-center justify-between rounded-2xl bg-[#f8f7fd] p-4 ring-1 ring-[#4a3f7a]/5 transition hover:bg-[#f0edf9]"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4a3f7a] text-xs font-bold text-white">
                    #{row.no}
                  </span>
                  <span className="text-sm font-bold text-[#2b2540]">{row.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${row.badgeColor}`}>
                    {row.badge}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                    Nilai: {row.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-end pt-4 border-t border-[#f0edf9]">
          <button className="rounded-full bg-emerald-400 px-8 py-2.5 text-xs font-bold text-emerald-950 hover:bg-emerald-300 transition shadow-sm">
            Ekspor Laporan (PDF)
          </button>
        </div>
      </div>
    </DosenContainer>
  );
}
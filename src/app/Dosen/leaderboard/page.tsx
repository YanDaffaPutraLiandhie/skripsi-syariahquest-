"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

type LeaderboardRow = {
  id: number;
  no: number;
  name: string;
  score: number;
};

const FALLBACK_ROWS: LeaderboardRow[] = Array.from(
  { length: 8 },
  (_, i) => ({
    id: i + 1,
    no: i + 1,
    name: "Mahasiswa",
    score: 80,
  })
);

export default function Leaderboard() {
  const router = useRouter();

  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("mahasiswa")
          .select("id_mahasiswa, nama_mahasiswa, Nilai")
          .order("Nilai", { ascending: false });

        if (error) {
          console.error("Supabase error:", error);

          // Jika gagal, gunakan fallback
          setRows(FALLBACK_ROWS);
          return;
        }

        const mapped: LeaderboardRow[] = (data ?? []).map(
          (item: any, index: number) => ({
            id: item.id_mahasiswa ?? index + 1,
            no: index + 1,
            name: item.nama_mahasiswa ?? "Nama Mahasiswa",
            score: Number(item.Nilai) || 0,
          })
        );

        setRows(mapped.length > 0 ? mapped : FALLBACK_ROWS);
      } catch (error) {
        console.error("Terjadi kesalahan:", error);

        setRows(FALLBACK_ROWS);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <Sidebar activeLabel="Leaderboard" />

      <main className="flex-1 p-8">
        <div className="rounded-[24px] bg-[#4a3f7a] px-10 pb-8 pt-10 text-white">
          <h1 className="mb-8 text-center text-3xl font-extrabold">
            Leaderboard
          </h1>

          <div className="mb-3 grid grid-cols-[60px_1fr_90px_90px] items-center gap-4 px-1 text-sm font-semibold">
            <span>No</span>
            <span>Nama Mahasiswa</span>
            <span>Nilai</span>
            <span>Aksi</span>
          </div>

          {/* ================= LOADING ================= */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />

              <p className="mt-4 text-sm text-white/80">
                Memuat data leaderboard...
              </p>
            </div>
          ) : rows.length === 0 ? (
            /* ================= DATA KOSONG ================= */
            <div className="py-16 text-center text-sm text-white/70">
              Belum ada data mahasiswa.
            </div>
          ) : (
            /* ================= DATA ================= */
            <div className="flex flex-col gap-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[60px_1fr_90px_90px] items-center gap-4"
                >
                  {/* NOMOR */}
                  <div className="flex h-9 w-16 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#2b2540]">
                    {row.no}
                  </div>

                  {/* NAMA */}
                  <input
                    type="text"
                    value={row.name}
                    readOnly
                    className="h-9 w-full rounded-full border-none bg-white px-4 text-sm text-[#2b2540] outline-none"
                  />

                  {/* NILAI */}
                  <div className="flex h-9 w-16 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#2b2540]">
                    {row.score}
                  </div>

                  {/* DETAIL */}
                  <button
                    onClick={() =>
                      router.push(
                        `/Dosen/leaderboard/leaderboard_detail/${row.id}`
                      )
                    }
                    className="h-9 rounded-full bg-amber-400 text-sm font-semibold text-amber-950 transition hover:bg-amber-300"
                  >
                    Detail
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
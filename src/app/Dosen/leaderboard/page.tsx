"use client";

import { useRouter } from "next/navigation";
import DosenContainer from "@/components/layout/DosenContainer";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { Trophy, Medal, Award } from "lucide-react";

export default function Leaderboard() {
  const router = useRouter();
  const { leaderboard, isLoading } = useLeaderboard();

  // Helper avatar fallback
  const getAvatar = (url?: string, name?: string) =>
    url ||
    `https://api.dicebear.com/7.x/micah/svg?seed=${name}&backgroundColor=transparent`;

  return (
    <DosenContainer
      categoryTag="PERINGKAT & LEADERBOARD"
      title="Papan Peringkat Mahasiswa"
      subtitle="Pantau XP akumulasi dan prestasi terbaik seluruh mahasiswa dalam game pembelajaran."
    >
      <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-black/5">
        <div className="mb-6 flex items-center justify-between border-b border-[#f0edf9] pb-4">
          <h2 className="text-xl font-bold text-[#3d3466]">Peringkat Teratas Mahasiswa</h2>
          <span className="rounded-full bg-[#f8f7fd] px-4 py-1.5 text-xs font-semibold text-[#4a3f7a] ring-1 ring-[#4a3f7a]/10">
            Total Mahasiswa: {leaderboard.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#4a3f7a]/20 border-t-[#4a3f7a]" />
            <p className="mt-4 text-sm font-semibold text-[#8b84a5]">
              Memuat data peringkat...
            </p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-16 text-center text-sm font-semibold text-[#8b84a5]">
            Belum ada data mahasiswa terdaftar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#f0edf9] text-xs font-bold uppercase tracking-wider text-[#8b84a5]">
                  <th className="pb-3 px-4 text-center">Rank</th>
                  <th className="pb-3 px-4">Nama Mahasiswa</th>
                  <th className="pb-3 px-4 text-center">Total XP</th>
                  <th className="pb-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0edf9]">
                {leaderboard.map((row) => {
                  const isTop1 = row.rank === 1;
                  const isTop2 = row.rank === 2;
                  const isTop3 = row.rank === 3;

                  return (
                    <tr key={row.id_mahasiswa} className="group transition hover:bg-[#f8f7fd]">
                      <td className="py-4 px-4 text-center">
                        {isTop1 ? (
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-amber-950 font-black shadow-md shadow-amber-400/30">
                            <Trophy size={18} />
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-300 text-slate-800 font-black shadow-md">
                            <Medal size={18} />
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-700 text-amber-100 font-black shadow-md">
                            <Award size={18} />
                          </span>
                        ) : (
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f8f7fd] text-xs font-bold text-[#4a3f7a]">
                            #{row.rank}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100 border border-gray-200 shadow-inner">
                            <img
                              src={getAvatar(row.avatar_url, row.nama_mahasiswa)}
                              alt={row.nama_mahasiswa}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span className="font-bold text-[#2b2540]">
                            {row.nama_mahasiswa}
                            {isTop1 && (
                              <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                                Peringkat 1
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f8f7fd] px-3.5 py-1 text-xs font-black text-[#4a3f7a] ring-1 ring-[#4a3f7a]/10">
                          {row.total_xp} XP
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() =>
                            router.push(`/Dosen/leaderboard/leaderboard_detail/${row.id_mahasiswa}`)
                          }
                          className="rounded-full bg-amber-400 px-5 py-2 text-xs font-bold text-amber-950 hover:bg-amber-300 transition shadow-sm"
                        >
                          Detail Rincian
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DosenContainer>
  );
}
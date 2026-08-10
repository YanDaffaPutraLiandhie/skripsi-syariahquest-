"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/component/sidebar";
import { supabase } from "@/lib/supabaseClient";

type ModulCard = {
  id: number;
  title: string;
  xp: number;
  badge: string;
  badgeColor: string;
  thumbnailUrl: string;
};

export default function ModulPembelajaranGrid() {
  const router = useRouter();

  const [activeStates, setActiveStates] = useState<boolean[]>([]);
  const [modulCards, setModulCards] = useState<ModulCard[]>([]);

  useEffect(() => {
    async function load() {
      try {
const { data, error } = await supabase.from("modul").select(`
  id_modul,
  nama_modul,
  thumbnail_url,
  id_level,
  status,
  level!id_level (
    xp
  )
`);
        if (error) {
          console.error("Supabase Error:", error);
          return;
        }

        console.log(data);

const cards: ModulCard[] = (data ?? []).map((item: any) => {
          const idLevel = item.id_level;
          const badge = idLevel === 1 ? "E" : idLevel === 2 ? "M" : "H";
          const badgeColor =
            idLevel === 1
              ? "bg-green-500"
              : idLevel === 2
                ? "bg-yellow-500"
                : "bg-red-500";

          return {
            id: item.id_modul,
            title: item.nama_modul,
            xp: item.level?.xp ?? 0,
            badge,
            badgeColor,
            thumbnailUrl: item.thumbnail_url ?? "",
          };
        });

setModulCards(cards);
        setActiveStates((data ?? []).map((item: any) => item.status !== false));
      } catch (err) {
        console.error(err);
      }
    }

    load();
  }, []);

  const toggleActive = async (index: number) => {
    const card = modulCards[index];
    if (!card) return;

    const newActive = !(activeStates[index] ?? true);

    const { error } = await supabase
      .from("modul")
      .update({ status: newActive })
      .eq("id_modul", card.id);

    if (error) {
      console.error("Supabase update error:", error);
      return;
    }

    setActiveStates((prev) =>
      prev.map((item, i) => (i === index ? newActive : item)),
    );
  };

  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <Sidebar activeLabel="Modul Pembelajaran" />

      <main className="flex-1 p-8">
        {/* Topbar */}
        <div className="mb-8 flex items-center justify-between">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search"
              className="w-full rounded-lg border border-[#e4e2ee] bg-white px-4 py-2.5 text-sm text-[#a3a0b5] outline-none focus:border-[#4a3f7a]"
            />

            <svg
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a3a0b5]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
          </div>

          <div className="flex items-center gap-5 text-[#5c5775]">
            <button>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
            </button>

            <button>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" />
                <path d="M10 20a2 2 0 0 0 4 0" />
              </svg>
            </button>

            <button>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
              </svg>
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Tambah Modul */}
          <button
            onClick={() => router.push("/Dosen/modul/tambah_modul")}
            className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#ececf3] bg-[#f4f3f7] text-[#a3a0b5] hover:bg-[#eeedf5]"
          >
            <span className="text-4xl">+</span>
            <span className="text-sm font-medium">Tambah Modul Baru</span>
          </button>

          {modulCards.map((card, i) => {
            const isActive = activeStates[i] ?? true;

            return (
              <div
                key={i}
                className="flex h-[300px] flex-col overflow-hidden rounded-2xl border border-[#ececf3] bg-white shadow-sm"
              >
<div className="relative h-[110px] bg-[#ececf3]">
                  {card.thumbnailUrl ? (
                    <img
                      src={card.thumbnailUrl}
                      alt={card.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-blue-500" />
                  )}

                  <div
                    className={`absolute -bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white text-sm font-bold text-white ${card.badgeColor}`}
                  >
                    {card.badge}
                  </div>

                  <button
                    onClick={() => toggleActive(i)}
                    className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold text-white ${
                      isActive
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    {isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </div>

                <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
                  <h3 className="text-sm font-bold text-[#3d3466]">
                    {card.title}
                  </h3>

                  <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-500">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>+
                    {card.xp} XP
                  </div>

                  <div className="mt-auto flex gap-2">
                    <button
                      onClick={() => router.push("/Dosen/modul/aktivitas")}
                      className="flex-1 rounded-lg border border-[#e4e2ee] py-2 text-xs font-semibold hover:bg-[#f7f6fb]"
                    >
                      Aktivitas Modul
                    </button>

                    <button
                      onClick={() => router.push("/Dosen/modul/detail_modul")}
                      className="flex-1 rounded-lg border border-[#e4e2ee] py-2 text-xs font-semibold hover:bg-[#f7f6fb]"
                    >
                      Lihat Modul
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
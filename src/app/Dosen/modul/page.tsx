"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
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
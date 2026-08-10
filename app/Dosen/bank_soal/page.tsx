"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/component/sidebar";
import { supabase } from "@/lib/supabaseClient";

type ModulCard = {
  id: number;
  title: string;
  badge: string;
  badgeColor: string;
  thumbnailUrl: string;
  href: string;
};

export default function BankSoalGrid() {
  const router = useRouter();
  const [modulCards, setModulCards] = useState<ModulCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadModules() {
      setLoading(true);

const { data, error } = await supabase.from("modul").select(`
        id_modul,
        nama_modul,
        id_level,
        thumbnail_url,
        status
      `).eq("status", true);
      if (error) {
        console.error("Supabase error:", error);
        setLoading(false);
        return;
      }

      const cards = (data ?? []).map((item: any, index: number) => {
        const idLevel = item.id_level;
        return {
          id: item.id_modul ?? index,
          title: item.nama_modul ?? `Modul ${index + 1}`,
          badge: idLevel === 1 ? "E" : idLevel === 2 ? "M" : "H",
          badgeColor:
            idLevel === 1
              ? "bg-green-500"
              : idLevel === 2
                ? "bg-yellow-500"
                : "bg-red-500",
          thumbnailUrl: item.thumbnail_url ?? "",
          href: "/Dosen/bank_soal/form_soal",
        };
      });

setModulCards(cards);
      setLoading(false);
    }

    loadModules();
  }, []);

  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <Sidebar activeLabel="Bank Soal" />

      {/* Main */}
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
            <button aria-label="Mail">
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

            <button aria-label="Notifications">
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

            <button aria-label="Profile">
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
        {loading ? (
          <div className="rounded-2xl border border-[#ececf3] bg-white p-10 text-center text-sm text-[#6a6580]">
            Memuat modul...
          </div>
) : modulCards.length === 0 ? (
          <div className="rounded-2xl border border-[#ececf3] bg-white p-10 text-center text-sm text-[#6a6580]">
            Tidak ada modul aktif yang tersedia.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {modulCards.map((card) => (
              <div
                key={card.id}
                className="flex h-[260px] flex-col overflow-hidden rounded-2xl border border-[#ececf3] bg-white shadow-sm"
              >
<div className="relative h-[110px] shrink-0 bg-[#ececf3]">
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
                </div>

                <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-6">
                  <h3 className="text-sm font-bold text-[#3d3466]">
                    {card.title}
                  </h3>

                  <button
                    onClick={() => router.push(card.href)}
                    className="mt-auto rounded-lg border border-[#e4e2ee] py-2 text-xs font-semibold text-[#6a6580] transition hover:bg-[#f7f6fb]"
                  >
                    Pilih Modul
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
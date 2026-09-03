"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DosenContainer from "@/components/layout/DosenContainer";

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

      const { data, error } = await supabase
        .from("modul")
        .select(`
          id_modul,
          nama_modul,
          id_level,
          thumbnail_url,
          status
        `)
        .eq("status", true);

      if (error) {
        console.error("Gagal mengambil data modul:", error);
        setLoading(false);
        return;
      }

      const cards: ModulCard[] = (data ?? [])
        .filter((item) => item.id_modul !== null)
        .map((item: any, index: number) => {
          const idLevel = item.id_level;
          const idModul = Number(item.id_modul);

          return {
            id: idModul,
            title: item.nama_modul ?? `Modul ${index + 1}`,
            badge: idLevel === 1 ? "E" : idLevel === 2 ? "M" : "H",
            badgeColor:
              idLevel === 1
                ? "bg-emerald-500"
                : idLevel === 2
                ? "bg-amber-400"
                : "bg-rose-500",
            thumbnailUrl: item.thumbnail_url ?? "",
            href: `/Dosen/bank_soal/form_soal?id_modul=${idModul}`,
          };
        });

      setModulCards(cards);
      setLoading(false);
    }

    loadModules();
  }, []);

  function handlePilihModul(card: ModulCard) {
    router.push(card.href);
  }

  return (
    <DosenContainer
      categoryTag="BANK SOAL"
      title="Pilih Modul Pembelajaran"
      subtitle="Pilih modul untuk menambah, mengedit, atau mengelola bank soal kuis."
    >
      {loading && (
        <div className="rounded-[28px] bg-white p-12 text-center text-sm font-semibold text-[#8b84a5] shadow-sm">
          Memuat daftar modul...
        </div>
      )}

      {!loading && modulCards.length === 0 && (
        <div className="rounded-[28px] bg-white p-12 text-center shadow-sm">
          <p className="text-base font-bold text-[#3d3466]">
            Tidak ada modul aktif yang tersedia.
          </p>
          <p className="mt-1 text-xs text-[#8b84a5]">
            Aktifkan atau buat modul terlebih dahulu untuk menambah bank soal.
          </p>
        </div>
      )}

      {!loading && modulCards.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modulCards.map((card) => (
            <div
              key={card.id}
              className="group flex h-[280px] flex-col overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-[#4a3f7a]/20"
            >
              {/* THUMBNAIL */}
              <div className="relative h-[120px] shrink-0 overflow-hidden bg-gradient-to-br from-[#4a3f7a] to-[#3d3466]">
                {card.thumbnailUrl ? (
                  <img
                    src={card.thumbnailUrl}
                    alt={card.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#c9c3e6]">
                      Syariah Quest Bank Soal
                    </span>
                  </div>
                )}

                {/* BADGE */}
                <div
                  className={`absolute -bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white text-sm font-black text-white shadow-md ${card.badgeColor}`}
                >
                  {card.badge}
                </div>
              </div>

              {/* CARD CONTENT */}
              <div className="flex flex-1 flex-col justify-between px-5 pb-5 pt-6">
                <div>
                  <h3 className="line-clamp-2 text-base font-bold leading-snug text-[#2b2540] group-hover:text-[#4a3f7a] transition">
                    {card.title}
                  </h3>
                  <span className="mt-1 inline-block text-xs font-semibold text-[#8b84a5]">
                    ID Modul: #{card.id}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handlePilihModul(card)}
                  className="w-full rounded-xl bg-[#4a3f7a] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#3d3466]"
                >
                  Kelola Soal Modul Ini
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DosenContainer>
  );
}

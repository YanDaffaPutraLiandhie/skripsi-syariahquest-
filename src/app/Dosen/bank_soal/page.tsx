
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import MiniProfile from "@/components/layout/MiniProfile";
import { supabase } from "@/lib/supabase";

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
        console.error("Gagal mengambil data modul:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

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

            badge:
              idLevel === 1
                ? "E"
                : idLevel === 2
                ? "M"
                : "H",

            badgeColor:
              idLevel === 1
                ? "bg-green-500"
                : idLevel === 2
                ? "bg-yellow-500"
                : "bg-red-500",

            thumbnailUrl: item.thumbnail_url ?? "",

            // PENTING:
            // ID modul dikirim ke halaman form soal
            href: `/Dosen/bank_soal/form_soal?id_modul=${idModul}`,
          };
        });

      console.log("Modul yang berhasil dimuat:", cards);

      setModulCards(cards);
      setLoading(false);
    }

    loadModules();
  }, []);

  function handlePilihModul(card: ModulCard) {
    console.log("Modul dipilih:", {
      id_modul: card.id,
      nama_modul: card.title,
    });

    router.push(card.href);
  }

  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <Sidebar activeLabel="Bank Soal" />

      <main className="flex-1 p-8">

        {/* =========================
            TOPBAR
        ========================== */}
       

        {/* =========================
            CONTENT
        ========================== */}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-[#ececf3] bg-white p-10 text-center text-sm text-[#6a6580]">
            Memuat modul...
          </div>
        )}

        {/* Empty */}
        {!loading && modulCards.length === 0 && (
          <div className="rounded-2xl border border-[#ececf3] bg-white p-10 text-center text-sm text-[#6a6580]">
            Tidak ada modul aktif yang tersedia.
          </div>
        )}

        {/* Grid */}
        {!loading && modulCards.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {modulCards.map((card) => (
              <div
                key={card.id}
                className="flex h-[260px] flex-col overflow-hidden rounded-2xl border border-[#ececf3] bg-white shadow-sm"
              >

                {/* =========================
                    THUMBNAIL
                ========================== */}
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

                  {/* Badge */}
                  <div
                    className={`absolute -bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white text-sm font-bold text-white ${card.badgeColor}`}
                  >
                    {card.badge}
                  </div>

                </div>

                {/* =========================
                    CARD CONTENT
                ========================== */}
                <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-6">

                  <h3 className="text-sm font-bold text-[#3d3466]">
                    {card.title}
                  </h3>

                  {/* ID Modul untuk debugging */}
                  <p className="text-xs text-gray-400">
                    ID Modul: {card.id}
                  </p>

                  <button
                    type="button"
                    onClick={() => handlePilihModul(card)}
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/component/sidebar";
import { supabase } from "@/lib/supabaseClient";

type KuisCard = {
  id: number;
  title: string;
  jumlahSoal: number;
};

export default function KuisPage() {
  const router = useRouter();
  const [kuisCards, setKuisCards] = useState<KuisCard[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Ambil semua kuis dari tabel quis
        const { data: quisData, error: quisError } = await supabase
          .from("quis")
          .select("id_quis, nama_kuis");

        if (quisError) {
          console.error("Supabase quis error:", quisError);
          return;
        }

        // Ambil detail_kuis untuk menghitung jumlah soal per kuis
        const { data: detailData, error: detailError } = await supabase
          .from("detail_kuis")
          .select("id_quis, id_soal");

        if (detailError) {
          console.error("Supabase detail_kuis error:", detailError);
          return;
        }

        // Hitung jumlah soal unik per kuis
        const soalCountMap: Record<number, Set<number>> = {};
        for (const d of detailData ?? []) {
          if (!soalCountMap[d.id_quis]) soalCountMap[d.id_quis] = new Set();
          soalCountMap[d.id_quis].add(d.id_soal);
        }

        const cards: KuisCard[] = (quisData ?? []).map(
          (q: { id_quis: number; nama_kuis: string }) => ({
            id: q.id_quis,
            title: q.nama_kuis ?? "Kuis",
            jumlahSoal: soalCountMap[q.id_quis]?.size ?? 0,
          }),
        );

        setKuisCards(cards);
      } catch (err) {
        console.error(err);
      }
    }

    load();
  }, []);

  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <Sidebar activeLabel="Kuis" />

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
          {/* Tambah Kuis */}
          <button
            onClick={() => setShowModal(true)}
            className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#ececf3] bg-[#f4f3f7] text-[#a3a0b5] hover:bg-[#eeedf5]"
          >
            <span className="text-4xl">+</span>
            <span className="text-sm font-medium">Tambah Kuis Baru</span>
          </button>

          {kuisCards.map((card) => (
            <div
              key={card.id}
              className="flex h-[300px] flex-col overflow-hidden rounded-2xl border border-[#ececf3] bg-white shadow-sm"
            >
              <div className="relative flex h-[110px] items-center justify-center bg-gradient-to-br from-amber-200 via-amber-100 to-orange-200">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl font-extrabold text-[#4a3f7a] shadow-sm">
                  ?
                </span>
              </div>

              <div className="flex flex-1 flex-col px-4 pb-4 pt-6">
                <h3 className="text-sm font-bold text-[#3d3466]">
                  {card.title}
                </h3>

                <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#9a96ad]">
                  <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                  {card.jumlahSoal} Soal
                </div>

                <div className="mt-auto">
                  <button className="w-full rounded-lg border border-[#e4e2ee] py-2 text-xs font-semibold hover:bg-[#f7f6fb]">
                    Lihat Kuis
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Pilih Cara Buat Kuis */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowModal(false)}
          >
            <div
              className="w-full max-w-md rounded-[24px] bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-1 text-center text-2xl font-extrabold text-[#3d3466]">
                Buat Kuis
              </h2>
              <p className="mb-6 text-center text-sm text-[#9a96ad]">
                Pilih cara untuk membuat kuis baru
              </p>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => router.push("/Dosen/kuis/pilih(modul)")}
                  className="rounded-2xl border border-[#e4e2ee] bg-[#f7f4ff] px-5 py-4 text-left transition hover:bg-[#ede8ff]"
                >
                  <p className="text-sm font-bold text-[#4a3f7a]">
                    Pilih Modul
                  </p>
                  <p className="mt-0.5 text-xs text-[#9a96ad]">
                    Generate soal otomatis dari modul
                  </p>
                </button>

                <button
                  onClick={() => router.push("/Dosen/kuis/pilih(manual)")}
                  className="rounded-2xl border border-[#e4e2ee] bg-[#f7f4ff] px-5 py-4 text-left transition hover:bg-[#ede8ff]"
                >
                  <p className="text-sm font-bold text-[#4a3f7a]">
                    Buat Kuis Manual
                  </p>
                  <p className="mt-0.5 text-xs text-[#9a96ad]">
                    Menyusun soal secara manual
                  </p>
                </button>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="mt-6 w-full rounded-full border border-[#e4e2ee] bg-white py-2.5 text-sm font-semibold text-[#4a3f7a] transition hover:bg-[#f8f7ff]"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

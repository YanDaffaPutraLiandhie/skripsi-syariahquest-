"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatDeadline, isPastDeadline } from "@/lib/deadline";
import DosenContainer from "@/components/layout/DosenContainer";
import { Plus, HelpCircle } from "lucide-react";

type KuisCard = {
  id: number;
  title: string;
  jumlahSoal: number;
  deadline: string | null;
};

export default function KuisPage() {
  const router = useRouter();
  const [kuisCards, setKuisCards] = useState<KuisCard[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const { data: quisData, error: quisError } = await supabase
          .from("quis")
          .select("id_quis, nama_kuis, deadline");

        if (quisError) {
          console.error("Supabase quis error:", quisError);
          setLoading(false);
          return;
        }

        const { data: detailData, error: detailError } = await supabase
          .from("detail_kuis")
          .select("id_quis, id_soal");

        if (detailError) {
          console.error("Supabase detail_kuis error:", detailError);
          setLoading(false);
          return;
        }

        const soalCountMap: Record<number, Set<number>> = {};
        for (const d of detailData ?? []) {
          if (!soalCountMap[d.id_quis]) soalCountMap[d.id_quis] = new Set();
          soalCountMap[d.id_quis].add(d.id_soal);
        }

        const cards: KuisCard[] = (quisData ?? []).map(
          (q: { id_quis: number; nama_kuis: string; deadline: string | null }) => ({
            id: q.id_quis,
            title: q.nama_kuis ?? "Kuis",
            jumlahSoal: soalCountMap[q.id_quis]?.size ?? 0,
            deadline: q.deadline ?? null,
          }),
        );

        setKuisCards(cards);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <DosenContainer
      categoryTag="EVALUASI & KUIS"
      title="Kelola Kuis Pembelajaran"
      subtitle="Buat kuis baru otomatis dari modul atau pilih secara manual untuk evaluasi mahasiswa."
    >
      {loading ? (
        <div className="rounded-[28px] bg-white p-12 text-center text-sm font-semibold text-[#8b84a5] shadow-sm">
          Memuat kuis...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* CARD BUAT KUIS */}
          <button
            onClick={() => setShowModal(true)}
            className="group flex h-[310px] flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-[#4a3f7a]/20 bg-white p-6 transition-all hover:border-[#4a3f7a] hover:bg-[#f8f7fd] hover:shadow-md"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f8f7fd] text-[#4a3f7a] ring-1 ring-[#4a3f7a]/10 group-hover:scale-110 transition">
              <Plus size={28} />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-[#3d3466]">Buat Kuis Baru</p>
              <p className="mt-1 text-xs font-medium text-[#8b84a5]">
                Generatif otomatis atau susun manual
              </p>
            </div>
          </button>

          {/* LIST KUIS */}
          {kuisCards.map((card) => {
            const late = isPastDeadline(card.deadline);

            return (
              <div
                key={card.id}
                className="group flex h-[310px] flex-col overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-[#4a3f7a]/20"
              >
                {/* TOP HEADER PATTERN */}
                <div className="relative flex h-[120px] shrink-0 items-center justify-center bg-gradient-to-br from-[#4a3f7a] to-[#3d3466]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-amber-300 backdrop-blur-sm border border-white/10 shadow-sm transition duration-300 group-hover:scale-105">
                    <HelpCircle size={28} />
                  </div>
                </div>

                {/* CARD CONTENT */}
                <div className="flex flex-1 flex-col justify-between px-5 pb-5 pt-5">
                  <div>
                    <h3 className="line-clamp-2 text-base font-bold text-[#2b2540] group-hover:text-[#4a3f7a] transition">
                      {card.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f8f7fd] px-3 py-1 text-xs font-bold text-[#4a3f7a]">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {card.jumlahSoal} Pertanyaan Soal
                      </div>

                      {card.deadline && (
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                            late
                              ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                              : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                          }`}
                        >
                          🗓 {formatDeadline(card.deadline)}
                          {late && " (lewat)"}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(`/Dosen/kuis/${card.id}`)}
                    className="w-full rounded-xl bg-[#4a3f7a] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#3d3466]"
                  >
                    Lihat & Kelola Kuis
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PILIH CARA BUAT KUIS */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-2xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-center text-2xl font-bold text-[#3d3466]">
              Pilih Metode Pembuatan
            </h2>
            <p className="mt-1 text-center text-xs font-medium text-[#8b84a5]">
              Tentukan bagaimana Anda ingin menyusun soal kuis baru
            </p>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => router.push("/Dosen/kuis/pilih(modul)")}
                className="w-full rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] p-4 text-left transition hover:border-[#4a3f7a] hover:bg-[#f0edf9]"
              >
                <p className="text-sm font-bold text-[#4a3f7a]">
                  ⚡ Generate Otomatis dari Modul
                </p>
                <p className="mt-1 text-xs text-[#8b84a5]">
                  Sistem memilih soal yang tersedia berdasarkan modul pembelajaran.
                </p>
              </button>

              <button
                onClick={() => router.push("/Dosen/kuis/pilih(manual)")}
                className="w-full rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] p-4 text-left transition hover:border-[#4a3f7a] hover:bg-[#f0edf9]"
              >
                <p className="text-sm font-bold text-[#4a3f7a]">
                  📝 Susun Kuis Secara Manual
                </p>
                <p className="mt-1 text-xs text-[#8b84a5]">
                  Pilih soal-soal spesifik dari bank soal secara bebas.
                </p>
              </button>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full rounded-full border border-[#e4e2ee] bg-white py-3 text-xs font-bold text-[#4a3f7a] hover:bg-[#f8f7fd] transition"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </DosenContainer>
  );
}
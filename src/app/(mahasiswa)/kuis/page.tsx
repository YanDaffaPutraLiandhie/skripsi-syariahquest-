"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import {
  KUIS_NILAI_MINIMAL,
  formatDeadline,
  isPastDeadline,
} from "@/lib/deadline";

type QuizDB = {
  id_quis: number;
  nama_kuis: string; // Mengikuti kolom di tabel databasemu
  deadline: string | null;
};

function DaftarKuisContent() {
  const [daftarKuis, setDaftarKuis] = useState<QuizDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  // 1. Fetch Data Kuis dari Supabase
  useEffect(() => {
    async function fetchKuis() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('quis')
          .select('id_quis, nama_kuis, deadline')
          .order('id_quis', { ascending: true });

        if (data && !error) {
          setDaftarKuis(data);
        } else {
          console.error("Gagal menarik data kuis:", error);
        }
      } catch (err) {
        console.error("Error tidak terduga:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchKuis();
  }, []);

  // 2. Logika Pencarian
  const filteredKuis = daftarKuis.filter((kuis) => {
    const namaKuis = kuis.nama_kuis ? kuis.nama_kuis.toLowerCase() : "";
    return namaKuis.includes(searchQuery);
  });

  return (
    <div className="space-y-8">
      {/* =====================================================
          HEADER BANNER
      ===================================================== */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] px-8 pb-8 pt-7 shadow-lg shadow-[#3d3466]/25 lg:px-10 lg:pb-10 lg:pt-8 mb-8">
        {/* Header Banner Background SVGs */}
        <div className="absolute right-[28%] top-6 h-5 w-5 text-white/40">✨</div>
        <div className="absolute right-[8%] top-10 h-4 w-4 text-[#f2c94c] animate-pulse">✨</div>

        {/* Banner Decorative Curved Lines */}
        <div className="pointer-events-none absolute -right-10 top-0 opacity-20">
          <svg width="300" height="200" viewBox="0 0 300 200" fill="none">
            <path d="M50 0 C 150 100, 200 50, 300 200" stroke="white" strokeWidth="3" strokeDasharray="6 6" />
            <circle cx="200" cy="80" r="40" stroke="#f2c94c" strokeWidth="2" />
          </svg>
        </div>

        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-[#e2dcff] backdrop-blur-md border border-white/15 shadow-inner">
            <span className="text-amber-300">✨</span>
            Evaluasi Pemahaman
          </span>

          <h1 className="mt-3 text-2xl font-black leading-snug text-white lg:text-3xl tracking-wide">
            Kuis Ujian
          </h1>

          {searchQuery ? (
            <p className="mt-1.5 text-sm text-[#c9c3e6] lg:text-base font-medium">
              Menampilkan hasil untuk pencarian:{" "}
              <span className="font-bold text-white">
                "{searchQuery}"
              </span>
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-[#c9c3e6] lg:text-base font-medium">
              Kerjakan ujian mandiri untuk menguji pemahamanmu dan raih XP tambahan!
            </p>
          )}
        </div>

        {/* Bottom Wave Decoration */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 opacity-20">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-full fill-white">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.94,130.83,121.3,201,115.8,241.6,112.5,282.6,98.2,321.39,56.44Z" />
          </svg>
        </div>
      </div>

      {/* TAMPILAN JIKA LOADING ATAU KOSONG */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-500 font-bold flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#5B5288] animate-spin" />
          Memuat Daftar Kuis...
        </div>
      ) : filteredKuis.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-700">Kuis tidak ditemukan</h3>
          <p className="text-gray-500">Belum ada kuis yang ditambahkan oleh dosen.</p>
        </div>
      ) : (
        /* GRID KARTU KUIS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredKuis.map((kuis) => {
            const late = isPastDeadline(kuis.deadline);

            return (
              <div
                key={kuis.id_quis}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col overflow-hidden group"
              >
                {/* GAMBAR THUMBNAIL */}
                <div className="relative h-48 w-full bg-[#E6E4F0]">
                  {/* Menggunakan pattern shapes dari dicebear agar otomatis dinamis & estetik */}
                  <img
                    src={`https://api.dicebear.com/7.x/shapes/svg?seed=quiz${kuis.id_quis}&backgroundColor=5B5288`}
                    alt={kuis.nama_kuis || `Kuis ${kuis.id_quis}`}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                </div>

                {/* KONTEN CARD */}
                <div className="p-5 pt-6 flex flex-col flex-1">
                  <h3 className="text-xl font-bold text-[#5B5288] line-clamp-2">
                    {kuis.nama_kuis || `Evaluasi Pemahaman #${kuis.id_quis}`}
                  </h3>

                  <div className="flex items-center gap-1 mt-1 text-[#D97706] font-bold text-sm mb-2">
                    <span>⚡ Kumpulkan XP Ujian</span>
                  </div>

                  {/* DEADLINE */}
                  {kuis.deadline && (
                    <div className="mb-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                          late
                            ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                            : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                        }`}
                      >
                        🗓 Deadline: {formatDeadline(kuis.deadline)}
                        {late && " (lewat)"}
                      </span>
                      {late && (
                        <p className="mt-2 text-[11px] font-medium leading-snug text-gray-500">
                          Deadline sudah lewat. Nilai yang lolos (minimal{" "}
                          {KUIS_NILAI_MINIMAL}%) akan dipatok ke {KUIS_NILAI_MINIMAL}%.
                          Nilai di bawahnya harus mengulang kuis.
                        </p>
                      )}
                    </div>
                  )}

                  {/* TOMBOL AKSI */}
                  <Link
                    href={`/kuis/${kuis.id_quis}`}
                    className="mt-auto w-full py-2.5 rounded-lg border border-[#5B5288]/50 text-[#5B5288] hover:bg-[#5B5288]/10 flex items-center justify-center gap-2 font-bold text-sm transition-all"
                  >
                    Kerjakan Kuis
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Fallback tampilan saat memuat search params
function KuisLoadingFallback() {
  return (
    <div className="text-center py-20 text-gray-500 font-bold flex flex-col items-center gap-3">
      <Loader2 className="w-10 h-10 text-[#5B5288] animate-spin" />
      Memuat Halaman Kuis...
    </div>
  );
}

// Export utama yang dibungkus Suspense Boundary
export default function DaftarKuisPage() {
  return (
    <Suspense fallback={<KuisLoadingFallback />}>
      <DaftarKuisContent />
    </Suspense>
  );
}
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getModuleAccess, getAdaptiveFeedback, type AdaptiveProgress } from "@/lib/adaptiveLearning";

type ModulDB = {
  id_modul: number;
  nama_modul: string;
  id_level: number;
  thumbnail_url: string;
  parameter_nilai: number;
  status: boolean; // BARU: Tambahan status aktif/nonaktif
};

type ProgressDB = AdaptiveProgress;

function ModulPembelajaranContent() {
  const [filter, setFilter] = useState("all");
  const [daftarModul, setDaftarModul] = useState<ModulDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressDB[]>([]);
  const { profile } = useCurrentUser();

  const searchParams = useSearchParams();

  const searchQuery =
    searchParams.get("q")?.toLowerCase().trim() || "";

  // =========================================================
  // AMBIL DATA MODUL
  // =========================================================
  useEffect(() => {
    let mounted = true;

    async function fetchModul() {
      try {
        const { data, error } = await supabase
          .from('modul')
          // Memanggil kolom tambahan: parameter_nilai dan status
          .select('id_modul, nama_modul, id_level, thumbnail_url, parameter_nilai, status')
          // Filter sakti: HANYA mengambil modul yang statusnya TRUE (Aktif)
          .eq('status', true); 

        if (error) {
          console.error(
            "Gagal menarik data modul:",
            error
          );
          return;
        }

        if (!mounted) return;

        setDaftarModul(data ?? []);

        if (profile?.idMahasiswa) {
          const { data: progressData } = await supabase
            .from("progress_modul")
            .select("id_modul, nilai, selesai")
            .eq("id_mahasiswa", profile.idMahasiswa);
          if (mounted) setProgress((progressData ?? []) as ProgressDB[]);
        }

      } catch (error) {
        console.error(
          "Terjadi kesalahan saat mengambil modul:",
          error
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchModul();

    return () => {
      mounted = false;
    };
  }, [profile?.idMahasiswa]);

  // =========================================================
  // LEVEL / DIFFICULTY
  // =========================================================
  const getDifficulty = (level: number) => {
    switch (Number(level)) {
      case 1:
        return {
          label: "E",
          name: "Easy",
          color: "bg-green-500",
          xp: 50,
        };

      case 2:
        return {
          label: "M",
          name: "Medium",
          color: "bg-yellow-500",
          xp: 100,
        };

      case 3:
        return {
          label: "H",
          name: "Hard",
          color: "bg-red-500",
          xp: 150,
        };

      default:
        return {
          label: "?",
          name: "Unknown",
          color: "bg-gray-500",
          xp: 0,
        };
    }
  };

  // =========================================================
  // FILTER MODUL
  // =========================================================
  const filteredModul = daftarModul.filter((modul) => {
    const diff = getDifficulty(modul.id_level);

    const matchCategory =
      filter === "all" ||
      diff.label === filter;

    const matchSearch =
      modul.nama_modul
        .toLowerCase()
        .includes(searchQuery);

    return matchCategory && matchSearch;
  });

  // =========================================================
  // LOADING
  // =========================================================
  if (isLoading) {
    return (
      <div className="text-center py-20 text-gray-500 font-bold">
        Memuat Modul... ⏳
      </div>
    );
  }

  // =========================================================
  // HALAMAN
  // =========================================================
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
            Modul Mahasiswa
          </span>

          <h1 className="mt-3 text-2xl font-black leading-snug text-white lg:text-3xl tracking-wide">
            Modul Pembelajaran
          </h1>

          {searchQuery ? (
            <p className="mt-1.5 text-sm text-[#c9c3e6] lg:text-base font-medium">
              Menampilkan hasil untuk pencarian:{" "}
              <span className="font-bold text-white">
                &quot;{searchQuery}&quot;
              </span>
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-[#c9c3e6] lg:text-base font-medium">
              Pilih modul yang ingin kamu kuasai dan kumpulkan XP-nya!
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

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end mb-6">
        {/* ===================================================
            FILTER
        =================================================== */}
        <div className="flex gap-2 rounded-xl border border-gray-100 bg-white p-1.5 shadow-sm">

          {[
            {
              key: "all",
              label: "Semua",
            },
            {
              key: "E",
              label: "Easy",
            },
            {
              key: "M",
              label: "Medium",
            },
            {
              key: "H",
              label: "Hard",
            },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                filter === f.key
                  ? "bg-[#5B5288] text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}

        </div>
      </div>

      {/* TAMPILAN JIKA MODUL LOADING ATAU TIDAK DITEMUKAN */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-500 font-bold">Memuat Modul... ⏳</div>
      ) : filteredModul.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-700">Modul tidak ditemukan</h3>
          <p className="text-gray-500">Coba cari dengan kata kunci lain atau belum ada modul yang aktif.</p>
        </div>
      ) : (

        /* ===================================================
            GRID MODUL
        =================================================== */
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">

          {filteredModul.map((modul) => {

            const diffInfo =
              getDifficulty(modul.id_level);
            const access = getModuleAccess(modul, daftarModul, progress);
            return (
              <div
                key={modul.id_modul}
                className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md"
              >

                {/* =================================================
                    THUMBNAIL
                ================================================= */}
                <div className="relative h-48 w-full bg-[#eceaf3]">

                  {modul.thumbnail_url ? (
                    <img
                      src={modul.thumbnail_url}
                      alt={modul.nama_modul}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#5B5288]">
                      <span className="text-sm font-semibold text-white/70">
                        Tidak ada thumbnail
                      </span>
                    </div>
                  )}

                  {/* BADGE LEVEL */}
                  <div
                    className={`absolute -bottom-5 left-4 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white text-xl font-bold text-white shadow-sm ${diffInfo.color}`}
                  >
                    {diffInfo.label}
                  </div>

                </div>

                {/* =================================================
                    CONTENT
                ================================================= */}
                <div className="flex flex-1 flex-col p-5 pt-8">

                  {/* NAMA MODUL */}
                  <h3 className="text-xl font-bold text-[#5B5288]">
                    {modul.nama_modul}
                  </h3>

                  {/* LEVEL */}
                  <p className="mt-1 text-xs font-semibold text-gray-400">
                    Level: {diffInfo.name}
                  </p>

                  {/* XP */}
                  <div className="mb-4 mt-2 flex items-center gap-1 text-sm font-bold text-[#D97706]">
                    <span>
                      ⚡ +{diffInfo.xp} XP
                    </span>
                  </div>

                  {/* BUTTON */}
                  {access.isUnlocked ? (
                    <Link
                      href={`/modul/${modul.id_modul}`}
                      className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg border border-[#5B5288]/50 py-2.5 text-sm font-bold text-[#5B5288] transition-all hover:bg-[#5B5288]/10"
                    >
                      Lihat Modul
                    </Link>
                  ) : (
                    <div className="mt-auto rounded-lg bg-gray-100 px-3 py-2.5 text-center text-xs font-bold text-gray-500" title={access.reason}>
                      Terkunci · butuh {access.requiredScore}%
                    </div>
                  )}

                  <p className="mt-2 text-center text-[11px] font-medium text-gray-400">
                    {access.isUnlocked ? getAdaptiveFeedback(access.masteryScore) : access.reason}
                  </p>

                </div>
              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}

// =============================================================
// FALLBACK SUSPENSE
// =============================================================
function ModulLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
        <p className="font-semibold text-gray-500">
          Memuat Modul... ⏳
        </p>
      </div>
    </div>
  );
}

// =============================================================
// PAGE
// =============================================================
export default function ModulPembelajaran() {
  return (
    <Suspense fallback={<ModulLoading />}>
      <ModulPembelajaranContent />
    </Suspense>
  );
}
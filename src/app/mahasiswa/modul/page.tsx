"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Star,
  Trophy,
  Zap,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getModuleAccess, getAdaptiveFeedback, type AdaptiveProgress } from "@/lib/adaptiveLearning";
import { formatDeadline, isPastDeadline } from "@/lib/deadline";
import { getStatusBatch, type ModulBadgeInfo } from "@/lib/remedial";

type ModulDB = {
  id_modul: number;
  nama_modul: string;
  id_level: number;
  thumbnail_url: string;
  parameter_nilai: number;
  status: boolean;
  deadline: string | null;
};

type ProgressDB = AdaptiveProgress;

function ModulPembelajaranContent() {
  const [filter, setFilter] = useState("all");
  const [daftarModul, setDaftarModul] = useState<ModulDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressDB[]>([]);
  const [statusBadges, setStatusBadges] = useState<Record<number, ModulBadgeInfo>>({});
  const { profile } = useCurrentUser();

  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase().trim() || "";

  // =========================================================
  // AMBIL DATA MODUL
  // =========================================================
  useEffect(() => {
    let mounted = true;

    async function fetchModul() {
      try {
        const { data, error } = await supabase
          .from("modul")
          .select("id_modul, nama_modul, id_level, thumbnail_url, parameter_nilai, status, deadline")
          .eq("status", true);

        if (error) {
          console.error("Gagal menarik data modul:", error);
          return;
        }

        if (!mounted) return;
        setDaftarModul(data ?? []);

        if (profile?.idMahasiswa) {
          const [progressRes, badgesRes] = await Promise.all([
            supabase
              .from("progress_modul")
              .select("id_modul, nilai, selesai")
              .eq("id_mahasiswa", profile.idMahasiswa),
            getStatusBatch(
              profile.idMahasiswa,
              (data ?? []).map((m) => ({ id_modul: m.id_modul, parameter_nilai: m.parameter_nilai })),
            ).catch(() => ({} as Record<number, ModulBadgeInfo>)),
          ]);
          if (mounted) {
            setProgress((progressRes.data ?? []) as ProgressDB[]);
            setStatusBadges(badgesRes);
          }
        }
      } catch (error) {
        console.error("Terjadi kesalahan saat mengambil modul:", error);
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
  // TINGKAT KESULITAN
  // =========================================================
  const getDifficulty = (level: number) => {
    switch (Number(level)) {
      case 1:
        return {
          key: "1",
          label: "Dasar",
          name: "Mudah",
          stars: 1,
          badgeColor: "bg-emerald-500",
          pillBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          xp: 20,
        };
      case 2:
        return {
          key: "2",
          label: "Menengah",
          name: "Sedang",
          stars: 2,
          badgeColor: "bg-amber-500",
          pillBg: "bg-amber-50 text-amber-800 border-amber-200",
          xp: 50,
        };
      case 3:
        return {
          key: "3",
          label: "Lanjut",
          name: "Sulit",
          stars: 3,
          badgeColor: "bg-rose-500",
          pillBg: "bg-rose-50 text-rose-800 border-rose-200",
          xp: 100,
        };
      default:
        return {
          key: "0",
          label: "Umum",
          name: "Umum",
          stars: 1,
          badgeColor: "bg-purple-500",
          pillBg: "bg-purple-50 text-purple-800 border-purple-200",
          xp: 30,
        };
    }
  };

  // =========================================================
  // STATISTIK PEMBELAJARAN
  // =========================================================
  const stats = useMemo(() => {
    const totalModul = daftarModul.length;
    const completedCount = Object.values(statusBadges).filter((b) => b.status === "lulus").length;
    const remedialCount = Object.values(statusBadges).filter((b) => b.status === "gagal").length;
    const totalXp = daftarModul
      .filter((m) => statusBadges[m.id_modul]?.status === "lulus")
      .reduce((acc, m) => acc + getDifficulty(m.id_level).xp, 0);

    const completionRate = totalModul > 0 ? Math.round((completedCount / totalModul) * 100) : 0;

    return {
      totalModul,
      completedCount,
      remedialCount,
      totalXp,
      completionRate,
    };
  }, [daftarModul, statusBadges]);

  // =========================================================
  // FILTER MODUL
  // =========================================================
  const filteredModul = daftarModul.filter((modul) => {
    const diff = getDifficulty(modul.id_level);
    const matchCategory = filter === "all" || diff.key === filter;
    const matchSearch = modul.nama_modul.toLowerCase().includes(searchQuery);
    return matchCategory && matchSearch;
  });

  // =========================================================
  // LOADING
  // =========================================================
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <div className="relative">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#5B5288]/20 border-t-[#5B5288]" />
          <Sparkles className="absolute inset-0 m-auto h-5 w-5 animate-pulse text-[#FBBF24]" />
        </div>
        <p className="text-sm font-bold text-gray-500">Memuat Modul Pembelajaran... ⏳</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* =====================================================
          HEADER BANNER MODUL PEMBELAJARAN
      ===================================================== */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] p-6 text-white shadow-xl shadow-[#3d3466]/25 sm:p-8 lg:p-10">
        {/* Dekorasi Visual */}
        <div className="pointer-events-none absolute right-[25%] top-6 h-5 w-5 text-white/30">✨</div>
        <div className="pointer-events-none absolute right-[8%] top-10 h-4 w-4 animate-pulse text-[#f2c94c]">
          ✨
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3.5 py-1 text-xs font-black text-[#e2dcff] shadow-inner backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Kurikulum Mahasiswa
            </span>

            {stats.completedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                {stats.completedCount} dari {stats.totalModul} Selesai
              </span>
            )}
          </div>

          <h1 className="text-2xl font-black leading-snug tracking-wide text-white sm:text-3xl lg:text-4xl">
            Modul Pembelajaran
          </h1>

          <p className="mt-2 max-w-2xl text-xs sm:text-sm font-medium text-[#c9c3e6] leading-relaxed">
            {searchQuery
              ? `Menampilkan hasil pencarian untuk "${searchQuery}"`
              : "Pelajari materi pembelajaran, uji pemahaman melalui kuis evaluasi, dan kumpulkan poin XP untuk meningkatkan pencapaian belajarmu."}
          </p>

          {/* ===================================================
              STATISTIK KELULUSAN (GAMIFIED STATS HUD)
          =================================================== */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3.5 backdrop-blur-md">
              <span className="text-[11px] font-bold text-purple-200 flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5 text-purple-300" />
                Total Modul
              </span>
              <p className="mt-1 text-xl font-black text-white">{stats.totalModul}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-3.5 backdrop-blur-md">
              <span className="text-[11px] font-bold text-purple-200 flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                Modul Tuntas
              </span>
              <p className="mt-1 text-xl font-black text-amber-300">{stats.completedCount}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-3.5 backdrop-blur-md">
              <span className="text-[11px] font-bold text-purple-200 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-yellow-400" />
                XP Diperoleh
              </span>
              <p className="mt-1 text-xl font-black text-yellow-300">+{stats.totalXp} XP</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-3.5 backdrop-blur-md">
              <span className="text-[11px] font-bold text-purple-200 flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-emerald-400" />
                Tingkat Selesai
              </span>
              <p className="mt-1 text-xl font-black text-emerald-300">{stats.completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          FILTER & KATEGORI TINGKAT
      ===================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#3D2C6D]">Daftar Materi Modul</h2>
          <p className="text-xs text-gray-500 font-medium">
            Pilih modul sesuai urutan atau tingkat materi yang diinginkan
          </p>
        </div>

        {/* Filter Tingkat */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm">
          {[
            { key: "all", label: "Semua Tingkat" },
            { key: "1", label: "Mudah", stars: 1, color: "text-emerald-600" },
            { key: "2", label: "Sedang", stars: 2, color: "text-amber-600" },
            { key: "3", label: "Sulit", stars: 3, color: "text-rose-600" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                filter === f.key
                  ? "bg-[#5B5288] text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {f.stars && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: f.stars }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        filter === f.key ? "fill-white text-white" : "fill-amber-400 text-amber-400"
                      }`}
                    />
                  ))}
                </div>
              )}
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================
          GRID MODUL PEMBELAJARAN
      ===================================================== */}
      {filteredModul.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-[#5B5288]">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-black text-gray-800">Modul Tidak Ditemukan</h3>
          <p className="mt-1 text-xs text-gray-500">
            Coba cari dengan kata kunci lain atau pilih filter tingkat yang berbeda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredModul.map((modul) => {
            const diffInfo = getDifficulty(modul.id_level);
            const access = getModuleAccess(modul, daftarModul, progress);
            const late = isPastDeadline(modul.deadline);
            const statusInfo = statusBadges[modul.id_modul];
            const isCompleted = statusInfo?.status === "lulus";
            const isFailed = statusInfo?.status === "gagal";

            return (
              <div
                key={modul.id_modul}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-purple-200"
              >
                {/* =================================================
                    THUMBNAIL MODUL
                ================================================= */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  {modul.thumbnail_url ? (
                    <img
                      src={modul.thumbnail_url}
                      alt={modul.nama_modul}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#4a3f7a] to-[#2a224d]">
                      <BookOpen className="h-10 w-10 text-white/30" />
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

                  {/* Badge Bintang Tingkat (Bottom-Left) */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-xl bg-black/60 px-3 py-1 text-xs font-black text-white backdrop-blur-md border border-white/20 shadow-sm">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: diffInfo.stars }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span>{diffInfo.name}</span>
                  </div>

                  {/* Status Badge (Top-Right) */}
                  <div className="absolute top-3 right-3">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-black text-white shadow-sm backdrop-blur-md">
                        <CheckCircle2 className="h-3 w-3" />
                        Tuntas ({statusInfo.best}%)
                      </span>
                    ) : isFailed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-3 py-1 text-[11px] font-black text-white shadow-sm backdrop-blur-md animate-pulse">
                        <AlertCircle className="h-3 w-3" />
                        Perlu Remedial
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* =================================================
                    ISI KARTU MODUL
                ================================================= */}
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  {/* Judul Modul */}
                  <h3 className="text-lg font-black text-[#3D2C6D] leading-snug group-hover:text-[#5B5288] transition-colors mb-3">
                    {modul.nama_modul}
                  </h3>

                  {/* Indikator Poin & Batas Kelulusan */}
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-amber-800">
                      <Zap className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      +{diffInfo.xp} XP
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 border border-purple-200 px-2.5 py-1 text-[#5B5288]">
                      <Target className="h-3.5 w-3.5 text-purple-600" />
                      Batas Lulus: {modul.parameter_nilai ?? 80}%
                    </span>
                  </div>

                  {/* Info Batas Waktu */}
                  {modul.deadline && (
                    <div
                      className={`mb-4 flex items-center gap-1.5 text-xs font-semibold ${
                        late ? "text-rose-600" : "text-sky-700"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Batas: {formatDeadline(modul.deadline)}
                        {late && " (lewat)"}
                      </span>
                    </div>
                  )}

                  {/* Tombol Aksi */}
                  <div className="mt-auto pt-2">
                    {access.isUnlocked ? (
                      <Link
                        href={`/mahasiswa/modul/${modul.id_modul}`}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition-all ${
                          isFailed
                            ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                            : isCompleted
                            ? "border-2 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50"
                            : "bg-[#5B5288] hover:bg-[#4A4172] text-white shadow-md shadow-[#5B5288]/20"
                        }`}
                      >
                        <span>
                          {isFailed
                            ? "Pelajari Remedial"
                            : isCompleted
                            ? "Lihat Materi (Tuntas)"
                            : "Buka Modul"}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <div
                        className="rounded-xl bg-gray-100 px-4 py-3 text-center text-xs font-bold text-gray-500"
                        title={access.reason}
                      >
                        🔒 Terkunci · Syarat Nilai {access.requiredScore}%
                      </div>
                    )}

                    <p className="mt-2 text-center text-[11px] font-medium text-gray-400">
                      {access.isUnlocked
                        ? getAdaptiveFeedback(access.masteryScore)
                        : access.reason}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ModulPembelajaran() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
            <p className="font-bold text-gray-500">Memuat Modul... ⏳</p>
          </div>
        </div>
      }
    >
      <ModulPembelajaranContent />
    </Suspense>
  );
}
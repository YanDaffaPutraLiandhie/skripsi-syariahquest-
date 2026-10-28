"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  CheckCircle2,
  ArrowLeft,
  BookOpen,
  Brain,
  Sparkles,
  Trophy,
  Target,
  LockKeyhole,
  ChevronDown,
  ChevronRight,
  FileText,
  Zap,
  AlertCircle,
  Clock,
  Star,
  Compass,
} from "lucide-react";
import Quiz from "@/components/Quis/page";
import RemedialPanel from "@/components/Modul/RemedialPanel";
import RichMateriReader from "@/components/Modul/RichMateriReader";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getModuleAccess, type AdaptiveModule, type AdaptiveProgress } from "@/lib/adaptiveLearning";
import { applyDeadlineScore, formatDeadline, isPastDeadline } from "@/lib/deadline";
import { getModulState, submitAttemptModul, type ModulState } from "@/lib/remedial";
import { getSubTopikModul, type SubTopik } from "@/lib/subTopik";

type DetailModulDB = {
  id_modul: number;
  nama_modul: string;
  video_url: string;
  teks_materi: string;
  dokumen_pendukung: string | null;
  id_level: number;
  parameter_nilai: number | null;
  deadline: string | null;
};

type ResultNotice = {
  type: "success" | "warning";
  text: string;
};

function getYouTubeEmbedUrl(url: string) {
  if (!url) return null;
  if (url.includes("youtube.com/embed/")) return url;

  let videoId = "";
  if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split("?")[0];
  } else if (url.includes("youtube.com/watch")) {
    videoId = new URL(url).searchParams.get("v") || "";
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

export default function ModulDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { profile } = useCurrentUser();

  const [course, setCourse] = useState<DetailModulDB | null>(null);
  const [subTopikList, setSubTopikList] = useState<SubTopik[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"materi" | "kuis" | "remedial">("materi");
  const [selectedSubTopikId, setSelectedSubTopikId] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [accessReason, setAccessReason] = useState("");
  const [resultNotice, setResultNotice] = useState<ResultNotice | null>(null);
  const [modulState, setModulState] = useState<ModulState | null>(null);

  // State expand/collapse untuk sub-item Daftar Isi
  const [expandedSections, setExpandedSections] = useState<{
    materi: boolean;
    kuis: boolean;
    remedial: boolean;
  }>({
    materi: true,
    kuis: true,
    remedial: true,
  });

  const toggleSection = (key: "materi" | "kuis" | "remedial") => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchModulState = useCallback(async () => {
    if (!profile?.idMahasiswa || !id) return;
    try {
      const st = await getModulState(profile.idMahasiswa, Number(id));
      setModulState(st);
    } catch (err) {
      console.error("Gagal memuat state remedial modul:", err);
    }
  }, [id, profile?.idMahasiswa]);

  useEffect(() => {
    fetchModulState();
  }, [fetchModulState]);

  useEffect(() => {
    let isMounted = true;

    async function fetchDetail() {
      const [modulRes, subRes] = await Promise.all([
        supabase.from("modul").select("*").eq("id_modul", id).single(),
        getSubTopikModul(Number(id)).catch(() => [] as SubTopik[]),
      ]);

      const modulData = modulRes.data;

      if (modulData && isMounted) {
        setCourse(modulData);
        setSubTopikList(subRes);
      }

      if (modulData && profile?.idMahasiswa && isMounted) {
        const [{ data: modules }, { data: progress }] = await Promise.all([
          supabase.from("modul").select("id_modul, id_level, parameter_nilai"),
          supabase
            .from("progress_modul")
            .select("id_modul, nilai, selesai")
            .eq("id_mahasiswa", profile.idMahasiswa),
        ]);
        const access = getModuleAccess(
          modulData as AdaptiveModule,
          (modules ?? []) as AdaptiveModule[],
          (progress ?? []) as AdaptiveProgress[],
        );
        setIsUnlocked(access.isUnlocked);
        setAccessReason(access.reason);
      }

      if (profile?.idMahasiswa && isMounted) {
        const { data: progData } = await supabase
          .from("progress_modul")
          .select("nilai, selesai")
          .eq("id_modul", id)
          .eq("id_mahasiswa", profile.idMahasiswa)
          .single();

        if (progData && progData.selesai && isMounted) {
          setQuizScore(progData.nilai);
        }
      }

      if (isMounted) setIsLoading(false);
    }

    fetchDetail();

    return () => {
      isMounted = false;
    };
  }, [id, profile?.idMahasiswa]);

  // Pengaman: membuka materi saja tidak memberikan nilai
  useEffect(() => {
    async function markMateriViewed() {
      if (course && profile?.idMahasiswa && activeTab === "materi") {
        const teksMateriBersih = course.teks_materi
          ? course.teks_materi.replace(/<[^>]*>?/gm, "").trim()
          : "";
        const adaVideo = course.video_url && course.video_url.trim() !== "";
        const adaTeks = teksMateriBersih !== "";

        const adaIsiMateri = adaVideo || adaTeks;
        if (!adaIsiMateri) return;

        const { data: existingProgress } = await supabase
          .from("progress_modul")
          .select("id_modul, kuis_dicoba")
          .eq("id_mahasiswa", profile.idMahasiswa)
          .eq("id_modul", course.id_modul)
          .single();

        if (!existingProgress) {
          await supabase.from("progress_modul").insert({
            id_mahasiswa: profile.idMahasiswa,
            id_modul: course.id_modul,
            materi_dilihat: true,
            kuis_dicoba: false,
            selesai: false,
            nilai: 0,
          });
        } else {
          const updatePayload: { materi_dilihat: boolean; nilai?: number } = {
            materi_dilihat: true,
          };

          if (!existingProgress.kuis_dicoba) {
            updatePayload.nilai = 0;
          }

          await supabase
            .from("progress_modul")
            .update(updatePayload)
            .eq("id_mahasiswa", profile.idMahasiswa)
            .eq("id_modul", course.id_modul);
        }
      }
    }
    markMateriViewed();
  }, [course, profile?.idMahasiswa, activeTab]);

  // Penanganan hasil kuis
  async function handleSubmitAttempt(score: number) {
    if (!course) return;

    const minScore = course.parameter_nilai ?? 80;
    const result = applyDeadlineScore(score, minScore, course.deadline);

    let xp = 0;
    let eloDelta: number | undefined;
    let eloAfter: number | undefined;

    if (profile?.idMahasiswa) {
      try {
        const r = await submitAttemptModul(profile.idMahasiswa, course.id_modul, result.finalScore);
        xp = r.xpDidapat;
        eloDelta = r.eloDelta;
        eloAfter = r.eloSesudah;
        await fetchModulState();
      } catch (err) {
        console.error("Gagal submit attempt modul via RPC:", err);
      }
    }

    if (!result.passed) {
      if (profile?.idMahasiswa) {
        const { error } = await supabase
          .from("progress_modul")
          .update({ selesai: false })
          .eq("id_mahasiswa", profile.idMahasiswa)
          .eq("id_modul", course.id_modul);

        if (error) console.error("Gagal memperbarui status kuis:", error);
      }

      setResultNotice({
        type: "warning",
        text: `Nilaimu belum mencapai batas minimal ${minScore}%. Pelajari materi remedial yang telah disiapkan sebelum mengulang kuis.`,
      });
    } else {
      if (profile?.idMahasiswa) {
        const { error } = await supabase
          .from("progress_modul")
          .update(
            result.wasCapped
              ? { selesai: true, nilai: result.finalScore }
              : { selesai: true },
          )
          .eq("id_mahasiswa", profile.idMahasiswa)
          .eq("id_modul", course.id_modul);

        if (error) console.error("Gagal memperbarui progres modul:", error);
      }

      setResultNotice(
        result.wasCapped
          ? {
            type: "success",
            text: `Kamu lulus, namun pengerjaan melewati batas waktu. Nilai akhir dicatat sebagai batas minimal (${minScore}%).`,
          }
          : null,
      );
      setQuizScore(result.finalScore);
    }

    return { xp, eloDelta, eloAfter };
  }

  const scrollToSection = (sectionId: string) => {
    setActiveTab("materi");
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
  };

  const getDifficulty = (level?: number) => {
    switch (Number(level)) {
      case 1:
        return {
          rankName: "Tingkat Dasar",
          name: "Mudah",
          stars: 1,
          colorBadge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
          xp: 20,
        };
      case 2:
        return {
          rankName: "Tingkat Menengah",
          name: "Sedang",
          stars: 2,
          colorBadge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          xp: 50,
        };
      case 3:
        return {
          rankName: "Tingkat Lanjut",
          name: "Sulit",
          stars: 3,
          colorBadge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
          xp: 100,
        };
      default:
        return {
          rankName: "Tingkat Umum",
          name: "Umum",
          stars: 1,
          colorBadge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
          xp: 30,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 text-center">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#5B5288]/20 border-t-[#FBBF24]" />
          <Sparkles className="absolute inset-0 m-auto h-6 w-6 animate-pulse text-[#FBBF24]" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-black tracking-wide text-[#3D2C6D]">
            MEMUAT MATERI PEMBELAJARAN...
          </p>
          <p className="text-xs font-semibold text-gray-400">
            Menyiapkan materi modul dan kuis evaluasi
          </p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[#3D2C6D]">Modul Tidak Ditemukan</h2>
          <p className="text-sm text-gray-500">Materi ini mungkin belum tersedia atau telah dipindahkan.</p>
        </div>
        <button
          onClick={() => router.push("/mahasiswa/modul")}
          className="flex items-center gap-2 rounded-xl bg-[#5B5288] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#4A4172]"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Modul
        </button>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-3xl border border-amber-200 bg-gradient-to-b from-white to-amber-50/50 p-10 text-center shadow-lg">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100/80 text-4xl shadow-inner border border-amber-300/60">
          🔒
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-black text-white">
            !
          </span>
        </div>
        <div className="space-y-1.5">
          <span className="inline-block rounded-full bg-amber-100 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-800">
            Akses Terkunci
          </span>
          <h1 className="text-2xl font-black text-[#3D2C6D]">Modul Belum Terbuka</h1>
          <p className="text-sm text-gray-600 leading-relaxed">{accessReason}</p>
        </div>
        <button
          onClick={() => router.push("/mahasiswa/modul")}
          className="mt-2 flex items-center gap-2 rounded-xl bg-[#5B5288] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#4A4172]"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Modul
        </button>
      </div>
    );
  }

  const diff = getDifficulty(course.id_level);
  const paragraphs = course.teks_materi
    ? course.teks_materi.split("\n").filter((p) => p.trim() !== "")
    : [];
  const embedUrl = course.video_url ? getYouTubeEmbedUrl(course.video_url) : null;
  const isPdfDocument = course.dokumen_pendukung?.toLowerCase().includes(".pdf");
  const minScore = course.parameter_nilai ?? 80;
  const deadlineLate = isPastDeadline(course.deadline);

  // Perhitungan progres pembelajaran modul
  const isPassed = quizScore !== null && quizScore >= minScore;
  const isRemedialNeeded = modulState?.status === "remedial";
  const isRemedialDone =
    modulState?.status === "retake" ||
    Boolean(modulState?.remedial.length && modulState.remedial.every((r) => r.selesai));

  const progressPercent = isPassed
    ? 100
    : quizScore !== null
      ? isRemedialDone
        ? 80
        : 50
      : 30;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-start lg:gap-8">
      {/* =====================================================
          AREA KIRI (KONTEN MODUL)
      ===================================================== */}
      <div className="min-w-0 flex-1">
        {/* Tombol Kembali */}
        <button
          onClick={() => router.push("/mahasiswa/modul")}
          className="group mb-4 inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#5B5288] transition hover:text-[#3D2C6D]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Kembali ke Daftar Modul</span>
        </button>

        {/* =====================================================
            HEADER BANNER MODUL (GAMIFIED CARD)
        ===================================================== */}
        <div className="relative mb-6 overflow-hidden rounded-[26px] border border-amber-500/25 bg-gradient-to-br from-[#2D1B4E] via-[#24173F] to-[#170E2B] p-6 text-white shadow-2xl shadow-[#2D1B4E]/30 lg:p-8">
          {/* Ambient Glow Efek Visual */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-52 w-52 rounded-full bg-amber-500/15 blur-3xl" />

          {/* Badges Info Modul */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-300 shadow-sm backdrop-blur-md">
                <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
                Modul Pembelajaran
              </span>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm ${diff.colorBadge}`}
              >
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: diff.stars }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-300 text-amber-300" />
                  ))}
                </div>
                {diff.rankName} • {diff.name}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[11px] font-black text-yellow-300 shadow-sm">
                <Zap className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                +{diff.xp} XP Penyelesaian
              </span>
            </div>

            {/* Pita Status Pembelajaran */}
            <div className="shrink-0">
              {isPassed ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-black text-emerald-300 shadow-sm shadow-emerald-500/20">
                  <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                  MODUL TUNTAS ({quizScore}%)
                </span>
              ) : isRemedialNeeded ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/20 px-3.5 py-1.5 text-xs font-black text-rose-300 shadow-sm animate-pulse">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                  PERLU REMEDIAL
                </span>
              ) : isRemedialDone ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-500/20 px-3.5 py-1.5 text-xs font-black text-sky-300 shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
                  SIAP ULANGI KUIS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-purple-400/30 bg-purple-500/20 px-3.5 py-1.5 text-xs font-black text-purple-200 shadow-sm">
                  <BookOpen className="h-3.5 w-3.5 text-purple-300" />
                  SEDANG DIPELAJARI
                </span>
              )}
            </div>
          </div>

          {/* Judul & Deskripsi */}
          <div className="relative z-10 mb-6">
            <h1 className="text-2xl font-black tracking-wide text-white drop-shadow-md sm:text-3xl lg:text-4xl">
              {course.nama_modul}
            </h1>
            <p className="mt-2 text-xs sm:text-sm font-medium text-purple-200/80 max-w-2xl leading-relaxed">
              Pelajari konsep materi, selesaikan seluruh penjelasan konsep, kerjakan kuis evaluasi dengan batas nilai minimal {minScore}%, dan raih tambahan XP untuk meningkatkan profil belajarmu.
            </p>
          </div>

          {/* Jalur Progres Modul */}
          <div className="relative z-10 rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
              <span className="font-bold text-purple-200 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-amber-400" />
                Progres Pembelajaran Modul
              </span>
              <span className="font-black text-amber-300">{progressPercent}% Selesai</span>
            </div>

            {/* Bar Progres */}
            <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 transition-all duration-700 shadow-sm shadow-amber-400/50"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Tahapan Pembelajaran */}
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] sm:text-xs">
              <div className="flex items-center justify-center gap-1.5 text-emerald-300 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">1. Pelajari Materi</span>
              </div>
              <div
                className={`flex items-center justify-center gap-1.5 font-bold ${isPassed
                  ? "text-emerald-300"
                  : quizScore !== null
                    ? "text-amber-300"
                    : "text-purple-300/70"
                  }`}
              >
                {isPassed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Target className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                )}
                <span className="truncate">2. Kuis Evaluasi ({minScore}%)</span>
              </div>
              <div
                className={`flex items-center justify-center gap-1.5 font-bold ${isPassed
                  ? "text-purple-300/70"
                  : isRemedialNeeded
                    ? "text-rose-400 animate-pulse"
                    : isRemedialDone
                      ? "text-sky-300"
                      : "text-purple-300/50"
                  }`}
              >
                <Brain className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">3. Pembelajaran Remedial</span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            BANNER BATAS WAKTU (DEADLINE)
        ===================================================== */}
        {course.deadline && (
          <div
            className={`mb-6 flex items-start gap-3 rounded-2xl p-4 text-xs sm:text-sm font-bold ring-1 transition-all ${deadlineLate
              ? "bg-amber-50 text-amber-900 ring-amber-300"
              : "bg-sky-50 text-sky-900 ring-sky-300"
              }`}
          >
            <Clock className={`h-5 w-5 shrink-0 mt-0.5 ${deadlineLate ? "text-amber-600" : "text-sky-600"}`} />
            <div>
              {deadlineLate ? (
                <>
                  <span className="font-black text-amber-950">
                    Batas Pengerjaan Lewat: {formatDeadline(course.deadline)}.
                  </span>{" "}
                  Nilai kuis jika mencapai {minScore}% ke atas akan dicatat sebagai {minScore}%.
                </>
              ) : (
                <>
                  <span className="font-black text-sky-950">
                    Batas Pengerjaan: {formatDeadline(course.deadline)}.
                  </span>{" "}
                  Selesaikan kuis tepat waktu agar nilaimu tercatat penuh sesuai pencapaian.
                </>
              )}
            </div>
          </div>
        )}

        {/* =====================================================
            NOTIFIKASI HASIL KUIS
        ===================================================== */}
        {resultNotice && (
          <div
            className={`mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl p-4 text-sm font-bold ring-1 ${resultNotice.type === "warning"
              ? "bg-rose-50 text-rose-800 ring-rose-200"
              : "bg-emerald-50 text-emerald-800 ring-emerald-200"
              }`}
          >
            <div className="flex items-center gap-2.5">
              {resultNotice.type === "warning" ? (
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              )}
              <span>{resultNotice.text}</span>
            </div>

            {resultNotice.type === "warning" && (
              <button
                type="button"
                onClick={() => setActiveTab("remedial")}
                className="shrink-0 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-rose-700"
              >
                Buka Remedial →
              </button>
            )}
          </div>
        )}

        {/* =====================================================
            TABS NAVIGASI UTAMA
        ===================================================== */}
        <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("materi")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-black transition-all ${activeTab === "materi"
              ? "bg-gradient-to-r from-[#4A3F7A] to-[#3D2C6D] text-white shadow-md shadow-[#3D2C6D]/20"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">Materi Pembelajaran</span>
          </button>


          <button
            type="button"
            onClick={() => {
              if (isRemedialNeeded) {
                setActiveTab("remedial");
                return;
              }

              setActiveTab("kuis");
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-black transition-all ${activeTab === "kuis"
              ? "bg-gradient-to-r from-[#4A3F7A] to-[#3D2C6D] text-white shadow-md shadow-[#3D2C6D]/20"
              : isRemedialNeeded
                ? "cursor-not-allowed text-gray-400 opacity-70"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
          >
            {isRemedialNeeded ? (
              <span className="shrink-0 text-sm" aria-label="Terkunci">
                🔒
              </span>
            ) : (
              <Target className="h-4 w-4 shrink-0" />
            )}

            <span className="truncate">Kuis Evaluasi</span>

            {quizScore !== null && (
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black ${quizScore >= minScore
                  ? "bg-emerald-500 text-white"
                  : "bg-rose-500 text-white"
                  }`}
              >
                {quizScore}%
              </span>
            )}
          </button>


          <button
            type="button"
            onClick={() => setActiveTab("remedial")}
            className={`relative flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-black transition-all ${activeTab === "remedial"
              ? "bg-gradient-to-r from-[#4A3F7A] to-[#3D2C6D] text-white shadow-md shadow-[#3D2C6D]/20"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
          >
            <Brain className="h-4 w-4 shrink-0" />
            <span className="truncate">Remedial</span>
            {modulState?.status === "remedial" && (
              <span className="flex h-2.5 w-2.5 items-center justify-center">
                <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
            )}
          </button>
        </div>

        {/* =====================================================
            KONTEN TAB
        ===================================================== */}
        {activeTab === "kuis" ? (
          /* TAB KUIS EVALUASI */
          <div className="flex min-h-[620px] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#5B5288]/40 bg-white p-6 shadow-sm sm:p-8">
            <Quiz
              onSubmitAttempt={handleSubmitAttempt}
              onContinue={() => setActiveTab("materi")}
              onFailed={() => setActiveTab("remedial")}
              idModul={course.id_modul}
              initialScore={quizScore}
              passingGrade={course.parameter_nilai ?? 80}
            />
          </div>
        ) : activeTab === "remedial" ? (
          /* TAB PEMBELAJARAN REMEDIAL */
          <div className="flex flex-col gap-5">
            {modulState && profile?.idMahasiswa ? (
              modulState.status === "remedial" || modulState.status === "retake" ? (
                <RemedialPanel
                  idMahasiswa={profile.idMahasiswa}
                  idModul={course.id_modul}
                  state={modulState}
                  onChanged={fetchModulState}
                  onRetake={() => setActiveTab("kuis")}
                  selectedSubTopikId={selectedSubTopikId}
                  onSelectSubTopik={setSelectedSubTopikId}
                />
              ) : modulState.status === "lulus" ? (
                <div className="rounded-3xl border border-emerald-300 bg-gradient-to-b from-white to-emerald-50/60 p-8 text-center shadow-lg">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm border border-emerald-200">
                    <Trophy className="h-8 w-8 text-emerald-600 animate-bounce" />
                  </div>
                  <h3 className="text-2xl font-black text-emerald-950">
                    Selamat, Modul Berhasil Dituntaskan! 🎉
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm font-medium text-emerald-800 leading-relaxed">
                    Nilai tertinggimu adalah <strong>{modulState.bestScore}%</strong> (standar kelulusan: {minScore}%). Kamu tidak memerlukan materi remedial untuk modul ini.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab("materi")}
                      className="rounded-xl border border-emerald-300 bg-white px-5 py-2.5 text-sm font-bold text-emerald-900 shadow-sm hover:bg-emerald-50"
                    >
                      Pelajari Ulang Materi
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("kuis")}
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700"
                    >
                      Ulangi Kuis Evaluasi
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-purple-200 bg-gradient-to-b from-white to-purple-50/40 p-8 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5B5288]/15 text-[#5B5288] shadow-sm">
                    <Brain className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-black text-[#3D2C6D]">
                    Pembelajaran Remedial
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 leading-relaxed">
                    Materi remedial akan otomatis disiapkan khusus untukmu jika nilai kuis evaluasi belum mencapai batas minimal kelulusan ({minScore}%).
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("kuis")}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#5B5288] px-6 py-3 text-sm font-black text-white shadow-md transition hover:bg-[#4A4172]"
                  >
                    <Target className="h-4 w-4" />
                    Mulai Kuis Evaluasi
                  </button>
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500">
                Memuat data remedial... ⏳
              </div>
            )}
          </div>
        ) : (
          /* TAB MATERI UTAMA */
          <div className="flex flex-col gap-6">
            {/* SUB-SECTION 1: VIDEO */}
            <div
              id="section-video"
              className="relative overflow-hidden rounded-3xl border-2 border-[#5B5288]/20 bg-black shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-[#1D1730] px-4 py-2.5 text-xs font-bold text-purple-200">
                <span className="flex items-center gap-2">
                  <Play className="h-3.5 w-3.5 fill-purple-300 text-purple-300" />
                  Video Penjelasan Modul
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {course.video_url ? "VIDEO TERSEDIA" : "BELUM TERSEDIA"}
                </span>
              </div>

              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={course.nama_modul}
                  className="aspect-video w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-gray-950 text-gray-400">
                  <Play className="h-10 w-10 opacity-40" />
                  <p className="text-xs font-semibold">Video materi belum ditambahkan oleh dosen.</p>
                </div>
              )}
            </div>

            {/* SUB-SECTION 2: TEKS MATERI & POKOK BAHASAN (RICH READER) */}
            <div id="section-teks">
              <RichMateriReader
                rawContent={course.teks_materi || ""}
                moduleTitle={course.nama_modul}
                subTopikList={subTopikList}
                onFinishReading={() => setActiveTab("kuis")}
              />
            </div>

            {/* SUB-SECTION 3: DOKUMEN PENDUKUNG */}
            {course.dokumen_pendukung && (
              <div
                id="section-dokumen"
                className="rounded-3xl border border-[#5B5288]/20 bg-white p-6 shadow-sm md:p-8"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-[#3D2C6D]">Dokumen Pendukung</h2>
                      <p className="text-xs font-medium text-gray-500">
                        Dokumen materi resmi kurikulum pembelajaran
                      </p>
                    </div>
                  </div>

                  <a
                    href={course.dokumen_pendukung}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#5B5288] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#4A4172]"
                  >
                    <span>Buka / Unduh Dokumen</span>
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  </a>
                </div>

                {isPdfDocument ? (
                  <iframe
                    src={course.dokumen_pendukung}
                    title={`Dokumen ${course.nama_modul}`}
                    className="h-[540px] w-full rounded-2xl border border-gray-200 shadow-inner"
                  />
                ) : (
                  <p className="text-sm text-gray-600">
                    Dokumen ini telah tersedia untuk dibaca atau diunduh langsung melalui tombol di atas.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          SIDEBAR KANAN (DAFTAR ISI DENGAN SUB-ITEM)
      ===================================================== */}
      <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-80 lg:self-start">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-lg shadow-[#3D2C6D]/5">
          {/* Header Daftar Isi */}
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-[#5B5288]" />
              <h3 className="text-base font-black uppercase tracking-wide text-[#3D2C6D]">
                Daftar Isi Modul
              </h3>
            </div>
            <span className="rounded-full bg-purple-100/70 px-2.5 py-0.5 text-[11px] font-black text-[#5B5288]">
              {progressPercent}% Selesai
            </span>
          </div>

          <div className="space-y-3">
            {/* ===================================================
                BAGIAN 1: MATERI UTAMA + SUB-ITEMS
            =================================================== */}
            <div className="rounded-2xl border border-gray-100 bg-[#FAF9FD] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("materi");
                  toggleSection("materi");
                }}
                className={`flex w-full items-center justify-between p-3 text-left transition ${activeTab === "materi"
                  ? "bg-[#5B5288] text-white"
                  : "hover:bg-purple-50 text-gray-800"
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${activeTab === "materi" ? "bg-white/20 text-white" : "bg-purple-100 text-[#5B5288]"
                      }`}
                  >
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wider truncate">
                      Bagian 1: Materi Utama
                    </p>
                    <p
                      className={`text-[11px] truncate ${activeTab === "materi" ? "text-purple-200" : "text-gray-500"
                        }`}
                    >
                      Video & Penjelasan
                    </p>
                  </div>
                </div>
                {expandedSections.materi ? (
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
                )}
              </button>

              {/* Sub-Items Bagian 1 */}
              {expandedSections.materi && (
                <div className="border-t border-purple-100/60 p-2 space-y-1 bg-white">
                  {/* Sub 1.1: Video Pembelajaran */}
                  <button
                    type="button"
                    onClick={() => scrollToSection("section-video")}
                    className="group flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-gray-700 transition hover:bg-purple-50 hover:text-[#5B5288]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Play className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span className="truncate">1.1 Video Pembelajaran</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-normal">
                      {course.video_url ? "Tersedia" : "-"}
                    </span>
                  </button>

                  {/* Sub 1.2: Penjelasan Materi */}
                  <button
                    type="button"
                    onClick={() => scrollToSection("section-teks")}
                    className="group flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-gray-700 transition hover:bg-purple-50 hover:text-[#5B5288]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span className="truncate">1.2 Penjelasan Materi</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-normal">
                      {paragraphs.length} Paragraf
                    </span>
                  </button>

                  {/* Rincian Pokok Bahasan */}
                  {subTopikList.length > 0 && (
                    <div className="my-1 border-l-2 border-purple-200 ml-4 pl-2 space-y-1">
                      {subTopikList.map((st, idx) => (
                        <button
                          key={st.id_sub_topik}
                          type="button"
                          onClick={() => scrollToSection("section-teks")}
                          className="flex w-full items-center gap-1.5 text-[11px] font-medium text-gray-600 hover:text-[#5B5288] text-left"
                        >
                          <span className="text-[9px] text-[#5B5288] font-bold">
                            {idx + 1}.
                          </span>
                          <span className="truncate">{st.judul}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sub 1.3: Dokumen Pendukung */}
                  {course.dokumen_pendukung && (
                    <button
                      type="button"
                      onClick={() => scrollToSection("section-dokumen")}
                      className="group flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-gray-700 transition hover:bg-purple-50 hover:text-[#5B5288]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span className="truncate">1.3 Dokumen Pendukung</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold">PDF</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* ===================================================
                BAGIAN 2: PEMBELAJARAN REMEDIAL + SUB-ITEMS
            =================================================== */}
            <div className="rounded-2xl border border-gray-100 bg-[#FAF9FD] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("remedial");
                  toggleSection("remedial");
                }}
                className={`flex w-full items-center justify-between p-3 text-left transition ${activeTab === "remedial"
                  ? "bg-[#5B5288] text-white"
                  : "hover:bg-purple-50 text-gray-800"
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${modulState?.status === "remedial"
                      ? "bg-rose-500 text-white animate-pulse"
                      : activeTab === "remedial"
                        ? "bg-white/20 text-white"
                        : "bg-purple-100 text-[#5B5288]"
                      }`}
                  >
                    <Brain className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-black uppercase tracking-wider truncate">
                        Bagian 2: Remedial
                      </p>
                      {modulState?.status === "remedial" && (
                        <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] font-black text-white">
                          Wajib
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] truncate ${activeTab === "remedial" ? "text-purple-200" : "text-gray-500"
                        }`}
                    >
                      {modulState?.status === "lulus"
                        ? "Sudah Lulus"
                        : modulState?.status === "remedial"
                          ? "Perlu Penguatan"
                          : "Materi Penguatan"}
                    </p>
                  </div>
                </div>
                {expandedSections.remedial ? (
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
                )}
              </button>

              {/* Sub-Items Bagian 3 */}
              {expandedSections.remedial && (
                <div className="border-t border-purple-100/60 p-2 space-y-1 bg-white">
                  <button
                    type="button"
                    onClick={() => setActiveTab("remedial")}
                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-gray-700 transition hover:bg-purple-50 hover:text-[#5B5288]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span className="truncate">3.1 Materi Penguatan</span>
                    </div>
                    <span className="text-[10px] text-purple-700 font-bold">
                      {modulState?.status === "remedial"
                        ? "Aktif"
                        : modulState?.status === "lulus"
                          ? "Lulus"
                          : "Siaga"}
                    </span>
                  </button>

                  {/* Sub-topik yang Perlu Diperbaiki */}
                  {modulState?.subTopikLemah && modulState.subTopikLemah.length > 0 ? (
                    <div className="my-1 border-l-2 border-rose-200 ml-4 pl-2 space-y-1.5">
                      <p className="text-[10px] font-bold text-rose-700 uppercase">
                        Sub-topik yang Perlu Diperbaiki:
                      </p>
                      {modulState.subTopikLemah.map((st) => (
                        <button
                          key={st.id_sub_topik}
                          type="button"
                          onClick={() => {
                            setActiveTab("remedial");
                            setSelectedSubTopikId(st.id_sub_topik);
                          }}
                          className="flex w-full items-center justify-between rounded-lg p-1.5 text-[11px] font-bold text-gray-700 hover:bg-rose-50 text-left transition"
                        >
                          <span className="truncate max-w-[130px]">{st.judul}</span>
                          <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700 font-black">
                            {st.benar}/{st.total}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : subTopikList.length > 0 ? (
                    <div className="my-1 border-l-2 border-purple-200 ml-4 pl-2 space-y-1">
                      <p className="text-[10px] font-bold text-gray-500">Materi Tersedia:</p>
                      {subTopikList.map((st) => (
                        <button
                          key={st.id_sub_topik}
                          type="button"
                          onClick={() => {
                            setActiveTab("remedial");
                            setSelectedSubTopikId(st.id_sub_topik);
                          }}
                          className="flex w-full items-center gap-1.5 text-[11px] font-medium text-gray-600 hover:text-[#5B5288] text-left truncate"
                        >
                          <span className="text-purple-600">•</span>
                          <span className="truncate">{st.judul}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {/* Penjelasan Pendukung */}
                  <div className="rounded-xl bg-[#FAF9FD] p-2 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#5B5288]">
                      <Brain className="h-3 w-3" />
                      Materi Adaptif Cerdas
                    </span>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      Rekomendasi disesuaikan dari hasil evaluasi kuis terakhir.
                    </p>
                  </div>
                </div>
              )}
            </div>
            {/* ===================================================
                BAGIAN 3: KUIS EVALUASI + SUB-ITEMS
            =================================================== */}

            <div className="rounded-2xl border border-gray-100 bg-[#FAF9FD] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  if (isRemedialNeeded) {
                    setActiveTab("remedial");
                    return;
                  }

                  setActiveTab("kuis");
                  toggleSection("kuis");
                }}
                className={`flex w-full items-center justify-between p-3 text-left transition ${isRemedialNeeded
                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                  : activeTab === "kuis"
                    ? "bg-[#5B5288] text-white"
                    : "hover:bg-purple-50 text-gray-800"
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isRemedialNeeded
                    ? "bg-gray-200 text-gray-500"
                    : activeTab === "kuis"
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-700"
                    }`}>
                    {isRemedialNeeded ? "🔒" : <Target className="h-4 w-4" />}
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wider truncate">
                      Bagian 3: Kuis Evaluasi
                    </p>
                    <p className="text-[11px] truncate">
                      {isRemedialNeeded
                        ? "Selesaikan remedial terlebih dahulu"
                        : quizScore !== null
                          ? `Nilai: ${quizScore}%`
                          : `Minimal lulus ${minScore}%`}
                    </p>
                  </div>
                </div>

                {!isRemedialNeeded && (
                  expandedSections.kuis ? (
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
                  )
                )}
              </button>

              {isRemedialNeeded ? (
                <div className="border-t border-gray-200 bg-gray-50 p-4 text-center">
                  <div className="mb-2 text-2xl">🔒</div>
                  <p className="text-xs font-bold text-gray-600">
                    Kuis terkunci
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                    Selesaikan seluruh materi remedial terlebih dahulu untuk membuka kembali kuis evaluasi.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("remedial")}
                    className="mt-3 rounded-lg bg-[#5B5288] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#4A4172]"
                  >
                    Buka Materi Remedial
                  </button>
                </div>
              ) : (
                expandedSections.kuis && (
                  <div className="border-t border-purple-100/60 p-2 space-y-1 bg-white">
                    <button
                      type="button"
                      onClick={() => setActiveTab("kuis")}
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-gray-700 transition hover:bg-purple-50 hover:text-[#5B5288]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Target className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">2.1 Kerjakan Kuis</span>
                      </div>
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        Evaluasi
                      </span>
                    </button>

                    <div className="flex items-center justify-between px-2.5 py-1.5 text-xs text-gray-600">
                      <span>2.2 Batas Kelulusan</span>
                      <span className="font-black text-[#5B5288]">{minScore}%</span>
                    </div>

                    <div className="flex items-center justify-between px-2.5 py-1.5 text-xs text-gray-600">
                      <span>2.3 Perolehan XP</span>
                      <span className="font-black text-amber-600">+{diff.xp} XP</span>
                    </div>

                    {quizScore !== null && (
                      <div className="flex items-center justify-between px-2.5 py-1.5 text-xs text-gray-600">
                        <span>2.4 Nilai Terbaik</span>
                        <span className={`font-black ${quizScore >= minScore ? "text-emerald-600" : "text-rose-600"
                          }`}>
                          {quizScore}%
                        </span>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>



          </div>
        </div>
      </aside>
    </div>
  );
}
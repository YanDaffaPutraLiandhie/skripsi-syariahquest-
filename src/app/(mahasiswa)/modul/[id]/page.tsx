"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, CheckCircle2, ArrowLeft, BookOpen } from "lucide-react";
import Quiz from "@/components/Quis/page";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getModuleAccess, type AdaptiveModule, type AdaptiveProgress } from "@/lib/adaptiveLearning";
import { applyDeadlineScore, formatDeadline, isPastDeadline } from "@/lib/deadline";

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
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"materi" | "kuis">("materi");
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [accessReason, setAccessReason] = useState("");
  const [resultNotice, setResultNotice] = useState<ResultNotice | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchDetail() {
      const { data: modulData } = await supabase
        .from("modul")
        .select("*")
        .eq("id_modul", id)
        .single();

      if (modulData && isMounted) {
        setCourse(modulData);
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

  // PENGAMAN SUPER KETAT ANTI MODUL KOSONG
  useEffect(() => {
    async function markMateriViewed() {
      if (course && profile?.idMahasiswa && activeTab === "materi") {
        // Bersihkan tag HTML (seperti <p><br></p>) jika dari Rich Text
        const teksMateriBersih = course.teks_materi
          ? course.teks_materi.replace(/<[^>]*>?/gm, "").trim()
          : "";
        const adaVideo = course.video_url && course.video_url.trim() !== "";
        const adaTeks = teksMateriBersih !== "";

        const adaIsiMateri = adaVideo || adaTeks;

        // Kalau kosong melompong, JANGAN berikan nilai 40%
        if (!adaIsiMateri) return;

        // Kalau ada isinya, baru catat ke database
        const { data: existingProgress } = await supabase
          .from("progress_modul")
          .select("id_modul")
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
          await supabase
            .from("progress_modul")
            .update({ materi_dilihat: true })
            .eq("id_mahasiswa", profile.idMahasiswa)
            .eq("id_modul", course.id_modul);
        }
      }
    }
    markMateriViewed();
  }, [course, profile?.idMahasiswa, activeTab]);

  // =============================================================
  // HASIL KUIS MODUL
  //
  // - Nilai >= nilai minimal & sebelum deadline -> nilai apa adanya
  // - Nilai >= nilai minimal & lewat deadline   -> nilai dipatok = nilai minimal
  // - Nilai <  nilai minimal                    -> tidak lulus, modul berikutnya
  //                                                tetap terkunci, harus mengulang
  // =============================================================
  async function handleClaimXP(score: number) {
    if (!course) return;

    const minScore = course.parameter_nilai ?? 80;
    const result = applyDeadlineScore(score, minScore, course.deadline);

    // ---- Tidak lulus: harus mengulang ----
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
        text: `Nilaimu belum mencapai batas minimal ${minScore}%. Modul berikutnya belum terbuka — pelajari materi lalu ulangi kuis ini.`,
      });
      return;
    }

    // ---- Lulus (nilai >= parameter_nilai modul) ----
    // Modul ditandai selesai. Jika lewat deadline, nilai dipatok ke nilai minimal.
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
            text: `Kamu lulus, tetapi kuis dikerjakan setelah deadline. Nilai akhir dicatat sebagai nilai minimal (${minScore}%).`,
          }
        : null,
    );
    setQuizScore(result.finalScore);
    setActiveTab("materi");
  }

  if (isLoading) {
    return (
      <div className="p-10 text-center font-bold text-gray-500">
        Memuat detail modul... ⏳
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-lg font-bold text-[#5B5288]">Modul tidak ditemukan</p>
        <button
          onClick={() => router.push("/modul")}
          className="flex items-center gap-2 rounded-lg border border-[#5B5288]/50 px-4 py-2 text-sm font-bold text-[#5B5288] hover:bg-[#5B5288]/10"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Modul Pembelajaran
        </button>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 p-10 text-center">
        <div className="rounded-full bg-amber-100 px-5 py-3 text-3xl">🔒</div>
        <h1 className="text-2xl font-black text-[#5B5288]">Modul belum terbuka</h1>
        <p className="text-sm text-gray-500">{accessReason}</p>
        <button
          onClick={() => router.push("/modul")}
          className="rounded-lg bg-[#5B5288] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#4a3f7a]"
        >
          Kembali ke Daftar Modul
        </button>
      </div>
    );
  }

  const paragraphs = course.teks_materi
    ? course.teks_materi.split("\n").filter((p) => p.trim() !== "")
    : [];
  const embedUrl = course.video_url ? getYouTubeEmbedUrl(course.video_url) : null;
  const isPdfDocument = course.dokumen_pendukung?.toLowerCase().includes(".pdf");
  const minScore = course.parameter_nilai ?? 80;
  const deadlineLate = isPastDeadline(course.deadline);

  return (
    <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:gap-8">
      {/* AREA KIRI */}
      <div className="min-w-0 flex-1">
        <button
          onClick={() => router.push("/modul")}
          className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#5B5288] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Modul
        </button>

        {/* =====================================================
            HEADER BANNER
        ===================================================== */}
        <div className="relative mb-6 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] px-6 py-8 text-white shadow-lg shadow-[#3d3466]/25 lg:px-8">
          {/* Header Banner Background SVGs */}
          <div className="absolute right-[28%] top-6 h-5 w-5 text-white/40">✨</div>
          <div className="absolute right-[8%] top-10 h-4 w-4 animate-pulse text-[#f2c94c]">✨</div>

          {/* Banner Decorative Curved Lines */}
          <div className="pointer-events-none absolute -right-10 top-0 opacity-20">
            <svg width="300" height="200" viewBox="0 0 300 200" fill="none">
              <path
                d="M50 0 C 150 100, 200 50, 300 200"
                stroke="white"
                strokeWidth="3"
                strokeDasharray="6 6"
              />
              <circle cx="200" cy="80" r="40" stroke="#f2c94c" strokeWidth="2" />
            </svg>
          </div>

          <div className="relative z-10">
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/15 px-3 py-1 text-[11px] font-bold text-[#e2dcff] shadow-inner backdrop-blur-md">
              <span className="text-amber-300">📚</span>
              Pembelajaran
            </span>
            <h1 className="text-2xl font-black leading-snug tracking-wide md:text-3xl">
              {course.nama_modul}
            </h1>
          </div>

          {/* Bottom Wave Decoration */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 opacity-20">
            <svg
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
              className="h-full w-full fill-white"
            >
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.94,130.83,121.3,201,115.8,241.6,112.5,282.6,98.2,321.39,56.44Z" />
            </svg>
          </div>
        </div>

        {/* =====================================================
            BANNER DEADLINE
        ===================================================== */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#5B5288]/10 px-4 py-2 text-sm font-bold text-[#5B5288]">
          🎯 Nilai minimal lulus kuis: {minScore}%
        </div>

        {course.deadline && (
          <div
            className={`mb-6 rounded-2xl p-4 text-sm font-bold ring-1 ${
              deadlineLate
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : "bg-sky-50 text-sky-800 ring-sky-200"
            }`}
          >
            {deadlineLate ? (
              <>
                🗓 Deadline modul ({formatDeadline(course.deadline)}) sudah lewat.
                <span className="mt-1 block font-semibold">
                  Jika nilai kuismu mencapai {minScore}% atau lebih, nilai akhir
                  dicatat sebagai {minScore}%. Jika di bawah {minScore}%, kamu
                  harus mengulang kuis dan modul berikutnya belum terbuka.
                </span>
              </>
            ) : (
              <>
                🗓 Deadline modul: {formatDeadline(course.deadline)}
                <span className="mt-1 block font-semibold">
                  Kerjakan kuis sebelum deadline agar nilaimu dicatat apa adanya.
                </span>
              </>
            )}
          </div>
        )}

        {/* =====================================================
            NOTIFIKASI HASIL KUIS
        ===================================================== */}
        {resultNotice && (
          <div
            className={`mb-6 rounded-2xl p-4 text-sm font-bold ring-1 ${
              resultNotice.type === "warning"
                ? "bg-rose-50 text-rose-700 ring-rose-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}
          >
            {resultNotice.text}
          </div>
        )}

        {activeTab === "kuis" ? (
          <div className="flex min-h-[600px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#5B5288]/50 bg-white p-8">
            <Quiz
              onClaimXP={(score: number) => handleClaimXP(score)}
              idModul={course.id_modul}
              initialScore={quizScore}
              passingGrade={course.parameter_nilai ?? 80}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="relative overflow-hidden rounded-xl bg-black">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={course.nama_modul}
                  className="aspect-video w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-gray-900 text-gray-400">
                  <Play className="h-10 w-10 opacity-50" />
                  <p className="text-sm">Video materi belum tersedia.</p>
                </div>
              )}
            </div>

            {paragraphs.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="mb-4 text-xl font-bold text-[#5B5288]">Penjelasan Materi</h2>
                <div className="flex flex-col gap-3 text-sm leading-relaxed text-gray-600">
                  {paragraphs.map((p, i) => (
                    <p key={i} className="mb-2">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
                Materi teks belum ditambahkan oleh dosen.
              </div>
            )}

            {course.dokumen_pendukung && (
              <div className="rounded-xl border border-[#5B5288]/20 bg-white p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-[#5B5288]">Dokumen Materi</h2>
                  <a
                    href={course.dokumen_pendukung}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-[#5B5288] px-4 py-2 text-xs font-bold text-white hover:bg-[#4a3f7a]"
                  >
                    Buka / Download File
                  </a>
                </div>
                {isPdfDocument ? (
                  <iframe
                    src={course.dokumen_pendukung}
                    title={`Dokumen ${course.nama_modul}`}
                    className="h-[520px] w-full rounded-lg border border-gray-200"
                  />
                ) : (
                  <p className="text-sm text-gray-500">
                    Dokumen dapat dibuka atau diunduh melalui tombol di atas. Isi teksnya sudah
                    ditampilkan pada bagian materi.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SIDEBAR KANAN */}
      <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-80 lg:self-start">
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 border-b pb-2 text-lg font-bold text-[#5B5288]">Daftar Isi</h3>

          <ul className="flex flex-col gap-2">
            <li>
              <button
                onClick={() => setActiveTab("materi")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                  activeTab === "materi"
                    ? "border border-[#5B5288]/30 bg-[#5B5288]/10"
                    : "hover:bg-gray-50"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    activeTab === "materi" ? "bg-[#5B5288]" : "bg-gray-200"
                  }`}
                >
                  <BookOpen
                    className={`h-4 w-4 ${
                      activeTab === "materi" ? "text-white" : "text-gray-500"
                    }`}
                  />
                </span>
                <span
                  className={`flex-1 text-sm font-semibold ${
                    activeTab === "materi" ? "text-[#5B5288]" : "text-gray-600"
                  }`}
                >
                  Materi Utama
                </span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("kuis")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                  activeTab === "kuis"
                    ? "border border-[#5B5288]/30 bg-[#5B5288]/10"
                    : "hover:bg-gray-50"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    quizScore !== null
                      ? "bg-green-500"
                      : activeTab === "kuis"
                        ? "bg-[#5B5288]"
                        : "bg-gray-200"
                  }`}
                >
                  {quizScore !== null ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : (
                    <Play
                      className={`h-4 w-4 ${
                        activeTab === "kuis" ? "fill-white text-white" : "text-gray-500"
                      }`}
                    />
                  )}
                </span>
                <span
                  className={`flex-1 text-sm font-semibold ${
                    activeTab === "kuis" ? "text-[#5B5288]" : "text-gray-600"
                  }`}
                >
                  Kuis Evaluasi
                  <span className="block text-[11px] font-medium text-gray-400">
                    Minimal lulus {minScore}%
                  </span>
                </span>

                {quizScore !== null && (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-black text-green-600 shadow-sm">
                    {quizScore}%
                  </span>
                )}
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
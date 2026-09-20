  "use client";

  import { Suspense, useEffect, useState } from "react";
  import { useRouter, useSearchParams } from "next/navigation";
  import { supabase } from "@/lib/supabase";
  import DosenContainer from "@/components/layout/DosenContainer";
  import { ArrowLeft, Play, BookOpen } from "lucide-react";

  type Modul = {
    id_modul: number;
    nama_modul: string;
    id_level: number;
    video_url: string;
    teks_materi: string;
    dokumen_pendukung: string | null;
  };

  function LevelBadge({
    level,
    size = "h-9 w-9 text-sm",
  }: {
    level: number;
    size?: string;
  }) {
    const bg =
      level === 1 ? "bg-green-500" : level === 2 ? "bg-yellow-500" : "bg-red-500";
    const label = level === 1 ? "E" : level === 2 ? "M" : "H";

    return (
      <span
        className={`flex items-center justify-center rounded-full font-bold text-white ${bg} ${size}`}
      >
        {label}
      </span>
    );
  }

  function getYouTubeEmbedUrl(url: string) {
    if (!url) return null;
    if (url.includes("youtube.com/embed/")) return url;
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0] ?? "";
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (url.includes("youtube.com/watch")) {
      const videoId = new URL(url).searchParams.get("v") ?? "";
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | KOMPONEN UTAMA
  |--------------------------------------------------------------------------
  */
  function ModulDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const modulId = searchParams.get("id");

    const [modul, setModul] = useState<Modul | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
      let isMounted = true;

      async function load() {
        setLoading(true);
        setErrorMsg(null);

        try {
          let query = supabase
            .from("modul")
            .select(
              `
                    id_modul,
                    nama_modul,
                    id_level,
                    video_url,
                    teks_materi,
                    dokumen_pendukung
                  `,
            );

          if (modulId) {
            query = query.eq("id_modul", Number(modulId));
          } else {
            query = query.limit(1);
          }

          const { data, error } = await query.single();

          if (!isMounted) return;

          if (error) {
            console.error("Supabase error:", error);
            setErrorMsg(`Gagal memuat modul: ${error.message}`);
            setLoading(false);
            return;
          }

          if (!data) {
            setErrorMsg("Data modul tidak ditemukan.");
            setLoading(false);
            return;
          }

          setModul({
            id_modul: Number(data.id_modul),
            nama_modul: data.nama_modul ?? "",
            id_level: Number(data.id_level),
            video_url: data.video_url ?? "",
            teks_materi: data.teks_materi ?? "",
            dokumen_pendukung: data.dokumen_pendukung ?? "",
          });

          setLoading(false);
        } catch (error) {
          console.error("Error load modul:", error);
          if (!isMounted) return;
          setErrorMsg(
            error instanceof Error ? error.message : "Gagal memuat data modul.",
          );
          setLoading(false);
        }
      }

      load();

      return () => {
        isMounted = false;
      };
    }, [modulId]);

    const embedUrl = modul?.video_url ? getYouTubeEmbedUrl(modul.video_url) : null;
    const isPdfDocument = modul?.dokumen_pendukung
      ? modul.dokumen_pendukung.toLowerCase().includes(".pdf")
      : false;

    return (
      <DosenContainer categoryTag="" title="" subtitle="" headerAction={null}>
        <div className="p-6">
          {errorMsg && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
            {/* AREA KIRI */}
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/Dosen/modul")}
                  className="flex items-center gap-2 text-sm font-semibold text-[#5B5288] hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Kembali ke Daftar Modul</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      modul?.id_modul
                        ? `/Dosen/modul/edit_modul?id=${modul.id_modul}`
                        : "/Dosen/modul/edit_modul",
                    )
                  }
                  className="rounded-lg bg-amber-400 px-5 py-2 text-sm font-bold text-amber-950 shadow-md shadow-amber-900/20 transition hover:bg-amber-300"
                >
                  Edit Modul
                </button>
              </div>

              {/* HEADER BANNER */}
              <div className="relative mb-6 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] px-6 py-8 text-white shadow-lg shadow-[#3d3466]/25 lg:px-8">
                <div className="absolute right-[28%] top-6 h-5 w-5 text-white/40">
                  <span>✨</span>
                </div>
                <div className="absolute right-[8%] top-10 h-4 w-4 animate-pulse text-[#f2c94c]">
                  <span>✨</span>
                </div>

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
                    <span>Pembelajaran</span>
                  </span>
                  <h1 className="text-2xl font-black leading-snug tracking-wide md:text-3xl">
                    {loading ? "Memuat modul..." : modul?.nama_modul ?? "Detail Modul"}
                  </h1>
                </div>

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

              {/* VIDEO PLAYER */}
              <div className="mb-6 overflow-hidden rounded-xl bg-black">
                {modul?.video_url ? (
                  embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={modul.nama_modul}
                      className="aspect-video w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      controls
                      src={modul.video_url}
                      className="aspect-video w-full bg-black object-contain"
                    />
                  )
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center gap-2 bg-gray-900 text-gray-400">
                    <Play className="h-10 w-10 opacity-50" />
                    <span className="text-sm">Video materi belum tersedia.</span>
                  </div>
                )}
              </div>

              {/* MATERI CARD */}
              <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-3 border-b border-[#f0edf9] pb-4">
                  {modul ? <LevelBadge level={modul.id_level} /> : null}
                  <h2 className="text-xl font-bold text-[#5B5288]">Penjelasan Materi</h2>
                </div>

                <div className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
                  {loading
                    ? "Memuat teks materi..."
                    : modul?.teks_materi || "Materi tertulis belum diisi untuk modul ini."}
                </div>
              </div>

              {/* DOKUMEN */}
              {modul?.dokumen_pendukung ? (
                <div className="rounded-xl border border-[#5B5288]/20 bg-white p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-[#5B5288]">Dokumen Materi</h2>
                    <a
                      href={modul.dokumen_pendukung}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-[#5B5288] px-4 py-2 text-xs font-bold text-white hover:bg-[#4a3f7a]"
                    >
                      Buka / Download File
                    </a>
                  </div>
                  {isPdfDocument ? (
                    <iframe
                      src={modul.dokumen_pendukung}
                      title={`Dokumen ${modul.nama_modul}`}
                      className="h-[520px] w-full rounded-lg border border-gray-200"
                    />
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* SIDEBAR KANAN: DAFTAR ISI */}
            <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-80 lg:self-start">
              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-4 border-b pb-2 text-lg font-bold text-[#5B5288]">
                  Daftar Isi
                </h3>

                <ul className="flex flex-col gap-2">
                  <li>
                    <div className="flex w-full items-center gap-3 rounded-lg border border-[#5B5288]/30 bg-[#5B5288]/10 px-3 py-3 text-left">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5B5288]">
                        <BookOpen className="h-4 w-4 text-white" />
                      </span>
                      <span className="flex-1 text-sm font-semibold text-[#5B5288]">
                        Materi Utama
                      </span>
                    </div>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          modul?.id_modul
                            ? `/Dosen/modul/lihat_kuis?id=${modul.id_modul}`
                            : "/Dosen/modul/lihat_kuis",
                        )
                      }
                      disabled={!modul?.id_modul}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                        <Play className="h-4 w-4 text-gray-500" />
                      </span>
                      <span className="flex-1 text-sm font-semibold text-gray-600">
                        Lihat kuis
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </DosenContainer>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | FALLBACK SUSPENSE
  |--------------------------------------------------------------------------
  */
  function ModulDetailLoading() {
    return (
      <div className="flex min-h-screen bg-white">
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#4a3f7a] border-t-transparent" />
              <p className="text-sm font-medium text-[#6e6a85]">
                Memuat detail modul...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PAGE
  |--------------------------------------------------------------------------
  */
  export default function ModulDetailVideo() {
    return (
      <Suspense fallback={<ModulDetailLoading />}>
        <ModulDetailContent />
      </Suspense>
    );
  }
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DosenContainer from "@/components/layout/DosenContainer";

type LessonItem = {
  title: string;
  status: "done" | "current" | "locked";
};

type Modul = {
  id_modul: number;
  nama_modul: string;
  id_level: number;
  video_url: string;
  teks_materi: string;
  dokumen_pendukung: string;
};

const LESSONS: LessonItem[] = [
  {
    title: "Sejarah Ekonomi Islam",
    status: "done",
  },
  {
    title: "Prinsip Keuangan Syariah",
    status: "current",
  },
  {
    title: "Modul Tersedia",
    status: "locked",
  },
  {
    title: "Modul Tersedia",
    status: "locked",
  },
  {
    title: "Modul Tersedia",
    status: "locked",
  },
  {
    title: "Modul Tersedia",
    status: "locked",
  },
];

const QUIZZES: LessonItem[] = [
  {
    title: "QUIZ 1",
    status: "locked",
  },
  {
    title: "QUIZ 2",
    status: "locked",
  },
];

function LessonIcon({
  status,
}: {
  status: LessonItem["status"];
}) {
  if (status === "done") {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
      >
        <path d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  if (status === "current") {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="white"
        stroke="none"
      >
        <path d="M7 5v14l11-7z" />
      </svg>
    );
  }

  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
    >
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
      />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function LevelBadge({
  level,
  size = "h-10 w-10 text-sm",
}: {
  level: number;
  size?: string;
}) {
  const bg =
    level === 1
      ? "bg-green-500"
      : level === 2
        ? "bg-yellow-500"
        : "bg-red-500";

  const label =
    level === 1
      ? "E"
      : level === 2
        ? "M"
        : "H";

  return (
    <span
      className={`flex items-center justify-center rounded-full font-bold text-white ${bg} ${size}`}
    >
      {label}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| KOMPONEN UTAMA
|--------------------------------------------------------------------------
|
| useSearchParams() berada di dalam komponen ini.
| Komponen ini nantinya dibungkus dengan Suspense.
|
*/
function ModulDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const modulId = searchParams.get("id");

  const [modul, setModul] = useState<Modul | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    null,
  );

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

        /*
        |--------------------------------------------------------------------------
        | Jika URL memiliki ?id=
        |--------------------------------------------------------------------------
        |
        | Contoh:
        | /Dosen/modul/detail_modul?id=12
        |
        */
        if (modulId) {
          query = query.eq(
            "id_modul",
            Number(modulId),
          );
        } else {
          /*
          |--------------------------------------------------------------------------
          | Jika tidak ada ID, ambil modul pertama
          |--------------------------------------------------------------------------
          */
          query = query.limit(1);
        }

        const { data, error } = await query.single();

        if (!isMounted) {
          return;
        }

        if (error) {
          console.error(
            "Supabase error:",
            error,
          );

          setErrorMsg(
            `Gagal memuat modul: ${error.message}`,
          );

          setLoading(false);

          return;
        }

        if (!data) {
          setErrorMsg(
            "Data modul tidak ditemukan.",
          );

          setLoading(false);

          return;
        }

        setModul({
          id_modul: Number(data.id_modul),
          nama_modul: data.nama_modul ?? "",
          id_level: Number(data.id_level),
          video_url: data.video_url ?? "",
          teks_materi: data.teks_materi ?? "",
          dokumen_pendukung:
            data.dokumen_pendukung ?? "",
        });

        setLoading(false);
      } catch (error) {
        console.error(
          "Error load modul:",
          error,
        );

        if (!isMounted) {
          return;
        }

        setErrorMsg(
          error instanceof Error
            ? error.message
            : "Gagal memuat data modul.",
        );

        setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [modulId]);

  return (

    <DosenContainer
      categoryTag="MODUL PEMBELAJARAN"
      title={loading ? "Memuat modul..." : modul?.nama_modul ?? "Detail Modul"}
      subtitle="Detail materi pembelajaran, video interaktif, dan dokumen pendukung."
      headerAction={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/Dosen/modul")}
            className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            ← Kembali
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
            className="rounded-full bg-amber-400 px-6 py-2.5 text-sm font-bold text-amber-950 shadow-md shadow-amber-900/20 hover:bg-amber-300 transition"
          >
            Edit Modul
          </button>
        </div>
      }
    >
      {errorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* LEFT CONTENT: VIDEO & MATERI */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* VIDEO PLAYER */}
          <div className="overflow-hidden rounded-[28px] bg-black shadow-sm ring-1 ring-black/5">
            {modul?.video_url ? (
              <video
                controls
                src={modul.video_url}
                className="w-full max-h-[450px] object-cover bg-black"
              />
            ) : (
              <div className="flex h-[320px] items-center justify-center bg-gradient-to-br from-[#1f1a3a] to-[#0d0d16]">
                <span className="text-sm font-semibold text-[#c9c3e6]">
                  {loading ? "Memuat video..." : "Video pembelajaran belum diunggah."}
                </span>
              </div>
            )}
          </div>

          {/* MATERI CARD */}
          <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-black/5">
            <div className="mb-4 flex items-center justify-between border-b border-[#f0edf9] pb-4">
              <div className="flex items-center gap-3">
                {modul && <LevelBadge level={modul.id_level} size="h-9 w-9 text-sm" />}
                <h2 className="text-xl font-bold text-[#3d3466]">
                  {modul?.nama_modul ?? "Pengantar Keuangan Syariah"}
                </h2>
              </div>
              {modul?.dokumen_pendukung && (
                <a
                  href={modul.dokumen_pendukung}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-300 transition shadow-sm"
                >
                  Download Materi (PDF/Doc)
                </a>
              )}
            </div>

            <div className="prose max-w-none text-sm leading-relaxed text-[#2b2540] whitespace-pre-line">
              {loading
                ? "Memuat teks materi..."
                : modul?.teks_materi ||
                "Materi tertulis belum diisi untuk modul ini."}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: LESSONS & QUIZZES */}
        <aside className="w-full shrink-0 lg:w-[320px] space-y-6">
          <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h3 className="mb-4 text-base font-bold text-[#3d3466] border-b border-[#f0edf9] pb-3">
              Daftar Sub-Pembelajaran
            </h3>
            <div className="space-y-2">
              {LESSONS.map((item, i) => (
                <div
                  key={`${item.title}-${i}`}
                  className="flex items-center gap-3 rounded-2xl bg-[#f8f7fd] p-3 transition hover:bg-[#f0edf9]"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.status === "locked"
                        ? "bg-[#4a3f7a]/30"
                        : "bg-[#4a3f7a]"
                      }`}
                  >
                    <LessonIcon status={item.status} />
                  </div>
                  <span
                    className={`text-xs ${item.status === "locked"
                        ? "text-[#8b84a5]"
                        : "font-bold text-[#3d3466]"
                      }`}
                  >
                    {item.title}
                  </span>
                </div>
              ))}
            </div>

            <h3 className="mb-4 mt-6 text-base font-bold text-[#3d3466] border-b border-[#f0edf9] pb-3">
              Kuis Terkait
            </h3>
            <div className="space-y-2">
              {QUIZZES.map((item, i) => (
                <div
                  key={`${item.title}-${i}`}
                  className="flex items-center gap-3 rounded-2xl bg-[#f8f7fd] p-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#4a3f7a]/30">
                    <LessonIcon status={item.status} />
                  </div>
                  <span className="text-xs font-semibold text-[#8b84a5]">
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
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
|
| Inilah bagian penting untuk memperbaiki error:
|
| useSearchParams() harus berada di dalam Suspense.
|
*/

export default function ModulDetailVideo() {
  return (
    <Suspense
      fallback={<ModulDetailLoading />}
    >
      <ModulDetailContent />
    </Suspense>
  );
}
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";;

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
  { title: "Sejarah Ekonomi Islam", status: "done" },
  { title: "Prinsip Keuangan Syariah", status: "current" },
  { title: "Modul Tersedia", status: "locked" },
  { title: "Modul Tersedia", status: "locked" },
  { title: "Modul Tersedia", status: "locked" },
  { title: "Modul Tersedia", status: "locked" },
];

const QUIZZES: LessonItem[] = [
  { title: "QUIZ 1", status: "locked" },
  { title: "QUIZ 2", status: "locked" },
];

function LessonIcon({ status }: { status: LessonItem["status"] }) {
  if (status === "done") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
        <path d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (status === "current") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="white" stroke="none">
        <path d="M7 5v14l11-7z" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function LevelBadge({ level, size = "h-10 w-10 text-sm" }: { level: number; size?: string }) {
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

export default function ModulDetailVideo() {
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

      let query = supabase
        .from("modul")
        .select("id_modul, nama_modul, id_level, video_url, teks_materi, dokumen_pendukung");

      // Kalau ada id di URL (?id=...), ambil modul spesifik itu.
      // Kalau tidak ada, fallback ke modul pertama supaya halaman tetap bisa dites langsung.
      query = modulId ? query.eq("id_modul", modulId) : query.limit(1);

      const { data, error } = await query.single();

      if (!isMounted) return;

      if (error) {
        console.error("Supabase error:", error);
        setErrorMsg("Gagal memuat modul. Silakan coba lagi.");
        setLoading(false);
        return;
      }

      setModul(data);
      setLoading(false);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [modulId]);

  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <Sidebar activeLabel="Modul Pembelajaran" />

      {/* Main */}
      <main className="flex-1 p-8">
        {/* Topbar */}
        

        {errorMsg && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-600">
            {errorMsg}
          </div>
        )}

        <div className="grid gap-6">
          <div className="rounded-[24px] bg-[#4a3f7a] p-10 text-white shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  {modul && <LevelBadge level={modul.id_level} />}
                  <h1 className="text-3xl font-bold">
                    {loading ? "Memuat modul..." : modul?.nama_modul ?? "Pengantar Keuangan Syariah"}
                  </h1>
                </div>
                <p className="max-w-2xl text-sm text-[#d0c7f1]">
                  Detail modul lengkap dengan video, materi, dan daftar pembelajaran.
                </p>
              </div>
              <button
                onClick={() =>
                  router.push(
                    modul?.id_modul
                      ? `/Dosen/modul/tambah_modul?id=${modul.id_modul}`
                      : "/Dosen/modul/tambah_modul"
                  )
                }
                className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-400 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-300"
              >
                Edit Modul
              </button>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Left: video + description */}
            <div className="flex-1">
              {modul?.video_url ? (
                <video
                  controls
                  src={modul.video_url}
                  className="mb-4 w-full rounded-2xl bg-[#0d0d16]"
                />
              ) : (
                <div className="relative flex h-[280px] items-center justify-center overflow-hidden rounded-2xl bg-[#0d0d16]">
                  <span className="text-sm text-[#a3a0b5]">
                    {loading ? "Memuat video..." : "Video belum tersedia."}
                  </span>
                </div>
              )}

              <div className="mt-6 rounded-3xl border border-[#ececf3] bg-white p-6 text-[#4a3f7a]">
                <div className="mb-3 flex items-center gap-3">
                  {modul && <LevelBadge level={modul.id_level} size="h-8 w-8 text-sm" />}
                  <h2 className="text-xl font-bold">
                    {modul?.nama_modul ?? "Pengantar Keuangan Syariah"}
                  </h2>
                </div>
                <p className="mb-4 whitespace-pre-line text-sm leading-relaxed">
                  {loading ? "Memuat materi..." : modul?.teks_materi ?? "Belum ada materi."}
                </p>

                {modul?.dokumen_pendukung && (
                  <a
                    href={modul.dokumen_pendukung}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-300"
                  >
                    Download Materi
                  </a>
                )}
              </div>
            </div>

            {/* Right: lesson list */}
            <aside className="w-[280px] shrink-0">
              <div className="flex flex-col divide-y divide-[#ececf3]">
                {LESSONS.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-4">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        item.status === "locked" ? "bg-[#4a3f7a]/50" : "bg-[#4a3f7a]"
                      }`}
                    >
                      <LessonIcon status={item.status} />
                    </div>
                    <span
                      className={`text-sm ${
                        item.status === "locked"
                          ? "text-[#c9c6d6]"
                          : item.status === "current"
                          ? "font-bold text-[#3d3466]"
                          : "font-semibold text-[#3d3466]"
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>

              <h3 className="my-4 text-center text-lg font-bold text-[#3d3466]">Quiz</h3>

              <div className="flex flex-col divide-y divide-[#ececf3]">
                {QUIZZES.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#4a3f7a]/50">
                      <LessonIcon status={item.status} />
                    </div>
                    <span className="text-sm text-[#c9c6d6]">{item.title}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
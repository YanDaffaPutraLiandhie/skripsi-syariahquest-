"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DosenContainer from "@/components/layout/DosenContainer";
import { Award, BookOpen, Trophy, ArrowLeft, User } from "lucide-react";

type Student = {
  id_mahasiswa: number;
  nama_mahasiswa: string;
  total_xp: number;
  total_poin: number;
  avatar_url: string | null;
  deskripsi: string | null;
};

type Badge = {
  id: number;
  id_badge: number;
  diperoleh_pada: string;
  badges: {
    nama_badge: string;
    syarat: string;
    icon_url: string;
  } | null;
};

type ProgressModul = {
  id: number;
  id_modul: number;
  nilai: number;
  selesai: boolean;
  modul: {
    nama_modul?: string;
  } | null;
};

export default function ProfilMahasiswaLeaderboard() {
  const { id } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [progress, setProgress] = useState<ProgressModul[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [studentRes, badgesRes, progressRes] = await Promise.all([
          supabase
            .from("mahasiswa")
            .select(
              "id_mahasiswa, nama_mahasiswa, total_xp, total_poin, avatar_url, deskripsi"
            )
            .eq("id_mahasiswa", id)
            .single(),
          supabase
            .from("mahasiswa_badges")
            .select("id, id_badge, diperoleh_pada, badges(nama_badge, syarat, icon_url)")
            .eq("id_mahasiswa", id),
          supabase
            .from("progress_modul")
            .select("id, id_modul, nilai, selesai, modul(nama_modul)")
            .eq("id_mahasiswa", id),
        ]);

        if (studentRes.error) {
          console.error("Supabase error (mahasiswa):", studentRes.error);
        } else {
          setStudent(studentRes.data as unknown as Student);
        }

        if (badgesRes.error) {
          console.error("Supabase error (mahasiswa_badges):", badgesRes.error);
        } else {
          setBadges((badgesRes.data ?? []) as unknown as Badge[]);
        }

        if (progressRes.error) {
          console.error("Supabase error (progress_modul):", progressRes.error);
        } else {
          setProgress((progressRes.data ?? []) as unknown as ProgressModul[]);
        }
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      load();
    }
  }, [id]);

  const modulSelesaiCount = progress.filter((p) => p.selesai).length;

  const badgeColors = [
    "bg-amber-100 text-amber-600",
    "bg-purple-100 text-purple-600",
    "bg-emerald-100 text-emerald-600",
    "bg-sky-100 text-sky-600",
    "bg-rose-100 text-rose-600",
  ];

  const progressBarColor = (nilai: number) =>
    nilai >= 80 ? "bg-emerald-500" : nilai >= 50 ? "bg-amber-500" : "bg-rose-500";

  const progressTextColor = (nilai: number) =>
    nilai >= 80 ? "text-emerald-600" : nilai >= 50 ? "text-amber-600" : "text-rose-600";

  return (
    <DosenContainer
      categoryTag="PROFIL MAHASISWA"
      title={student?.nama_mahasiswa ?? "Detail Mahasiswa"}
      subtitle="Statistik performa pembelajaran, perolehan nilai, dan pencapaian lencana."
      headerAction={
        <button
          type="button"
          onClick={() => router.push("/Dosen/leaderboard")}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold text-white backdrop-blur-sm hover:bg-white/20 transition"
        >
          <ArrowLeft size={16} />
          Kembali ke Leaderboard
        </button>
      }
    >
      {loading ? (
        <div className="rounded-[28px] bg-white p-12 text-center text-sm font-semibold text-[#8b84a5] shadow-sm">
          Memuat data statistik mahasiswa...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-6 rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-black/5">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[#4a3f7a]/10 text-[#4a3f7a] ring-1 ring-[#4a3f7a]/20 overflow-hidden">
              {student?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.avatar_url}
                  alt={student.nama_mahasiswa}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={48} />
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-[#2b2540]">
                {student?.nama_mahasiswa ?? "Mahasiswa"}
              </h2>
              <p className="text-xs font-bold text-[#8b84a5] tracking-wider uppercase mt-1">
                ID Mahasiswa: #{student?.id_mahasiswa}
              </p>
              {student?.deskripsi && (
                <p className="text-xs text-[#8b84a5] mt-2 max-w-md">{student.deskripsi}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <div className="flex items-center gap-3.5 rounded-2xl bg-[#f8f7fd] p-4 ring-1 ring-[#4a3f7a]/5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Trophy size={20} />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-[#2b2540]">
                    {student?.total_poin ?? student?.total_xp ?? 0}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b84a5]">
                    Total Skor
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl bg-[#f8f7fd] p-4 ring-1 ring-[#4a3f7a]/5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-[#2b2540]">{modulSelesaiCount}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b84a5]">
                    Modul Selesai
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-black/5">
              <div className="mb-4 flex items-center justify-between border-b border-[#f0edf9] pb-4">
                <h3 className="text-base font-bold text-[#2b2540]">Lencana Pencapaian</h3>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                  {badges.length} Badges
                </span>
              </div>

              {badges.length === 0 ? (
                <p className="text-center text-xs font-semibold text-[#8b84a5] py-6">
                  Belum ada lencana yang diperoleh.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-4 pt-2">
                  {badges.map((b, i) => (
                    <div
                      key={b.id}
                      title={b.badges?.syarat ?? ""}
                      className="flex flex-col items-center justify-center rounded-2xl bg-[#f8f7fd] p-4 text-center ring-1 ring-[#4a3f7a]/5"
                    >
                      <div
                        className={`mb-2 flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl ${badgeColors[i % badgeColors.length]
                          }`}
                      >
                        {b.badges?.icon_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.badges.icon_url}
                            alt={b.badges.nama_badge}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Award size={24} />
                        )}
                      </div>
                      <span className="text-xs font-bold text-[#2b2540]">
                        {b.badges?.nama_badge ?? "Badge"}
                      </span>
                      {b.badges?.syarat && (
                        <span className="mt-0.5 text-[10px] text-[#8b84a5] line-clamp-1">
                          {b.badges.syarat}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-black/5">
              <div className="mb-4 flex items-center justify-between border-b border-[#f0edf9] pb-4">
                <h3 className="text-base font-bold text-[#2b2540]">Progress Pembelajaran</h3>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                  {progress.length > 0
                    ? `${Math.round((modulSelesaiCount / progress.length) * 100)}% Complete`
                    : "0% Complete"}
                </span>
              </div>

              {progress.length === 0 ? (
                <p className="text-center text-xs font-semibold text-[#8b84a5] py-6">
                  Belum ada progress modul.
                </p>
              ) : (
                <div className="space-y-4 pt-2">
                  {progress.map((p) => (
                    <div key={p.id}>
                      <div className="mb-1.5 flex justify-between text-xs font-bold">
                        <span className="text-[#2b2540]">
                          {p.modul?.nama_modul ?? `Modul #${p.id_modul}`}
                        </span>
                        <span className={progressTextColor(p.nilai ?? 0)}>
                          {p.selesai ? "100%" : `${p.nilai ?? 0}%`}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-[#f0edf9]">
                        <div
                          className={`h-2.5 rounded-full ${progressBarColor(
                            p.selesai ? 100 : p.nilai ?? 0
                          )}`}
                          style={{ width: `${p.selesai ? 100 : p.nilai ?? 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DosenContainer>
  );
}
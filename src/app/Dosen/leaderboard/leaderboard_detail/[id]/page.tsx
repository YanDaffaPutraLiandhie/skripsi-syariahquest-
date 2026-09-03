"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DosenContainer from "@/components/layout/DosenContainer";
import { Award, BookOpen, Trophy, ArrowLeft, User } from "lucide-react";

type Student = {
  id_mahasiswa: number;
  nama_mahasiswa: string;
  Nilai: number;
};

export default function ProfilMahasiswaLeaderboard() {
  const { id } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("mahasiswa")
          .select("id_mahasiswa, nama_mahasiswa, Nilai")
          .eq("id_mahasiswa", id)
          .single();

        if (error) {
          console.error("Supabase error:", error);
          return;
        }

        setStudent(data);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      load();
    }
  }, [id]);

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
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[#4a3f7a]/10 text-[#4a3f7a] ring-1 ring-[#4a3f7a]/20">
              <User size={48} />
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-[#2b2540]">
                {student?.nama_mahasiswa ?? "Mahasiswa"}
              </h2>
              <p className="text-xs font-bold text-[#8b84a5] tracking-wider uppercase mt-1">
                ID Mahasiswa: #{student?.id_mahasiswa}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <div className="flex items-center gap-3.5 rounded-2xl bg-[#f8f7fd] p-4 ring-1 ring-[#4a3f7a]/5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Trophy size={20} />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-[#2b2540]">
                    {student?.Nilai ?? 0}
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
                  <p className="text-xl font-extrabold text-[#2b2540]">5</p>
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
                  3 Badges
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2">
                {[
                  { title: "Pembelajar Giat", color: "bg-amber-100 text-amber-600" },
                  { title: "Kuis Master", color: "bg-purple-100 text-purple-600" },
                  { title: "Top 10 Kelas", color: "bg-emerald-100 text-emerald-600" },
                ].map((b, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-center rounded-2xl bg-[#f8f7fd] p-4 text-center ring-1 ring-[#4a3f7a]/5"
                  >
                    <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-2xl ${b.color}`}>
                      <Award size={24} />
                    </div>
                    <span className="text-xs font-bold text-[#2b2540]">{b.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-black/5">
              <div className="mb-4 flex items-center justify-between border-b border-[#f0edf9] pb-4">
                <h3 className="text-base font-bold text-[#2b2540]">Progress Pembelajaran</h3>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                  85% Complete
                </span>
              </div>
              <div className="space-y-4 pt-2">
                <div>
                  <div className="mb-1.5 flex justify-between text-xs font-bold">
                    <span className="text-[#2b2540]">Pengantar Fiqih Muamalah</span>
                    <span className="text-emerald-600">100%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#f0edf9]">
                    <div className="h-2.5 rounded-full bg-emerald-500 w-full" />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs font-bold">
                    <span className="text-[#2b2540]">Akad-Akad Syariah</span>
                    <span className="text-emerald-600">90%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#f0edf9]">
                    <div className="h-2.5 rounded-full bg-emerald-500 w-[90%]" />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs font-bold">
                    <span className="text-[#2b2540]">Riba & Gharar</span>
                    <span className="text-amber-600">65%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#f0edf9]">
                    <div className="h-2.5 rounded-full bg-amber-500 w-[65%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DosenContainer>
  );
}

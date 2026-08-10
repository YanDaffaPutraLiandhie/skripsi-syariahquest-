"use client";

import Sidebar from "@/app/component/sidebar";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Student = {
  id_mahasiswa: number;
  nama_mahasiswa: string;
  Nilai: number;
};

const STATS = [
  { icon: "book", key: "modul", value: "5", label: "Modul Selesai" },
  { icon: "gem", key: "nilai", value: "0", label: "Nilai" },
  { icon: "rank", key: "peringkat", value: "#1", label: "Peringkat Kelas" },
];

const BADGES = [
  { color: "text-violet-300" },
  { color: "text-fuchsia-300" },
  { color: "text-violet-400" },
];

function StatIcon({ name }: { name: string }) {
  const common = "h-5 w-5";
  switch (name) {
    case "book":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13zM20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13z" />
        </svg>
      );
    case "gem":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
          <path d="M12 3l7 6-7 12-7-12z" />
        </svg>
      );
    case "rank":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
          <path d="M12 3l1.5 3 3.3.5-2.4 2.3.6 3.3L12 10.6 9 12.1l.6-3.3-2.4-2.3 3.3-.5z" />
          <path d="M6 15h12l-1 6H7z" />
        </svg>
      );
    default:
      return null;
  }
}

function BadgeMedal({ colorClass }: { colorClass: string }) {
  return (
    <svg className={`h-14 w-14 ${colorClass}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.3l-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z" />
    </svg>
  );
}

export default function Profil() {
  const { id } = useParams();
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    async function load() {
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
    }

    if (id) {
      load();
    }
  }, [id]);

  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
<Sidebar activeLabel="Leaderboard" />

      {/* Main */}
      <main className="flex-1 p-8">
        {/* Topbar */}
        <div className="mb-8 flex justify-end">
          <button aria-label="Profile" className="text-[#5c5775]">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
            </svg>
          </button>
        </div>

        {/* Header: avatar + name + stats */}
        <div className="mb-6 flex items-start gap-8">
          <div className="flex h-[178px] w-[178px] items-center justify-center rounded-2xl bg-[#4a3f7a]">
            <svg className="h-20 w-20 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20a8 8 0 0 1 16 0" />
            </svg>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#3d3466]">
              {student?.nama_mahasiswa ?? "Mahasiswa"}
            </h1>
            <p className="mb-4 text-sm text-[#a79fd6]">Malang City Hardcore</p>

            <div className="flex gap-4">
              {STATS.map((stat) => {
                const value =
                  stat.key === "nilai"
                    ? String(student?.Nilai ?? 0)
                    : stat.value;

                return (
                  <div
                    key={stat.key}
                    className="flex items-center gap-3 rounded-xl bg-[#4a3f7a] px-5 py-4"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                      <StatIcon name={stat.icon} />
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-white">{value}</p>
                      <p className="text-xs text-[#c9c3e6]">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Badges + Progress */}
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-2xl bg-[#8a80b8] p-6 text-white">
            <div className="mb-6 flex items-center gap-2">
              <h2 className="text-lg font-bold">Badges</h2>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4a3f7a] text-xs font-bold">
                {BADGES.length}
              </span>
            </div>
            <div className="mb-6 flex justify-center gap-6">
              {BADGES.map((badge, i) => (
                <BadgeMedal key={i} colorClass={badge.color} />
              ))}
            </div>
            <div className="border-t border-white/30 pt-3 text-center">
              <a href="#" className="text-sm font-medium hover:underline">
                Lihat Semua
              </a>
            </div>
          </div>

          <div className="rounded-2xl bg-[#8a80b8] p-6 text-white">
            <h2 className="text-lg font-bold">Progress Pembelajaran</h2>
          </div>
        </div>
      </main>
    </div>
  );
}

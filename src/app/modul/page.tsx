"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase"; // Sesuaikan path ini

// Sesuaikan dengan kolom di tabel "modul" Supabase-mu
type ModulDB = {
  id_modul: number;
  nama_modul: string;
  id_level: number;
  thumbnail_url: string;
};

export default function ModulPembelajaran() {
  const [filter, setFilter] = useState("all");
  const [daftarModul, setDaftarModul] = useState<ModulDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  // 1. Fetch Data dari Supabase
  useEffect(() => {
    async function fetchModul() {
      const { data, error } = await supabase
        .from('modul')
        .select('id_modul, nama_modul, id_level, thumbnail_url');

      if (data && !error) {
        setDaftarModul(data);
      } else {
        console.error("Gagal menarik data modul:", error);
      }
      setIsLoading(false);
    }
    fetchModul();
  }, []);

  // Fungsi helper untuk mapping id_level ke string E/M/H dan perhitungan XP
  const getDifficulty = (level: number) => {
    if (level === 1) return { label: "E", color: "bg-green-500", xp: 50 };
    if (level === 2) return { label: "M", color: "bg-yellow-500", xp: 100 };
    return { label: "H", color: "bg-red-500", xp: 150 };
  };

  // Logika Filter
  const filteredModul = daftarModul.filter((modul) => {
    const diff = getDifficulty(modul.id_level).label;
    const matchCategory = filter === "all" || diff === filter;
    const matchSearch = modul.nama_modul.toLowerCase().includes(searchQuery);
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-8">
      {/* HEADER & FILTER BUTTONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#5B5288]">
            Modul Pembelajaran 
          </h1>
          {searchQuery ? (
            <p className="text-gray-500 mt-1">
              Menampilkan hasil untuk pencarian: <span className="font-bold text-[#5B5288]">"{searchQuery}"</span>
            </p>
          ) : (
            <p className="text-gray-500 mt-1">
              Pilih modul yang ingin kamu kuasai dan kumpulkan XP-nya!
            </p>
          )}
        </div>

        <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-gray-100 shadow-sm">
          {[
            { key: "all", label: "Semua" },
            { key: "E", label: "Easy" },
            { key: "M", label: "Medium" },
            { key: "H", label: "Hard" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
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
          <p className="text-gray-500">Coba cari dengan kata kunci lain.</p>
        </div>
      ) : (
        /* GRID KARTU MODUL */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredModul.map((modul) => {
            const diffInfo = getDifficulty(modul.id_level);
            
            return (
              <div
                key={modul.id_modul}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col overflow-hidden"
              >
                <div className="relative h-48 w-full">
                  <img
                    src={modul.thumbnail_url || "/images/placeholder.png"}
                    alt={modul.nama_modul}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className={`absolute -bottom-5 left-4 w-11 h-11 ${diffInfo.color} rounded-full flex items-center justify-center font-bold text-white text-xl border-4 border-white shadow-sm`}
                  >
                    {diffInfo.label}
                  </div>
                </div>

                <div className="p-5 pt-8 flex flex-col flex-1">
                  <h3 className="text-xl font-bold text-[#5B5288]">
                    {modul.nama_modul}
                  </h3>

                  <div className="flex items-center gap-1 mt-1 text-[#D97706] font-bold text-sm mb-4">
                    <span>⚡ +{diffInfo.xp} XP</span>
                  </div>

                  <Link
                    href={`/modul/${modul.id_modul}`}
                    className="mt-auto w-full py-2.5 rounded-lg border border-[#5B5288]/50 text-[#5B5288] hover:bg-[#5B5288]/10 flex items-center justify-center gap-2 font-bold text-sm transition-all"
                  >
                    Lihat Modul
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
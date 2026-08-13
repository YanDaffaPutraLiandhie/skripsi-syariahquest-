"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

type QuizDB = {
  id_quis: number;
  nama_kuis: string; // Mengikuti kolom di tabel databasemu
};

export default function DaftarKuisPage() {
  const [daftarKuis, setDaftarKuis] = useState<QuizDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  // 1. Fetch Data Kuis dari Supabase
  useEffect(() => {
    async function fetchKuis() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('quis')
          .select('id_quis, nama_kuis')
          .order('id_quis', { ascending: true });

        if (data && !error) {
          setDaftarKuis(data);
        } else {
          console.error("Gagal menarik data kuis:", error);
        }
      } catch (err) {
        console.error("Error tidak terduga:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchKuis();
  }, []);

  // 2. Logika Pencarian
  const filteredKuis = daftarKuis.filter((kuis) => {
    const namaKuis = kuis.nama_kuis ? kuis.nama_kuis.toLowerCase() : "";
    return namaKuis.includes(searchQuery);
  });

  return (
    // Wrapper disamakan persis dengan ModulPembelajaran (tanpa max-w padding berlebih)
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#5B5288]">
            Kuis Ujian
          </h1>
          {searchQuery ? (
            <p className="text-gray-500 mt-1">
              Menampilkan hasil untuk pencarian: <span className="font-bold text-[#5B5288]">"{searchQuery}"</span>
            </p>
          ) : (
            <p className="text-gray-500 mt-1">
              Kerjakan ujian mandiri untuk menguji pemahamanmu dan raih XP tambahan!
            </p>
          )}
        </div>
      </div>

      {/* TAMPILAN JIKA LOADING ATAU KOSONG */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-500 font-bold flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#5B5288] animate-spin" />
          Memuat Daftar Kuis...
        </div>
      ) : filteredKuis.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-700">Kuis tidak ditemukan</h3>
          <p className="text-gray-500">Belum ada kuis yang ditambahkan oleh dosen.</p>
        </div>
      ) : (
        /* GRID KARTU KUIS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredKuis.map((kuis) => (
            <div
              key={kuis.id_quis}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col overflow-hidden group"
            >
              {/* GAMBAR THUMBNAIL */}
              <div className="relative h-48 w-full bg-[#E6E4F0]">
                {/* Menggunakan pattern shapes dari dicebear agar otomatis dinamis & estetik */}
                <img
                  src={`https://api.dicebear.com/7.x/shapes/svg?seed=quiz${kuis.id_quis}&backgroundColor=5B5288`}
                  alt={kuis.nama_kuis || `Kuis ${kuis.id_quis}`}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </div>

              {/* KONTEN CARD */}
              <div className="p-5 pt-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-[#5B5288] line-clamp-2">
                  {kuis.nama_kuis || `Evaluasi Pemahaman #${kuis.id_quis}`}
                </h3>

                <div className="flex items-center gap-1 mt-1 text-[#D97706] font-bold text-sm mb-4">
                  <span>⚡ Kumpulkan XP Ujian</span>
                </div>

                {/* TOMBOL AKSI */}
                <Link
                  href={`/kuis/${kuis.id_quis}`}
                  className="mt-auto w-full py-2.5 rounded-lg border border-[#5B5288]/50 text-[#5B5288] hover:bg-[#5B5288]/10 flex items-center justify-center gap-2 font-bold text-sm transition-all"
                >
                  Kerjakan Kuis
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
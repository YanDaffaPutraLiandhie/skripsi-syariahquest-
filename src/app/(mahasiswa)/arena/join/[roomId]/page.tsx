"use client";

import { useState, useEffect, useRef } from "react";
import CreateRoomModal from "@/components/Arena/CreateRoomModal";
import JoinRoomModal from "@/components/Arena/JoinRoomModal";
import ThemeCard from "@/components/Arena/ThemeCard";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type GameTema = {
  id_game: number;
  nama_game: string;
  deskripsi: string;
  thumbnail_url: string;
};

// Tips: untuk hasil terbaik, tambahkan font "Baloo 2" atau "Fredoka" di layout.tsx
// lewat next/font/google, lalu terapkan sebagai --font-display. Kalau belum ada,
// halaman ini otomatis jatuh ke font sans bawaan, jadi tetap aman dipakai sekarang.

export default function ArenaKelas() {
  const { profile } = useCurrentUser();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<number>(0);

  const [papanTema, setPapanTema] = useState<GameTema[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // STATE UNTUK STATISTIK ASLI DARI DATABASE
  const [stats, setStats] = useState({ menang: 0, jebakan: 0, main: 0 });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // ==========================================
  // FITUR DRAG-TO-SCROLL (GESER PAKAI MOUSE)
  // ==========================================
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  // FETCH TEMA GAME
  useEffect(() => {
    async function fetchGames() {
      const { data, error } = await supabase
        .from("game")
        .select("id_game, nama_game, deskripsi, thumbnail_url")
        .eq("is_aktif", true)
        .order("created_at", { ascending: true });

      if (data && !error) {
        setPapanTema(data as GameTema[]);
      }
      setIsLoading(false);
    }
    fetchGames();
  }, []);

  // FETCH STATISTIK ARENA DARI TABEL MAHASISWA
  useEffect(() => {
    async function fetchStats() {
      if (!profile?.idMahasiswa) return;
      setIsStatsLoading(true);

      const { data, error } = await supabase
        .from("mahasiswa")
        .select("arena_menang, arena_jebakan, arena_main")
        .eq("id_mahasiswa", profile.idMahasiswa)
        .single();

      if (data && !error) {
        setStats({
          menang: data.arena_menang || 0,
          jebakan: data.arena_jebakan || 0,
          main: data.arena_main || 0,
        });
      }
      setIsStatsLoading(false);
    }
    fetchStats();
  }, [profile?.idMahasiswa]);

  const scrollToTema = () => {
    document.getElementById("pilihan-tema")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleBukaModalBuatRuang = (id_game: number) => {
    setSelectedGameId(id_game);
    setShowCreateModal(true);
  };

  // ==========================================
  // LOGIKA GRAFIK DONAT (HOVER)
  // ==========================================
  const statsData = [
    { id: "win", label: "Kemenangan", value: stats.menang, color: "#39C936", emoji: "🏆" },
    { id: "trap", label: "Kena Jebakan", value: stats.jebakan, color: "#EF4444", emoji: "💥" },
    { id: "play", label: "Total Main", value: stats.main, color: "#3B82F6", emoji: "🎲" },
  ];

  const [hoveredStat, setHoveredStat] = useState<(typeof statsData)[0] | null>(null);

  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const totalStats = statsData.reduce((acc, curr) => acc + curr.value, 0);
  let currentOffset = 0;

  // RANK SEDERHANA BERDASARKAN JUMLAH KEMENANGAN (murni tampilan, dari data asli)
  const rank =
    stats.menang >= 20
      ? { label: "Grandmaster", emoji: "👑" }
      : stats.menang >= 10
        ? { label: "Juara Arena", emoji: "🥇" }
        : stats.menang >= 5
          ? { label: "Jagoan Kelas", emoji: "🥈" }
          : stats.menang >= 1
            ? { label: "Pemain Aktif", emoji: "🥉" }
            : { label: "Baru Mulai", emoji: "🎮" };

  const cardTilt = ["-rotate-2", "rotate-2", "-rotate-1", "rotate-1"];

  return (
    <div className="space-y-10">
      {/* BANNER UNGU — sekarang dengan bintang mengambang & tombol ala arcade */}
      <div className="relative mt-4 flex min-h-[28rem] items-end justify-between overflow-hidden rounded-[32px] bg-gradient-to-br from-[#6C5CE7] via-[#5142B8] to-[#2A224D] p-5 shadow-xl shadow-[#3d3466]/25 sm:mt-8 sm:p-8 lg:mt-12 lg:h-80 lg:min-h-0 lg:p-12">
        {/* Bintang mengambang */}
        <div className="pointer-events-none absolute right-[30%] top-8 text-2xl text-[#FFC93C] float-slow">
          ✨
        </div>
        <div className="pointer-events-none absolute right-[10%] top-14 text-xl text-white/60 float-fast">
          ⭐
        </div>
        <div className="pointer-events-none absolute right-[18%] bottom-16 text-lg text-[#FF6B9D] float-fast">
          ✨
        </div>

        {/* Garis lengkung dekoratif */}
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

        {/* Badge stiker pojok */}
        <div className="absolute left-8 top-8 z-10 rotate-[-6deg] rounded-2xl bg-[#FFC93C] px-4 py-1.5 text-xs font-black uppercase tracking-wide text-[#4a3a00] shadow-md">
          🎮 Arena Kelas
        </div>

        <div className="z-10 text-white space-y-6 max-w-xl relative mt-6">
          <h1 className="text-4xl lg:text-5xl font-black leading-snug tracking-wide">
            Halo, {profile?.namaMahasiswa?.split(" ")[0] || "Pemain"}! <br />
            <span className="font-semibold text-2xl lg:text-3xl text-[#d9d3f7]">
              Siap menantang teman sekelasmu hari ini?
            </span>
          </h1>

          <div className="flex flex-wrap gap-4 mt-2">
            <button
              onClick={scrollToTema}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 border-b-4 border-amber-600 px-8 py-3 text-sm font-bold text-amber-950 transition-all hover:brightness-105 active:translate-y-1 active:border-b-0"
            >
              🚀 Buat Ruang Baru
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 border-b-4 border-white/20 px-8 py-3 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 active:translate-y-1 active:border-b-0"
            >
              🔑 Gabung Ruang
            </button>
          </div>
        </div>

        {/* GAMBAR HERO */}
        <div className="absolute right-8 bottom-[-20px] z-0 h-[125%] flex items-end pointer-events-none opacity-90">
          <img
            src="/images/hero-arenakelas.svg"
            alt="Hero Arena"
            className="h-full w-auto object-contain object-bottom"
          />
        </div>

        {/* Bottom Wave Decoration */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 opacity-20">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-full fill-white">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.94,130.83,121.3,201,115.8,241.6,112.5,282.6,98.2,321.39,56.44Z" />
          </svg>
        </div>
      </div>

      {/* KONTEN BAWAH */}
      <div id="pilihan-tema" className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        {/* KOLOM KIRI (PILIHAN TEMA) */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="mb-4 flex items-center gap-3">
            <h3 className="text-2xl font-bold text-[#5B5288]">Pilihan Tema Papan</h3>
            {!isLoading && papanTema.length > 0 && (
              <span className="rounded-full bg-[#6C5CE7]/10 px-3 py-1 text-xs font-bold text-[#6C5CE7]">
                {papanTema.length} tersedia
              </span>
            )}
          </div>

          {/* "Papan permainan" — bingkai putus-putus di belakang kartu supaya berasa seperti rak game */}
          <div className="relative rounded-[28px] border-2 border-dashed border-[#6C5CE7]/20 bg-gradient-to-b from-[#f6f4ff] to-transparent p-5">
            <div
              ref={scrollContainerRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className={`flex gap-6 overflow-x-auto no-scrollbar py-3 px-1 select-none ${isDragging ? "cursor-grabbing snap-none" : "cursor-grab snap-x"
                }`}
            >
              {isLoading ? (
                <p className="text-gray-400 italic">Memuat tema permainan...</p>
              ) : papanTema.length > 0 ? (
                papanTema.map((papan, i) => (
                  <div
                    key={papan.id_game}
                    className={`snap-start pointer-events-auto transition-transform duration-200 hover:rotate-0 hover:scale-[1.03] ${cardTilt[i % cardTilt.length]
                      }`}
                  >
                    <ThemeCard
                      id_game={papan.id_game}
                      nama_game={papan.nama_game}
                      deskripsi={papan.deskripsi}
                      thumbnail_url={papan.thumbnail_url}
                      onBuatRuang={handleBukaModalBuatRuang}
                    />
                  </div>
                ))
              ) : (
                <p className="text-gray-400 italic">Belum ada tema permainan yang aktif.</p>
              )}
            </div>
          </div>
        </div>

        {/* KOLOM KANAN (STATISTIK) — dibingkai seperti kotak trofi */}
        <div className="flex flex-col">
          <h3 className="text-2xl font-bold text-[#5B5288] mb-4">Statistik Pertempuran</h3>

          <div className="relative flex-1 rounded-[28px] border-2 border-[#6C5CE7]/10 bg-white p-8 shadow-sm overflow-hidden">
            {/* Titik-titik dekoratif ala kertas permainan */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: "radial-gradient(#4a3f7a 1.5px, transparent 1.5px)",
                backgroundSize: "16px 16px",
              }}
            />

            {isStatsLoading ? (
              <div className="relative flex flex-col items-center gap-4 animate-pulse">
                <div className="w-40 h-40 rounded-full border-[20px] border-gray-100"></div>
                <div className="w-24 h-4 bg-gray-100 rounded"></div>
              </div>
            ) : (
              <div className="relative flex flex-col items-center">
                {/* Badge rank */}
                <div className="mb-4 flex items-center gap-2 rounded-full bg-[#FFC93C]/15 px-4 py-1.5 text-xs font-black text-[#8a6d00]">
                  <span className="text-base">{rank.emoji}</span>
                  {rank.label}
                </div>

                {/* WADAH SVG CHART */}
                <div className="relative w-48 h-48 mb-6 flex items-center justify-center">
                  <svg
                    className="w-full h-full transform -rotate-90 drop-shadow-md"
                    viewBox="0 0 100 100"
                  >
                    <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#F3F4F6" strokeWidth="20" />

                    {totalStats > 0 &&
                      statsData.map((stat) => {
                        if (stat.value === 0) return null;

                        const strokeDasharray = `${(stat.value / totalStats) * circumference} ${circumference}`;
                        const strokeDashoffset = -currentOffset;
                        currentOffset += (stat.value / totalStats) * circumference;

                        return (
                          <circle
                            key={stat.id}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke={stat.color}
                            strokeWidth="20"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-300 cursor-pointer hover:stroke-[24px]"
                            onMouseEnter={() => setHoveredStat(stat)}
                            onMouseLeave={() => setHoveredStat(null)}
                          />
                        );
                      })}
                  </svg>

                  {/* Teks di Tengah Donat */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    {hoveredStat ? (
                      <>
                        <span className="text-2xl">{hoveredStat.emoji}</span>
                        <span className="text-3xl font-black" style={{ color: hoveredStat.color }}>
                          {hoveredStat.value}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2">
                          {hoveredStat.label}
                        </span>
                      </>
                    ) : totalStats === 0 ? (
                      <span className="text-xs font-bold text-gray-400">
                        Belum <br /> Pernah Main
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-gray-400">
                        Arahkan <br /> Mouse
                      </span>
                    )}
                  </div>
                </div>

                {/* Legenda Bawah — bentuk pil dengan emoji */}
                <div className="flex flex-wrap justify-center gap-2 w-full">
                  {statsData.map((stat) => (
                    <div
                      key={`legend-${stat.id}`}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${stat.value === 0
                          ? "opacity-40 bg-gray-50"
                          : "cursor-pointer bg-gray-50 hover:scale-105"
                        }`}
                      style={{
                        boxShadow: hoveredStat?.id === stat.id ? `0 0 0 2px ${stat.color}` : undefined,
                      }}
                      onMouseEnter={() => stat.value > 0 && setHoveredStat(stat)}
                      onMouseLeave={() => setHoveredStat(null)}
                    >
                      <span className="text-sm">{stat.emoji}</span>
                      <span className="text-xs font-bold text-gray-600">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && selectedGameId !== 0 && (
        <CreateRoomModal gameId={selectedGameId} onClose={() => setShowCreateModal(false)} />
      )}

      {showJoinModal && <JoinRoomModal onClose={() => setShowJoinModal(false)} />}

      <style jsx>{`
        .float-slow {
          animation: float 4.5s ease-in-out infinite;
        }
        .float-fast {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .float-slow,
          .float-fast {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
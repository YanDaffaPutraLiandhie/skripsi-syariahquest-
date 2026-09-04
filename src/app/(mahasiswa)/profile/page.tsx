"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useBadges } from "@/hooks/useBadges";
import { useProgressModul } from "@/hooks/useProgressModul";
import { Loader2, Trophy, ArrowRight, TrendingUp } from "lucide-react";
import EditProfileModal from "@/components/Profile/EditProfileModal";

// IMPORT MODAL BADGES
import AllBadgesModal from "@/components/Profile/AllBadgesModal";

export default function ProfilePage() {
  const { profile, isLoading, refetch } = useCurrentUser();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);

  const { badges: userBadges, isLoading: isBadgesLoading } = useBadges(
    profile?.idMahasiswa
  );

  const { progress, isLoading: isProgressLoading } = useProgressModul(
    profile?.idMahasiswa
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#5B5288] animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Gagal memuat profil. Coba refresh halaman.
      </div>
    );
  }

  const avatarSrc =
    profile.avatarUrl || "/images/avatars/avatar1.svg";

  const maxItems = Math.max(progress.length - 1, 1);

  const chartPoints = progress
    .map((p, i) => {
      const x = 5 + (i / maxItems) * 90;
      const y = 55 - p.nilai / 2;

      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints =
    progress.length > 1
      ? `5,60 ${chartPoints} ${
          5 + ((progress.length - 1) / maxItems) * 90
        },60`
      : "";

  return (
    <div className="space-y-6 w-full">
      {/* PROFILE HEADER BANNER */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] shadow-lg shadow-[#3d3466]/25 mt-4 p-8 lg:p-10">
        
        {/* Header Banner Background SVGs */}
        <div className="absolute right-[28%] top-6 h-5 w-5 text-white/40">✨</div>
        <div className="absolute right-[8%] top-10 h-4 w-4 text-[#f2c94c] animate-pulse">✨</div>
        
        {/* Banner Decorative Curved Lines */}
        <div className="pointer-events-none absolute -right-10 top-0 opacity-20">
          <svg width="300" height="200" viewBox="0 0 300 200" fill="none">
            <path d="M50 0 C 150 100, 200 50, 300 200" stroke="white" strokeWidth="3" strokeDasharray="6 6" />
            <circle cx="200" cy="80" r="40" stroke="#f2c94c" strokeWidth="2" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* AVATAR */}
          <div className="relative">
            <div className="bg-[#5B5288] rounded-full w-40 h-40 md:w-48 md:h-48 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-xl border-4 border-amber-400">
              <img
                src={avatarSrc}
                alt="Avatar Profil"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            {/* BUTTON EDIT */}
            <button
              onClick={() => {
                if (profile.idMahasiswa !== null) {
                  setShowEditModal(true);
                } else {
                  console.error(
                    "ID mahasiswa tidak ditemukan. Tidak dapat membuka edit profil."
                  );
                }
              }}
              className="absolute bottom-2 right-2 bg-amber-400 text-amber-950 p-3 rounded-full hover:bg-amber-300 transition-all shadow-md active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          </div>

          {/* PROFILE INFO */}
          <div className="flex-1 flex flex-col justify-between h-full w-full text-center md:text-left">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-[#e2dcff] backdrop-blur-md border border-white/15 shadow-inner mb-3">
                <span className="text-amber-300">✨</span>
                Profil Mahasiswa
              </span>

              <h1 className="text-3xl md:text-4xl font-black text-white tracking-wide">
                {profile.namaMahasiswa}
              </h1>

              <p className="text-[#c9c3e6] font-medium text-sm md:text-base mt-2">
                {profile.deskripsi || "Belum ada deskripsi"}
              </p>
            </div>

            {/* STATISTIK */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 mt-6">
              {/* MODUL SELESAI */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 text-white shadow-inner border border-white/15">
                <div className="bg-white/20 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="text-center md:text-left">
                  <div className="text-xl md:text-2xl font-black">{profile.modulSelesai}</div>
                  <div className="text-[10px] text-[#c9c3e6] font-bold uppercase tracking-wider">Selesai</div>
                </div>
              </div>

              {/* TOTAL XP */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 text-white shadow-inner border border-white/15">
                <div className="bg-white/20 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="text-center md:text-left">
                  <div className="text-xl md:text-2xl font-black text-amber-300">{profile.totalXp}</div>
                  <div className="text-[10px] text-[#c9c3e6] font-bold uppercase tracking-wider">Total XP</div>
                </div>
              </div>

              {/* PERINGKAT */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 text-white shadow-inner border border-white/15">
                <div className="bg-white/20 p-2 rounded-full">
                  <Trophy className="h-6 w-6 text-amber-300" />
                </div>
                <div className="text-center md:text-left">
                  <div className="text-xl md:text-2xl font-black">#{profile.peringkat}</div>
                  <div className="text-[10px] text-[#c9c3e6] font-bold uppercase tracking-wider">Peringkat</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Wave Decoration */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 opacity-20">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-full fill-white">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.94,130.83,121.3,201,115.8,241.6,112.5,282.6,98.2,321.39,56.44Z" />
          </svg>
        </div>
      </div>

      {/* BADGES DAN PROGRESS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* BADGES */}
        <div className="bg-[#5B5288] rounded-3xl p-6 text-white shadow-md flex flex-col h-80 relative">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-2xl font-extrabold">
              Badges
            </h3>

            <span className="bg-white/20 px-3 py-1 rounded-xl text-sm font-bold shadow-inner">
              {isBadgesLoading ? "..." : userBadges.length}
            </span>
          </div>

          <div className="flex justify-center items-center gap-6 flex-1 pb-8 overflow-hidden">
            {isBadgesLoading ? (
              <Loader2 className="w-8 h-8 animate-spin opacity-50" />
            ) : userBadges.length === 0 ? (
              <p className="text-sm opacity-60">
                Belum ada badge yang diperoleh.
              </p>
            ) : (
              userBadges.slice(0, 3).map((badge, idx) => (
                <div
                  key={badge.id_badge}
                  title={`${badge.nama_badge} - ${badge.syarat}`}
                  className={`w-24 h-24 ${
                    idx === 1
                      ? "w-28 h-28 transform scale-110 z-10 shadow-2xl shadow-purple-900/50"
                      : "transform -translate-y-2 shadow-lg opacity-90 hover:opacity-100"
                  } bg-purple-500 rounded-full border-4 border-white/20 flex items-center justify-center overflow-hidden transition-all hover:scale-110 cursor-help`}
                >
                  <img
                    src={badge.icon_url}
                    alt={badge.nama_badge}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))
            )}
          </div>

          <div className="mt-auto border-t border-white/10 pt-4 flex justify-center">
            <button
              onClick={() => setShowAllBadges(true)}
              className="text-sm font-bold hover:text-white/80 transition-colors flex items-center gap-1 group bg-white/10 px-6 py-2 rounded-full hover:bg-white/20"
            >
              Lihat Semua Koleksi

              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* PROGRES MODUL */}
        <div className="bg-[#5B5288] rounded-3xl p-6 text-white shadow-md flex flex-col h-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-extrabold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-easy" />
              Progres Modul
            </h3>
          </div>

          <p className="text-sm text-white/70 font-medium mb-4">
            Statistik nilai{" "}
            {progress.length > 0 ? progress.length : ""} modul terakhir
            yang diselesaikan.
          </p>

          <div className="mt-auto flex-1 flex flex-col justify-end relative pb-4">
            {isProgressLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin opacity-50" />
              </div>
            ) : progress.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-60">
                <TrendingUp className="w-10 h-10 mb-2 opacity-50" />

                <p className="text-sm">
                  Belum ada progress modul.
                  <br />
                  Ayo selesaikan modul pertamamu!
                </p>
              </div>
            ) : (
              <div className="w-full h-32 relative border-b-2 border-white/10">
                <svg
                  viewBox="0 0 100 60"
                  className="w-full h-full overflow-visible absolute inset-0"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="lineGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#20DC7E"
                        stopOpacity="0.4"
                      />

                      <stop
                        offset="100%"
                        stopColor="#20DC7E"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  <line
                    x1="0"
                    y1="5"
                    x2="100"
                    y2="5"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="0.5"
                    strokeDasharray="2 2"
                  />

                  <line
                    x1="0"
                    y1="30"
                    x2="100"
                    y2="30"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="0.5"
                    strokeDasharray="2 2"
                  />

                  {progress.length > 1 && (
                    <polygon
                      points={areaPoints}
                      fill="url(#lineGrad)"
                    />
                  )}

                  <polyline
                    points={chartPoints}
                    fill="none"
                    stroke="#20DC7E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-[0_0_8px_rgba(32,220,126,0.8)]"
                  />
                </svg>

                {progress.map((p, i) => {
                  const leftPos =
                    5 + (i / maxItems) * 90;

                  const topPos =
                    ((55 - p.nilai / 2) / 60) * 100;

                  return (
                    <div
                      key={i}
                      className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full cursor-pointer group flex items-center justify-center"
                      style={{
                        left: `${leftPos}%`,
                        top: `${topPos}%`,
                      }}
                    >
                      <div className="w-2.5 h-2.5 bg-[#5B5288] border-2 border-easy rounded-full group-hover:scale-150 transition-all" />

                      <div className="absolute bottom-6 opacity-0 group-hover:opacity-100 bg-white text-[#5B5288] text-[10px] font-black px-2 py-1 rounded shadow-lg transition-all pointer-events-none z-20">
                        Nilai: {p.nilai}
                      </div>

                      <div className="absolute top-[100px] text-[10px] font-bold text-white/60 whitespace-nowrap">
                        M{p.id_modul}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditModal && profile.idMahasiswa !== null && (
        <EditProfileModal
          mahasiswaId={profile.idMahasiswa}
          initialName={profile.namaMahasiswa}
          initialDesc={profile.deskripsi}
          initialAvatar={profile.avatarUrl}
          onClose={() => setShowEditModal(false)}
          onSuccess={refetch}
        />
      )}

      {/* ALL BADGES MODAL */}
      <AllBadgesModal
        isOpen={showAllBadges}
        onClose={() => setShowAllBadges(false)}
        badges={userBadges}
      />
    </div>
  );
}
"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  WorldMap,
  WorldMapPin,
  ResourceHUD,
  MissionCard,
  QuestPanel,
  type PinStatus,
} from "@/components/visual-novel";
import {
  Sparkles,
  ArrowRight,
  Compass,
  GraduationCap,
  Store,
  Landmark,
  Anchor,
  Building2,
  BookOpen,
  Map as MapIcon,
  ListTodo,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
} from "lucide-react";

type CityLocation = {
  id: string;
  name: string;
  district: string;
  desc: string;
  href: string;
  x: number;
  y: number;
  status: PinStatus;
  buildingImg: string;
  sceneBg: string;
  icon: any;
  rewardXp: number;
  duration: string;
  levelReq: string;
};

const CITY_LOCATIONS: CityLocation[] = [
  {
    id: "kampus",
    name: "Kampus Madani",
    district: "Area Akademik & Riset",
    desc: "Pusat pembelajaran teori fiqih muamalah, ruang kelas interaktif, modul kurikulum, serta video kuliah bersama pengajar.",
    href: "/mahasiswa/modul",
    x: 22,
    y: 62,
    status: "available",
    buildingImg: "/game/bangunan/bangunan_D_kampus.png",
    sceneBg: "/game/scene-3.jpg",
    icon: GraduationCap,
    rewardXp: 50,
    duration: "5-8 menit",
    levelReq: "Level 1 (Terbuka)",
  },
  {
    id: "pasar",
    name: "Pasar Syariah",
    district: "Sentra Transaksi Riil",
    desc: "Uji kemampuan akad jual beli, kenali larangan riba, gharar, dan tadlis dalam minigame arena pasar muamalah interaktif.",
    href: "/mahasiswa/arena",
    x: 50,
    y: 52,
    status: "available",
    buildingImg: "/game/bangunan/bangunan_B_pasar.png",
    sceneBg: "/game/scene-4.jpg",
    icon: Store,
    rewardXp: 80,
    duration: "8-10 menit",
    levelReq: "Level 1 (Terbuka)",
  },
  {
    id: "bank",
    name: "Bank Syariah Amanah",
    district: "Kawasan Finansial & Akad",
    desc: "Temui nasabah dan klien bisnis, pecahkan kasus pembiayaan murabahah dan mudharabah dalam petualangan visual novel.",
    href: "/mahasiswa/kuis",
    x: 70,
    y: 56,
    status: "active",
    buildingImg: "/game/bangunan/bangunan_E_bank.png",
    sceneBg: "/game/scene-5.jpg",
    icon: Landmark,
    rewardXp: 100,
    duration: "10-12 menit",
    levelReq: "Misi Aktif",
  },
  {
    id: "pelabuhan",
    name: "Pelabuhan Niaga",
    district: "Pusat Logistik & Peringkat",
    desc: "Tinjau jejak konsultan terbaik di Hall of Fame nasional, perolehan skor prestasi, serta klasemen capaian XP mahasiswa.",
    href: "/mahasiswa/leaderboard",
    x: 88,
    y: 40,
    status: "available",
    buildingImg: "/game/bangunan/bangunan_H_koperasi.png",
    sceneBg: "/game/scene-7.jpg",
    icon: Anchor,
    rewardXp: 40,
    duration: "3 menit",
    levelReq: "Terbuka",
  },
  {
    id: "kantor",
    name: "Kantor Konsultan",
    district: "Pusat Pengelolaan Karier",
    desc: "Tinjau status modul, grafik kompetensi, riwayat penyelesaian kasus, profil diri, serta catatan perjalanan konsultan.",
    href: "/mahasiswa/profile",
    x: 33,
    y: 35,
    status: "available",
    buildingImg: "/game/bangunan/bangunan_A_kantor_konsultasi.png",
    sceneBg: "/game/scene-6.jpg",
    icon: Building2,
    rewardXp: 30,
    duration: "2 menit",
    levelReq: "Terbuka",
  },
  {
    id: "perpustakaan",
    name: "Masjid Jami' & Khazanah Ilmu",
    district: "Pusat Keilmuan & Literasi Syariah",
    desc: "Kaji fatwa resmi DSN-MUI, rujukan standar AAOIFI, dan arsip studi kasus perbankan syariah terapan sebagai referensi.",
    href: "/mahasiswa/modul",
    x: 45,
    y: 20,
    status: "available",
    buildingImg: "/game/bangunan/bangunan_F_masjid.png",
    sceneBg: "/game/scene-1.jpg",
    icon: BookOpen,
    rewardXp: 50,
    duration: "5 menit",
    levelReq: "Terbuka",
  },
];

export default function GameMapPage() {
  const { profile } = useCurrentUser();
  const [selectedLoc, setSelectedLoc] = useState<CityLocation>(CITY_LOCATIONS[0]);
  const [activeTab, setActiveTab] = useState<"map" | "missions" | "quests">("map");

  const totalXp = profile?.totalXp || 210;
  const koin = profile?.totalPoin || "1.250";
  const badgeCount = profile?.modulSelesai || 3;

  return (
    <div className="min-h-screen w-full bg-[#110b24] text-white p-3 sm:p-6 flex flex-col gap-5 select-none">
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-5">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-purple-900/40">
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7858ca] via-[#5740a0] to-[#39268d] border-2 border-[#ffc94a]/60 shadow-[0_0_25px_rgba(120,88,202,0.6)]">
              <Compass className="w-6 h-6 text-[#ffc94a] animate-spin-slow" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#ffc94a] border border-[#110b24]" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest text-[#d8c7ff] uppercase">
                <Sparkles className="w-3.5 h-3.5 text-[#ffc94a]" />
                <span>EXPLORATION · KOTA SYARIAH HD</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Peta Petualangan Syariah-Quest
              </h1>
            </div>
          </div>

          {/* View Mode Tabs & Resource HUD */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center p-1 rounded-2xl bg-[#1f153a] border border-purple-500/30 text-xs font-bold shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab("map")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${activeTab === "map"
                  ? "bg-gradient-to-r from-[#7858ca] to-[#5740a0] text-white shadow-md font-black"
                  : "text-purple-300 hover:text-white"
                  }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Peta Kota</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("missions")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${activeTab === "missions"
                  ? "bg-gradient-to-r from-[#7858ca] to-[#5740a0] text-white shadow-md font-black"
                  : "text-purple-300 hover:text-white"
                  }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#ffc94a]" />
                <span>Daftar Misi</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("quests")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${activeTab === "quests"
                  ? "bg-gradient-to-r from-[#7858ca] to-[#5740a0] text-white shadow-md font-black"
                  : "text-purple-300 hover:text-white"
                  }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>Target Bab</span>
              </button>
            </div>

            <ResourceHUD koin={koin} xp={totalXp} badgeCount={badgeCount} />
          </div>
        </div>

        {/* TAB 1: PETA KOTA INTERAKTIF HD */}
        {activeTab === "map" && (
          <>


            <WorldMap mapSrc="/game/world-map.png" title="Gasbridge City">
              {CITY_LOCATIONS.map((loc) => {
                const isSelected = selectedLoc.id === loc.id;
                return (
                  <WorldMapPin
                    key={loc.id}
                    label={loc.name}
                    sublabel={loc.district}
                    href={loc.href}
                    x={loc.x}
                    y={loc.y}
                    status={loc.status}
                    rewardXp={loc.rewardXp}
                    isSelected={isSelected}
                    onMouseEnter={() => setSelectedLoc(loc)}
                    onClick={() => setSelectedLoc(loc)}
                  />
                );
              })}
            </WorldMap>

            {/* DETAIL LOKASI TERPILIH HD SHOWCASE */}
            <div className="relative rounded-3xl p-5 sm:p-7 bg-gradient-to-r from-[#1f153a] via-[#291b4d] to-[#1f153a] border-2 border-purple-500/40 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6 overflow-hidden">
              {/* Ambient Lighting Glow */}
              <div className="pointer-events-none absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-[#ffc94a]/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-10 -top-10 w-64 h-64 rounded-full bg-purple-600/20 blur-3xl" />

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 w-full lg:w-auto relative z-10 text-center sm:text-left">
                {/* HD Isometric Building Artwork Showcase */}
                <div className="relative shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 border-[#ffc94a]/60 bg-gradient-to-b from-[#2e1d52] to-[#170e2d] shadow-[0_10px_25px_rgba(0,0,0,0.5)] p-2 flex items-center justify-center group">
                  <img
                    src={selectedLoc.buildingImg}
                    alt={selectedLoc.name}
                    className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#1b1238]/90 border border-[#ffc94a]/40 text-[9px] font-black text-[#ffc94a]">
                    HD
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#ffc94a] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>LOKASI TERPILIH</span>
                    </span>
                    <span className="text-[10px] px-3 py-0.5 rounded-full bg-[#7858ca]/40 text-[#d8c7ff] border border-purple-400/30 font-bold">
                      {selectedLoc.district}
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{selectedLoc.levelReq}</span>
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {selectedLoc.name}
                  </h2>

                  <p className="text-xs sm:text-sm text-purple-200/80 mt-1.5 leading-relaxed max-w-2xl">
                    {selectedLoc.desc}
                  </p>

                  {/* Specs Pills */}
                  <div className="mt-3.5 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-purple-200/80 font-bold">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#160f2d] border border-purple-900/50">
                      <Clock className="w-3.5 h-3.5 text-[#ffc94a]" />
                      <span>Estimasi: {selectedLoc.duration}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#160f2d] border border-purple-900/50 text-[#ffc94a] font-black">
                      <Zap className="w-3.5 h-3.5 fill-[#ffc94a]" />
                      <span>Reward: +{selectedLoc.rewardXp} XP</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* High Impact CTA Button */}
              <div className="w-full lg:w-auto shrink-0 relative z-10">
                <Link
                  href={selectedLoc.href}
                  className="w-full lg:w-auto flex items-center justify-center gap-3 px-9 py-4 rounded-2xl bg-gradient-to-r from-[#ffc94a] via-[#fbd36e] to-[#ffc94a] hover:brightness-110 active:scale-95 text-[#251a3d] font-black text-sm shadow-[0_0_30px_rgba(255,201,74,0.45)] transition-all cursor-pointer group"
                >
                  <span>Masuk ke {selectedLoc.name}</span>
                  <ArrowRight className="w-4 h-4 stroke-[3] group-hover:translate-x-1.5 transition-transform" />
                </Link>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: DAFTAR MISI DENGAN MISSIONCARD HD */}
        {activeTab === "missions" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in duration-300">
            <MissionCard
              tag="BAB 01 · TERSEDIA"
              title="Perkenalan di Kampus Madani"
              description="Temui mentor Aisyah dan pelajari dasar-dasar rukun muamalah serta keabsahan akad transaksi."
              duration="5 menit"
              xpReward={50}
              status="available"
              artEmoji="📚"
              artBgGradient="from-[#d8c9ff] to-[#f8e6a8]"
              actionLabel="Mulai Petualangan"
              onAction={() => (window.location.href = "/mahasiswa/modul")}
            />

            <MissionCard
              tag="BAB 02 · TERSEDIA"
              title="Rahasia Pasar Syariah"
              description="Kenali transaksi yang adil, hindari riba, dan selesaikan tantangan akad jual beli di arena pasar."
              duration="8 menit"
              xpReward={80}
              status="available"
              artEmoji="🛍️"
              artBgGradient="from-[#b6e7d7] to-[#f9e1ad]"
              actionLabel="Masuk ke Arena Pasar"
              onAction={() => (window.location.href = "/mahasiswa/arena")}
            />

            <MissionCard
              tag="BAB 03 · AKTIF"
              title="Janji di Bank Syariah Amanah"
              description="Pecahkan kasus nasabah nyata terkait pembiayaan murabahah bersama mentor di ruang konsultasi."
              duration="10 menit"
              xpReward={100}
              status="available"
              artEmoji="🏦"
              artBgGradient="from-[#c7d7f8] to-[#d7c2f6]"
              actionLabel="Buka Visual Novel"
              onAction={() => (window.location.href = "/game")}
            />
          </div>
        )}

        {/* TAB 3: TARGET BAB DENGAN QUESTPANEL HD */}
        {activeTab === "quests" && (
          <div className="max-w-3xl mx-auto w-full animate-in fade-in duration-300">
            <QuestPanel
              title="Objektif Utama Perjalanan Syariah"
              subtitle="Selesaikan setiap tahapan misi konsultasi untuk membuka lencana dan pulau baru di peta"
              objectives={[
                {
                  id: "q1",
                  title: "Kunjungi Kampus Madani dan selesaikan modul pengantar muamalah",
                  isCompleted: true,
                  reward: "+50 XP",
                },
                {
                  id: "q2",
                  title: "Uji pengetahuan di Minigame Pasar Syariah",
                  isCompleted: false,
                  reward: "+80 XP",
                },
                {
                  id: "q3",
                  title: "Selesaikan 3 adegan konsultasi di Visual Novel Bank Syariah",
                  isCompleted: false,
                  reward: "+100 XP",
                },
                {
                  id: "q4",
                  title: "Raih skor minimal 80% tanpa perlu sesi remedial",
                  isCompleted: false,
                  reward: "Badge Master",
                },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

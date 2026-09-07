"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Sparkles,
  ChevronRight,
  HelpCircle,
  Puzzle,
  Star,
  Diamond,
  BookOpen,
  Users,
  Trophy,
  Shield,
  Zap,
  Award,
  Hexagon,
} from "lucide-react";

type Modul = {
  id_modul: number;
  nama_modul: string;
  id_level: number;
};

type LeaderboardRow = {
  no: number;
  name: string;
  score: number;
};

const DEFAULT_MODULES: Modul[] = [
  { id_modul: 1, nama_modul: "Hukum Keuangan", id_level: 3 },
  { id_modul: 2, nama_modul: "Riba", id_level: 3 },
  { id_modul: 3, nama_modul: "Contoh Keuangan", id_level: 1 },
];

// Tinggi tetap area daftar modul (pas untuk ~4-5 modul
// terlihat), sisanya bisa discroll di dalam kotak.
const MODUL_LIST_HEIGHT = 420; // px

// =====================================================
// Info visual tiap level modul — warna diselaraskan
// dengan skema level yang sudah dipakai di app (hijau/
// kuning/merah), bukan palet baru.
// =====================================================

function getLevelInfo(idLevel: number) {
  if (idLevel === 1)
    return { label: "E", name: "Mudah", color: "bg-green-500", stars: 1 };
  if (idLevel === 2)
    return { label: "M", name: "Sedang", color: "bg-yellow-500", stars: 2 };
  return { label: "H", name: "Sulit", color: "bg-red-500", stars: 3 };
}

// Baris bintang kecil ala kartu game — merepresentasikan
// tingkat kesulitan modul (1-3), diwarnai kuning amber
// supaya konsisten dengan aksen tombol utama.
function LevelStars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= count
            ? "fill-amber-400 text-amber-400"
            : "fill-transparent text-[#d9d4ef]"
            }`}
        />
      ))}
    </div>
  );
}

const LEVEL_FILTERS = ["Semua", "Mudah", "Sedang", "Sulit"] as const;
type LevelFilter = (typeof LEVEL_FILTERS)[number];

export default function Dashboard() {
  const router = useRouter();

  const [modules, setModules] = useState<Modul[]>(DEFAULT_MODULES);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("Semua");

  // Nama dosen yang sedang login
  const [userName, setUserName] = useState("Dosen");

  const filteredModules = useMemo(() => {
    if (levelFilter === "Semua") return modules;
    return modules.filter(
      (m) => getLevelInfo(m.id_level).name === levelFilter
    );
  }, [modules, levelFilter]);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      // =====================================================
      // 1. AMBIL USER YANG SEDANG LOGIN DARI SUPABASE AUTH
      // =====================================================

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error(
          "Gagal mengambil user dari Supabase Auth:",
          authError
        );
      }

      if (authUser) {
        console.log("Auth User:", authUser);

        // =====================================================
        // 2. CARI DATA USER BERDASARKAN auth_user_id
        // =====================================================

        const { data: userData, error: userError } = await supabase
          .from("user")
          .select("id_user, auth_user_id, id_dosen")
          .eq("auth_user_id", authUser.id)
          .single();

        if (userError) {
          console.error(
            "Gagal mengambil data user:",
            userError
          );
        } else {
          console.log("Data user:", userData);

          // =====================================================
          // 3. DARI user.id_dosen → AMBIL DATA DOSEN
          // =====================================================

          if (userData?.id_dosen) {
            const { data: dosenData, error: dosenError } =
              await supabase
                .from("dosen")
                .select("id_dosen, nama_dosen")
                .eq("id_dosen", userData.id_dosen)
                .single();

            if (dosenError) {
              console.error(
                "Gagal mengambil data dosen:",
                dosenError
              );
            } else {
              console.log("Data dosen:", dosenData);

              setUserName(
                dosenData?.nama_dosen || "Dosen"
              );
            }
          } else {
            console.warn(
              "user.id_dosen tidak ditemukan."
            );

            setUserName("Dosen");
          }
        }
      } else {
        console.warn(
          "Tidak ada user yang sedang login."
        );

        setUserName("Dosen");
      }

      // =====================================================
      // 4. AMBIL DATA MODUL
      // =====================================================

      const {
        data: modulData,
        error: modulError,
      } = await supabase
        .from("modul")
        .select("id_modul, nama_modul, id_level")
        .order("id_modul", { ascending: false })
        .limit(30);

      if (modulError) {
        console.error(
          "Supabase modul error:",
          modulError
        );
      } else if (modulData) {
        setModules(
          modulData.length > 0
            ? modulData
            : DEFAULT_MODULES
        );
      }

      // =====================================================
      // 5. AMBIL DATA LEADERBOARD MAHASISWA
      // =====================================================

      const {
        data: mahasiswaData,
        error: mahasiswaError,
      } = await supabase
        .from("mahasiswa")
        .select("nama_mahasiswa, Nilai")
        .order("Nilai", {
          ascending: false,
        })
        .limit(10);

      if (mahasiswaError) {
        console.error(
          "Supabase mahasiswa error:",
          mahasiswaError
        );
      } else if (mahasiswaData) {
        const leaderboardRows: LeaderboardRow[] =
          mahasiswaData.map(
            (item: any, index: number) => ({
              no: index + 1,

              name:
                item.nama_mahasiswa ??
                item.name ??
                "Mahasiswa",

              score:
                Number(item.Nilai) || 0,
            })
          );

        setRows(leaderboardRows);
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  return (
    <div className="relative isolate space-y-8 rounded-[32px] bg-gradient-to-b from-[#f8f7fd] via-[#f4f1fb] to-[#f0edf9] p-6 lg:p-8 overflow-hidden">

      {/* ===================================================
          BACKGROUND DEKORATIF
          Visual SVGs & Floating Shapes Layer
      =================================================== */}

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[32px]">

        <div className="absolute -left-20 -top-16 h-80 w-80 rounded-full bg-[#8a80b8]/30 blur-3xl" />
        <div className="absolute right-[-4rem] top-1/3 h-72 w-72 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute bottom-[-3rem] left-1/4 h-64 w-64 rounded-full bg-[#4a3f7a]/15 blur-3xl" />
        <div className="absolute right-10 bottom-10 h-72 w-72 rounded-full bg-purple-300/30 blur-3xl" />

        {/* Dot Matrix Pattern SVGs */}
        <div className="absolute left-6 top-28 opacity-30">
          <svg width="100" height="100" fill="none" viewBox="0 0 100 100">
            <pattern id="dash-dot-grid-1" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="2" className="fill-[#4a3f7a]" />
            </pattern>
            <rect width="100" height="100" fill="url(#dash-dot-grid-1)" />
          </svg>
        </div>

        <div className="absolute right-10 top-80 opacity-25">
          <svg width="120" height="120" fill="none" viewBox="0 0 120 120">
            <pattern id="dash-dot-grid-2" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="2.5" className="fill-[#8a80b8]" />
            </pattern>
            <rect width="120" height="120" fill="url(#dash-dot-grid-2)" />
          </svg>
        </div>

        {/* Floating Geometric SVGs & Icons */}
        <Diamond
          className="absolute left-[6%] top-[18%] h-6 w-6 rotate-12 text-[#8a80b8]/50 animate-pulse"
          strokeWidth={2.5}
        />
        <div className="absolute left-[14%] top-[12%] h-7 w-7 rounded-full border-2 border-dashed border-[#4a3f7a]/30 animate-spin-slow" />

        <Star className="absolute right-[7%] top-[16%] h-5 w-5 rotate-12 fill-amber-300/60 text-amber-400/80" />
        <Shield className="absolute right-[14%] top-[24%] h-6 w-6 text-[#8a80b8]/40 -rotate-12" strokeWidth={1.8} />

        <BookOpen className="absolute left-[3%] top-[48%] h-7 w-7 text-[#4a3f7a]/30 rotate-6" strokeWidth={1.8} />
        <Hexagon className="absolute left-[12%] top-[54%] h-8 w-8 text-amber-300/40 rotate-45" strokeWidth={2} />

        <Trophy className="absolute right-[4%] top-[52%] h-7 w-7 text-amber-400/50 -rotate-12" strokeWidth={1.8} />
        <div className="absolute right-[12%] top-[60%] opacity-40">
          <svg width="80" height="40" viewBox="0 0 80 40" fill="none">
            <path d="M0 20 Q 20 5, 40 20 T 80 20" stroke="#8a80b8" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        <Award className="absolute left-[8%] bottom-16 h-8 w-8 text-purple-400/40 rotate-12" strokeWidth={1.8} />
        <Zap className="absolute right-[15%] bottom-20 h-6 w-6 text-amber-400/60 -rotate-12" strokeWidth={2} />

        <span className="absolute left-[20%] bottom-8 h-4 w-4 rotate-45 rounded-[4px] border-2 border-[#8a80b8]/40" />
        <span className="absolute right-[22%] bottom-12 h-3.5 w-3.5 rounded-full bg-amber-400/50" />
        <span className="absolute left-[35%] bottom-5 h-2.5 w-2.5 rounded-full bg-[#4a3f7a]/30" />

        {/* Big Concentric Background Circles */}
        <div className="absolute right-[-6rem] bottom-[-6rem] opacity-20">
          <svg width="340" height="340" viewBox="0 0 340 340" fill="none">
            <circle cx="170" cy="170" r="160" stroke="#4a3f7a" strokeWidth="2" strokeDasharray="8 8" />
            <circle cx="170" cy="170" r="120" stroke="#8a80b8" strokeWidth="2" />
            <circle cx="170" cy="170" r="80" stroke="#f2c94c" strokeWidth="2" strokeDasharray="6 6" />
          </svg>
        </div>

      </div>

      {/* ===================================================
          BANNER UTAMA
          Dibungkus wrapper tanpa overflow-hidden supaya
          beberapa aksen kecil (diamond, titik, kotak miring)
          bisa "mengintip" keluar dari tepi kartu — ini yang
          bikin tampilan tidak terasa kaku/kotak sempurna.
      =================================================== */}

      <div className="relative">

        <Diamond
          className="absolute -right-2 -top-3 hidden h-6 w-6 rotate-12 text-amber-300/80 sm:block"
          strokeWidth={2.5}
        />
        <span className="absolute -left-2 top-1/3 hidden h-3.5 w-3.5 rotate-45 rounded-[4px] border-2 border-[#c9c3e6]/70 sm:block" />
        <span className="absolute -bottom-2 right-10 hidden h-3 w-3 rounded-full bg-amber-400 sm:block" />

        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a3f7a] to-[#3d3466] px-8 pb-10 pt-7 shadow-lg shadow-[#3d3466]/20 lg:px-10 lg:pb-12 lg:pt-8">

          {/* Sparkle dekoratif — halus, bukan pusat perhatian */}

          <Sparkles className="absolute right-[26%] top-6 h-4 w-4 text-white/40" />
          <Sparkles className="absolute right-[10%] top-10 h-3 w-3 text-[#f2c94c]/70" />

          <div className="relative z-10 flex items-center justify-between gap-6">

            <div className="max-w-xl">

              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#c9c3e6]">
                Ruang Kendali Pengajar
              </span>

              <h1 className="mt-3 text-2xl font-bold leading-snug text-white lg:text-3xl">
                Halo, {userName}!
              </h1>

              <p className="mt-1 text-sm text-[#c9c3e6] lg:text-base">
                Mau lanjutkan quest belajar hari ini?
              </p>

              <button
                onClick={() =>
                  router.push("/Dosen/modul/tambah_modul")
                }
                className="mt-5 rounded-full bg-amber-400 px-6 py-2.5 text-sm font-bold text-amber-950 shadow-sm shadow-amber-900/20 transition hover:bg-amber-300"
              >
                + Tambah Modul Baru
              </button>

            </div>

            <div className="pointer-events-none hidden shrink-0 sm:block">

              <svg
                width="200"
                height="auto"
                viewBox="0 0 334 363"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-auto w-[150px] drop-shadow-[0_14px_16px_rgba(14,18,70,0.35)] lg:w-[190px]"
              >
                <mask
                  id="mask0_115_1545"
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="334"
                  height="363"
                >
                  <path
                    d="M333.678 0H0V362.399H333.678V0Z"
                    fill="white"
                  />
                </mask>

                <g mask="url(#mask0_115_1545)">

                  <path
                    d="M252.299 296.674H241.6V364.811H252.299V296.674Z"
                    fill="#0E1246"
                  />

                  <path
                    d="M157.695 296.674H146.996V364.811H157.695V296.674Z"
                    fill="#0E1246"
                  />

                  <path
                    d="M266.941 284.285H131.52V302.305H266.941V284.285Z"
                    fill="#DE5E2D"
                  />

                  <path
                    d="M226.396 221.215L227.366 234.683C229.595 265.64 205.438 292.149 174.408 292.799L108.142 294.421L103.637 365.937H36.626L47.109 250.183C49.88 236.815 61.43 227.073 75.074 226.595L226.396 221.215Z"
                    fill="#D88A21"
                  />

                  <path
                    d="M275.387 221.215L276.357 234.683C278.586 265.64 254.429 292.149 223.398 292.799L168.394 299.489L177.967 368.753H110.393L95.1889 261.76C92.3729 236.42 111.546 231.015 125.19 230.537L275.387 221.215Z"
                    fill="#EAAB28"
                  />

                  <path
                    d="M164.453 272.459L168.395 299.489L223.399 292.799C230.982 292.64 238.15 290.928 244.628 287.993L164.453 272.459Z"
                    fill="#D88A21"
                  />

                  <path
                    d="M168.096 29.7518C173.296 18.0508 203.443 10.4928 214.898 33.6518C224.974 58.3528 224.974 65.1788 232.449 71.0288C239.924 76.8788 254.55 88.9048 252.6 105.481H167.771C167.771 105.481 158.345 92.1548 161.921 78.5048C165.496 64.8538 162.571 67.1288 159.971 52.1788C157.371 37.2278 165.821 28.7768 168.096 29.7518Z"
                    fill="#0E1246"
                  />

                  <path
                    d="M147.559 159.176L130.288 197.356C125.417 207.673 116.138 220.236 102.657 219.727L93.5 218.964C79.509 214.385 83.589 191.024 88.854 178.719L101.01 144.676L147.559 159.176Z"
                    fill="#E6958A"
                  />

                  <path
                    d="M227.249 95.406L258.938 94.268L280.455 217.274H151.501L131.65 100.13C130.248 94.35 135.004 88.93 140.917 89.569L176.871 93.456L190.847 94.756L227.249 95.406Z"
                    fill="#4C85CC"
                  />

                  <path
                    d="M114.985 104.493L98.769 145.755L140.988 161.381L158.744 123.263C164.349 111.23 159.036 96.9365 146.932 91.4865C134.523 85.898 119.963 91.826 114.985 104.493Z"
                    fill="#4C85CC"
                  />

                  <path
                    d="M151.501 217.275L132.918 108.029L280.455 217.275H151.501Z"
                    fill="#467CC4"
                  />

                  <path
                    d="M131.65 100.131L143.617 174.479"
                    stroke="#0E1246"
                    strokeWidth="0.5"
                    strokeMiterlimit="10"
                  />

                  <path
                    d="M190.847 94.7559L160.946 91.5059C160.946 91.5059 159.321 116.857 183.372 122.382C207.423 127.907 225.949 112.306 227.249 95.4059L190.847 94.7559Z"
                    fill="#E9A59B"
                  />

                  <path
                    d="M298.481 149.359L310.864 190.245C313.243 196.974 309.904 208.718 302.766 208.718H266.157L252.6 160.447L298.481 149.359Z"
                    fill="#E6958A"
                  />

                  <path
                    d="M239.688 126.032L253.107 169.759L305.232 160.167L286.842 111.505C282.952 98.926 269.869 91.619 257.119 94.904C243.497 98.412 235.561 112.584 239.688 126.032Z"
                    fill="#4C85CC"
                  />

                  <path
                    d="M247.316 99.8965C247.316 99.8965 233.561 108.222 241.162 130.665C248.764 153.108 253.107 169.759 253.107 169.759"
                    stroke="#0E1246"
                    strokeWidth="0.5"
                    strokeMiterlimit="10"
                  />

                  <path
                    d="M200.466 179.318L307.39 178.188L311.713 190.174C316.569 203.638 306.593 217.839 292.281 217.839L201.766 208.57L200.466 179.318Z"
                    fill="#EAAC9D"
                  />

                  <path
                    d="M231.667 178.993L286.92 178.668"
                    stroke="#0E1246"
                    strokeWidth="0.5"
                    strokeMiterlimit="10"
                  />

                  <path
                    d="M203.716 179.318L178.545 175.482C172.798 174.606 166.935 175.987 162.183 179.335L145.538 187.768L137.148 202.459C136.582 203.667 137.129 205.104 138.355 205.63C140.944 206.74 143.952 205.678 145.27 203.188L151.388 193.943L158.213 192.318L151.063 197.843L147.992 204.642C147.224 206.342 148.194 208.322 150.008 208.757C152.71 209.405 155.498 208.082 156.704 205.578L158.864 201.093L166.664 195.568L161.464 202.068L158.733 208.212C158.099 209.639 158.797 211.306 160.26 211.854C163.147 212.937 166.382 211.63 167.708 208.846L168.614 206.943L174.464 200.768C174.464 200.768 183.564 214.419 206.641 207.918L203.716 179.318Z"
                    fill="#EAAC9D"
                  />

                  <path
                    d="M158.213 192.319L165.039 187.443"
                    stroke="#0E1246"
                    strokeWidth="0.5"
                    strokeMiterlimit="10"
                  />

                  <path
                    d="M163.739 199.469L171.214 191.344"
                    stroke="#0E1246"
                    strokeWidth="0.5"
                    strokeMiterlimit="10"
                  />

                  <path
                    d="M203.066 208.569C203.066 208.569 208.266 206.294 208.591 196.543C267.744 215.719 267.744 215.719 267.744 215.719L203.066 208.569Z"
                    fill="#E6958A"
                  />

                  <path
                    d="M107.348 115.906L106.936 113.447L111.835 99.1723C112.318 97.7663 111.542 96.2394 110.121 95.8004C107.038 94.8474 103.756 96.5224 102.719 99.5784L101.638 102.762L78.869 114.005L80.51 127.067L100.554 126.435C104.159 125.837 107.952 119.51 107.348 115.906Z"
                    fill="#E9A59B"
                  />

                  <path
                    d="M101.656 116.608L112.082 202.634C112.668 210.186 110.68 217.87 103.635 220.654L95.751 221.78C77.731 222.343 65.935 205.235 67.595 188.556L74.516 116.283L101.656 116.608Z"
                    fill="#EAAC9D"
                  />

                  <path
                    d="M58.071 65.138L62.684 62.201C62.684 62.201 75.719 62.759 79.65 67.016C92.224 61.573 110.54 59.18 111.207 59.166L115.28 62.252L115.713 66.918L80.701 77.179L58.863 70.964L58.071 65.138Z"
                    fill="white"
                  />

                  <path
                    d="M124.742 112.029L116.583 61.0235L79.503 68.4025L79.391 68.3805L56.928 64.1835L57.699 63.3645L79.496 67.1945L115.386 60.0535L118.06 59.5215L125.722 111.007L124.742 112.029Z"
                    fill="#EAAB28"
                  />

                  <path
                    d="M57.048 64.1589L79.511 68.3559L117.087 60.8789L124.848 111.807L85.596 118.986L63.098 113.119L57.048 64.1589Z"
                    fill="#DE5E2D"
                  />

                  <path
                    d="M79.511 68.3555L85.596 118.985"
                    stroke="#0E1246"
                    strokeWidth="0.5"
                    strokeMiterlimit="10"
                  />

                  <path
                    d="M73.7919 129.94L67.1099 108.599C65.1969 102.008 69.2919 95.1813 76.0079 93.7663L92.9499 90.1953L105.557 91.3653C107.527 91.5483 109.018 93.2263 108.968 95.2043C108.914 97.3253 107.115 98.9813 104.997 98.8613L94.4579 98.2613L84.7169 101.755L95.9899 101.818L106.737 103.819C107.781 104.013 108.645 104.76 108.956 105.775C109.283 106.841 109.288 108.229 107.905 109.406C109.81 112.522 109.507 113.777 108.152 114.712C110.057 117.828 107.348 119.698 106.534 119.767C105.72 119.836 105.72 119.836 105.72 119.836L97.3209 120.384C97.3209 120.384 94.9119 123.825 86.3399 126.604C82.2019 128.071 78.0149 129.144 73.7919 129.94Z"
                    fill="#EAAC9D"
                  />

                  <path
                    d="M107.904 109.408L96.852 108.977L85.61 109.935"
                    stroke="#0E1246"
                    strokeWidth="0.5"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M78.4109 128.791C91.2269 126.377 97.3369 120.573 97.3369 120.573L106.534 119.768C106.534 119.768 110.682 117.926 108.152 114.713L97.7949 114.872L87.4909 115.75"
                    stroke="#0E1246"
                    strokeWidth="0.5"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M82.4219 102.784L94.4569 98.2617"
                    stroke="#0E1246"
                    strokeWidth="0.5"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M176.859 75.5217L176.144 102.166L215.405 98.1567L206.613 56.4297L176.859 75.5217Z"
                    fill="#E9A59B"
                  />

                  <path
                    d="M211.045 77.5827L206.613 56.4297L176.859 75.5217L176.521 88.1327C184.684 88.5637 202.97 87.3967 211.045 77.5827Z"
                    fill="#E6958A"
                  />

                  <path
                    d="M167.741 50.6671L168.65 62.4301C169.342 71.3761 177.256 78.0041 186.185 77.1131L190.153 76.7171C201.328 75.6021 209.457 65.6001 208.264 54.4331L207.754 49.6611C206.528 38.1871 195.92 30.0941 184.529 31.9431L182.162 32.3271C173.319 33.7651 167.051 41.7361 167.741 50.6671Z"
                    fill="#EAAC9D"
                  />

                  <path
                    d="M170.26 36.9207C170.26 36.9207 184.009 53.8097 207.753 49.6627L210.494 51.3657C210.494 51.3657 210.29 49.0087 208.385 38.3737C206.48 27.7387 179.246 24.7617 170.26 36.9207Z"
                    fill="#0E1246"
                  />

                  <path
                    d="M205.842 51.4552C205.842 51.4552 212.693 45.1712 214.27 54.0872C215.543 61.2792 206.037 64.0752 206.037 64.0752L205.842 51.4552Z"
                    fill="#EAAC9D"
                  />

                  <path
                    d="M175.2 58.6302C175.074 59.2762 174.449 59.6982 173.803 59.5722C173.157 59.4462 172.735 58.8212 172.861 58.1752C172.987 57.5295 173.612 57.1075 174.258 57.2335C174.903 57.3585 175.325 57.9845 175.2 58.6302Z"
                    fill="#0E1246"
                  />

                  <path
                    d="M190.794 58.4622C190.668 59.1082 190.043 59.5302 189.397 59.4042C188.751 59.2782 188.329 58.6532 188.455 58.0072C188.581 57.3612 189.206 56.9392 189.852 57.0652C190.498 57.1902 190.92 57.8162 190.794 58.4622Z"
                    fill="#0E1246"
                  />

                  <path
                    d="M180.355 57.0938L178.234 65.7318L182.476 64.3497"
                    stroke="#0E1246"
                    strokeWidth="0.5"
                    strokeMiterlimit="10"
                  />

                  <path
                    d="M169.667 53.0289C169.667 53.0289 171.227 50.6829 174.89 52.2789"
                    stroke="#0E1246"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M186.227 50.7301C186.227 50.7301 187.787 48.3841 191.45 49.9801"
                    stroke="#0E1246"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M178.801 68.4915L190.18 66.7305C190.18 66.7305 189.483 71.4515 184.685 72.2845C179.888 73.1175 178.801 68.4915 178.801 68.4915Z"
                    fill="#DE5E2D"
                  />

                  <path
                    d="M208.049 58.8368C208.049 58.8368 207.319 53.5078 211.904 52.6328"
                    stroke="#0E1246"
                    strokeWidth="0.5"
                    strokeMiterlimit="10"
                  />

                  <path
                    d="M178.822 60.4657C178.822 64.1457 175.839 67.1287 172.159 67.1287C168.479 67.1287 165.496 64.1457 165.496 60.4657C165.496 56.7857 168.479 53.8027 172.159 53.8027C175.839 53.8037 178.822 56.7867 178.822 60.4657Z"
                    stroke="white"
                    strokeWidth="0.5"
                    strokeMiterlimit="10"
                  />

                  <path
                    d="M189.385 64.8533C193.065 64.8533 196.048 61.8702 196.048 58.1903C196.048 54.5105 193.065 51.5273 189.385 51.5273C185.705 51.5273 182.722 54.5105 182.722 58.1903C182.722 61.8702 185.705 64.8533 189.385 64.8533Z"
                    stroke="white"
                    strokeWidth="0.5"
                    strokeMiterlimit="10"
                  />

                  <path
                    d="M178.822 60.4663L182.505 59.6543"
                    stroke="white"
                    strokeWidth="0.5"
                    strokeMiterlimit="10"
                  />

                  <path
                    d="M159.646 207.528H65.391L51.09 139.6L52.28 138.311C54.008 136.439 56.439 135.375 58.986 135.375H144.757C147.333 135.375 149.518 137.267 149.885 139.817L159.646 207.528Z"
                    fill="#76D0CE"
                  />

                  <path
                    d="M154.12 207.528H59.8649L50.2259 143.069C49.8249 140.387 51.9029 137.975 54.6149 137.975H139.895C142.092 137.975 143.959 139.583 144.284 141.756L154.12 207.528Z"
                    fill="#488080"
                  />

                  <path
                    d="M179.523 214.678H64.69C62.026 214.678 59.866 212.518 59.866 209.854V207.203H184.347V209.854C184.347 212.519 182.187 214.678 179.523 214.678Z"
                    fill="#457A7D"
                  />

                  <path
                    d="M104.718 171.288C104.718 174.07 102.463 176.326 99.68 176.326C96.898 176.326 94.642 174.071 94.642 171.288C94.642 168.506 96.898 166.25 99.68 166.25C102.462 166.25 104.718 168.506 104.718 171.288Z"
                    fill="#76D0CE"
                  />

                  <path
                    d="M32.12 230.789H21.984V365.938H32.12V230.789Z"
                    fill="#0E1246"
                  />

                  <path
                    d="M275.95 230.789H265.814V365.938H275.95V230.789Z"
                    fill="#0E1246"
                  />

                  <path
                    d="M315.369 230.789H305.233V365.938H315.369V230.789Z"
                    fill="#0E1246"
                  />

                  <path
                    d="M320.437 214.428H12.053V244.984H320.437V214.428Z"
                    fill="#2A497A"
                  />

                  <path
                    d="M320.437 214.428H259.588V244.984H320.437V214.428Z"
                    fill="#32597B"
                  />

                </g>
              </svg>

            </div>

          </div>

          {/* Tepi bawah bergelombang — warnanya putih mengikuti
            background halaman, jadi terlihat menyatu, bukan
            kotak dengan garis lurus kaku. */}

          <svg
            className="absolute bottom-0 left-0 w-full text-white"
            viewBox="0 0 1440 40"
            preserveAspectRatio="none"
            style={{ height: "22px" }}
          >
            <path
              d="M0,22 C240,40 480,4 720,12 C960,20 1200,40 1440,16 L1440,40 L0,40 Z"
              fill="currentColor"
            />
          </svg>

        </div>

      </div>

      {/* ===================================================
          RINGKASAN CEPAT
          Kartu statistik ringan dari data yang sudah dimuat —
          bikin halaman terasa lebih terisi, bukan cuma dua
          blok besar berturut-turut.
      =================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">



      </div>

      {/* ===================================================
          GRID 3 KOLOM
      =================================================== */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">

        {/* =================================================
            KOLOM 1: MODUL — dibuat seperti kartu "game" pada
            referensi: thumbnail berwarna di atas, judul,
            baris bintang tingkat kesulitan, lalu tombol
            pill penuh di bagian bawah kartu.
        ================================================= */}

        <div className="flex flex-col gap-4">

          <div className="flex items-center justify-between">

            <h3 className="text-lg font-bold text-[#3d3466]">
              Modul Kamu
            </h3>

            {!loading && modules.length > 0 && (
              <span className="rounded-full bg-[#4a3f7a]/10 px-2.5 py-1 text-xs font-semibold text-[#4a3f7a]">
                {modules.length} quest
              </span>
            )}

          </div>

          {/* Pill filter tingkat — sekaligus jadi aksen warna
              yang meniru baris kategori pada referensi. */}

          <div className="flex flex-wrap gap-2">

            {LEVEL_FILTERS.map((f) => {
              const active = levelFilter === f;

              return (
                <button
                  key={f}
                  onClick={() => setLevelFilter(f)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${active
                    ? "bg-[#4a3f7a] text-white shadow-sm shadow-[#4a3f7a]/30"
                    : "bg-white text-[#4a3f7a]/70 ring-1 ring-[#4a3f7a]/15 hover:bg-[#f4f2fa]"
                    }`}
                >
                  {f}
                </button>
              );
            })}

          </div>

          {/* PERBAIKAN: tambah "content-start items-start" supaya
              baris grid TIDAK ikut "stretch" mengisi sisa ruang
              vertikal container ketika jumlah modul yang tampil
              sedikit (misal cuma 1 hasil filter). Tanpa ini, kartu
              modul jadi memanjang penuh mengikuti tinggi 420px. */}

          <div
            className="grid grid-cols-2 content-start items-start gap-3 overflow-y-auto pb-1 pr-1 sm:grid-cols-3 lg:grid-cols-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ height: `${MODUL_LIST_HEIGHT}px` }}
          >

            {loading ? (
              <p className="col-span-full text-sm text-[#4a3f7a]">
                Memuat modul...
              </p>
            ) : filteredModules.length > 0 ? (
              filteredModules.map((modul, i) => {
                const lvl = getLevelInfo(modul.id_level);
                const tilt = i % 2 === 0 ? "-rotate-2" : "rotate-2";

                return (
                  <div
                    key={modul.id_modul}
                    className="flex flex-col self-start rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:rotate-1 hover:shadow-lg hover:shadow-[#4a3f7a]/10"
                  >

                    <div
                      className={`mx-auto flex h-16 w-16 ${tilt} items-center justify-center rounded-2xl shadow-md ${lvl.color}`}
                    >
                      <span className="text-2xl font-black text-white">
                        {lvl.label}
                      </span>
                    </div>

                    <h4 className="mt-3 line-clamp-2 min-h-[2.5rem] text-center text-sm font-bold text-[#2b2540]">
                      {modul.nama_modul}
                    </h4>

                    <div className="mt-1 flex items-center justify-between gap-2">

                      <LevelStars count={lvl.stars} />

                      <button
                        onClick={() =>
                          router.push(
                            "/Dosen/modul/detail_modul"
                          )
                        }
                        className="shrink-0 rounded-full bg-[#4a3f7a] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#3d3466]"
                      >
                        Lihat
                      </button>

                    </div>

                  </div>
                );
              })
            ) : (
              <p className="col-span-full text-sm text-[#a79fd6]">
                {modules.length > 0
                  ? "Tidak ada modul di tingkat ini."
                  : "Belum ada modul tersedia."}
              </p>
            )}

          </div>

          <button
            onClick={() =>
              router.push("/Dosen/modul/tambah_modul")
            }
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#c9c3e6] py-3 text-sm font-semibold text-[#a79fd6] transition hover:bg-[#f7f6fb] hover:border-[#a79fd6]"
          >
            + Tambah Modul Baru
          </button>

        </div>

        {/* =================================================
            KOLOM 2: LEADERBOARD
        ================================================= */}

        <div className="flex flex-col gap-4">

          <div className="flex items-center justify-between">

            <h3 className="text-lg font-bold text-[#3d3466]">
              Papan Peringkat
            </h3>

            <button
              onClick={() => router.push("/Dosen/leaderboard")}
              className="flex items-center gap-0.5 text-xs font-semibold text-[#a79fd6] transition hover:text-[#4a3f7a]"
            >
              Semua
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

          </div>

          <div className="flex flex-col gap-1 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-black/5">

            {loading ? (
              <p className="py-8 text-center text-sm text-[#4a3f7a]">
                Memuat papan peringkat...
              </p>
            ) : rows.length > 0 ? (
              rows.slice(0, 5).map((row) => {
                const isTop1 = row.no === 1;
                const isTop2 = row.no === 2;
                const isTop3 = row.no === 3;

                const podiumTint = isTop1
                  ? "bg-amber-50"
                  : isTop2
                    ? "bg-gray-100"
                    : isTop3
                      ? "bg-orange-50"
                      : "";

                const avatarSrc = `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(
                  row.name
                )}&backgroundColor=transparent`;

                return (
                  <div
                    key={row.no}
                    className={`flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-[#f4f2fa] ${podiumTint}`}
                  >

                    <span className="w-4 shrink-0 text-center text-xs font-bold text-[#c9c3e6]">
                      {String(row.no).padStart(2, "0")}
                    </span>

                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100 shadow-sm ring-2 ring-white">
                      <img
                        src={avatarSrc}
                        alt={row.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-sm font-semibold text-[#2b2540]">
                        {row.name}
                      </p>

                      <p
                        className={`text-xs font-bold ${isTop1
                          ? "text-amber-500"
                          : isTop2
                            ? "text-gray-400"
                            : isTop3
                              ? "text-orange-400"
                              : "text-[#a79fd6]"
                          }`}
                      >
                        {row.score} pts
                      </p>

                    </div>

                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-[#a79fd6]">
                Belum ada data mahasiswa.
              </p>
            )}

          </div>

        </div>

        {/* =================================================
            KOLOM 3: BANK SOAL & KUIS
        ================================================= */}

        <div className="flex flex-col gap-4">

          <h3 className="text-lg font-bold text-[#3d3466]">
            Jelajahi Lainnya
          </h3>

          <button
            onClick={() => router.push("/Dosen/bank_soal")}
            className="group flex flex-1 items-center gap-4 rounded-[22px] bg-white p-5 text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#4a3f7a]/10"
            style={{ minHeight: "170px" }}
          >

            <div className="flex h-14 w-14 shrink-0 -rotate-6 items-center justify-center rounded-full bg-[#4a3f7a] text-white shadow-md transition group-hover:rotate-0">
              <Puzzle className="h-7 w-7" />
            </div>

            <div>

              <p className="text-base font-bold text-[#3d3466]">
                Bank Soal
              </p>

              <p className="mt-1 text-xs text-[#a79fd6]">
                Kelola koleksi soal untuk kuis kamu
              </p>

            </div>

          </button>

          <button
            onClick={() => router.push("/Dosen/kuis")}
            className="group flex flex-1 items-center gap-4 rounded-[22px] bg-white p-5 text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#4a3f7a]/10"
            style={{ minHeight: "170px" }}
          >

            <div className="flex h-14 w-14 shrink-0 rotate-6 items-center justify-center rounded-full bg-[#8a80b8] text-white shadow-md transition group-hover:rotate-0">
              <HelpCircle className="h-7 w-7" />
            </div>

            <div>

              <p className="text-base font-bold text-[#3d3466]">
                Kuis
              </p>

              <p className="mt-1 text-xs text-[#a79fd6]">
                Atur kuis yang aktif untuk mahasiswa
              </p>

            </div>

          </button>

        </div>

      </div>

    </div>
  );
}
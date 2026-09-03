"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

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

// Tinggi tetap area daftar modul (pas untuk 4 modul terlihat),
// sisanya bisa discroll di dalam kotak tanpa scrollbar terlihat.
const MODUL_LIST_HEIGHT = 384; // px

// =====================================================
// Label & warna badge level modul (E = mudah, M = sedang,
// H = sulit) — mengikuti skema warna Dashboard Mahasiswa.
// =====================================================

function getLevelInfo(idLevel: number) {
  if (idLevel === 1) return { label: "E", color: "bg-[#39C936]" };
  if (idLevel === 2) return { label: "M", color: "bg-[#FFC107]" };
  return { label: "H", color: "bg-[#EF4444]" };
}

export default function Dashboard() {
  const router = useRouter();

  const [modules, setModules] = useState<Modul[]>(DEFAULT_MODULES);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Nama dosen yang sedang login
  const [userName, setUserName] = useState("Dosen");

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
        //
        // Alur:
        // auth.users.id
        //       ↓
        // "user".auth_user_id
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
          //
          // Alur:
          // user.id_dosen
          //       ↓
          // dosen.id_dosen
          //       ↓
          // dosen.nama_dosen
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
    <div className="space-y-8">

      {/* =====================================================
          BANNER UTAMA
      ===================================================== */}

      <div className="relative mt-8 flex h-72 items-center justify-between overflow-hidden rounded-[30px] bg-[#5B5288] p-10 shadow-lg lg:h-80 lg:p-14">

        <div className="z-10 max-w-xl space-y-4 text-white">

          <h1 className="text-4xl font-bold leading-tight lg:text-5xl">
            Halo, {userName}! <br />
            <span className="text-2xl font-normal lg:text-3xl">
              Mau apa hari ini?
            </span>
          </h1>

          <button
            onClick={() =>
              router.push("/Dosen/modul/tambah_modul")
            }
            className="mt-4 rounded-xl bg-[#D6D2E7] px-6 py-3 text-base font-bold text-[#5B5288] shadow-md transition-all hover:bg-[#C5C0DA] lg:text-lg"
          >
            + Tambah Modul Baru
          </button>

        </div>

        <div className="pointer-events-none absolute bottom-[-20px] right-0 z-0 flex h-[110%] items-end">

          <svg
            width="230"
            height="auto"
            viewBox="0 0 334 363"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-auto object-contain object-bottom"
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

      {/* =====================================================
          GRID 3 KOLOM
      ===================================================== */}

      <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-3 lg:gap-8">

        {/* =================================================
            KOLOM 1: MODUL
        ================================================= */}

        <div className="flex flex-col gap-4">

          <div className="flex items-center justify-between">

            <h3 className="text-xl font-bold text-[#5B5288]">
              Modul
            </h3>

            {!loading && modules.length > 0 && (
              <span className="text-xs font-semibold text-gray-400">
                {modules.length} modul
              </span>
            )}

          </div>

          <button
            onClick={() =>
              router.push("/Dosen/modul/tambah_modul")
            }
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#5B5288] py-3 text-sm font-bold text-[#5B5288] transition-colors hover:bg-purple-50"
          >
            + Tambah Modul Baru
          </button>

          <div
            className="flex flex-col gap-4 overflow-y-auto pb-2 pr-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ height: `${MODUL_LIST_HEIGHT}px` }}
          >

            {loading ? (
              <p className="text-sm font-semibold text-[#5B5288]">
                Memuat data...
              </p>
            ) : modules.length > 0 ? (
              modules.map((modul) => {
                const lvl = getLevelInfo(modul.id_level);

                return (
                  <div
                    key={modul.id_modul}
                    className="flex shrink-0 items-center justify-between rounded-2xl border-2 border-[#5B5288] bg-white p-4 transition-colors hover:bg-purple-50"
                  >

                    <div className="flex items-center gap-4">

                      <div
                        className={`flex h-12 w-12 ${lvl.color} shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white shadow-sm`}
                      >
                        {lvl.label}
                      </div>

                      <div>

                        <h4 className="text-sm font-bold text-[#5B5288] lg:text-base">
                          {modul.nama_modul}
                        </h4>

                        <p className="text-xs text-gray-500">
                          Level {lvl.label}
                        </p>

                      </div>

                    </div>

                    <button
                      onClick={() =>
                        router.push(
                          "/Dosen/modul/detail_modul"
                        )
                      }
                      className="rounded-lg bg-[#E6E4F0] px-5 py-2 text-sm font-bold text-[#5B5288] transition-colors hover:bg-[#D6D2E7]"
                    >
                      Lihat
                    </button>

                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-400">
                Belum ada modul tersedia.
              </p>
            )}

          </div>

        </div>

        {/* =================================================
            KOLOM 2: LEADERBOARD
        ================================================= */}

        <div className="flex flex-col gap-4">

          <div className="flex items-center justify-between">

            <h3 className="text-xl font-bold text-[#5B5288]">
              Leaderboard
            </h3>

            <button
              onClick={() => router.push("/Dosen/leaderboard")}
              className="flex items-center gap-1 text-xs font-bold text-gray-500 transition-colors hover:text-[#5B5288]"
            >
              Lihat Semua

              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>

            </button>

          </div>

          <div className="flex h-fit flex-col gap-1 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">

            {loading ? (
              <p className="py-8 text-center text-sm font-semibold text-[#5B5288]">
                Memuat leaderboard...
              </p>
            ) : rows.length > 0 ? (
              rows.slice(0, 5).map((row) => {
                const avatarSrc = `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(
                  row.name
                )}&backgroundColor=transparent`;

                return (
                  <div
                    key={row.no}
                    className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0"
                  >

                    <div className="flex items-center gap-4 overflow-hidden">

                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                        <img
                          src={avatarSrc}
                          alt={row.name}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="flex flex-col overflow-hidden">

                        <span className="max-w-[120px] truncate text-sm font-bold text-[#5B5288] lg:max-w-[150px]">
                          {row.name}
                        </span>

                        <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-gray-400">
                          {row.no === 1 && (
                            <span className="text-[#FFC107]">
                              🏆
                            </span>
                          )}
                          {row.no === 2 && (
                            <span className="text-gray-400">
                              🥈
                            </span>
                          )}
                          {row.no === 3 && (
                            <span className="text-[#CD7F32]">
                              🥉
                            </span>
                          )}
                          Peringkat {row.no}
                        </span>

                      </div>

                    </div>

                    <span className="ml-2 shrink-0 text-sm font-black text-[#F4A261]">
                      {row.score}{" "}
                      <span className="text-[10px] text-gray-400">
                        Nilai
                      </span>
                    </span>

                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">
                Belum ada data mahasiswa.
              </p>
            )}

          </div>

        </div>

        {/* =================================================
            KOLOM 3: BANK SOAL & KUIS
        ================================================= */}

        <div className="flex flex-col gap-4">

          <h3 className="text-xl font-bold text-[#5B5288]">
            Aktivitas Lainnya
          </h3>

          <div
            onClick={() => router.push("/Dosen/bank_soal")}
            className="flex cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-[#5B5288] bg-white p-5 text-center transition-colors hover:bg-purple-50"
            style={{ height: `${(MODUL_LIST_HEIGHT - 16) / 2}px` }}
          >

            <p className="mb-3 text-sm font-bold text-[#5B5288]">
              Bank Soal
            </p>

            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#E5A800] bg-[#FFC107] text-xl font-black text-[#5B5288] shadow-inner">
              ?
            </div>

          </div>

          <div
            onClick={() => router.push("/Dosen/kuis")}
            className="flex cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-[#5B5288] bg-white p-5 text-center transition-colors hover:bg-purple-50"
            style={{ height: `${(MODUL_LIST_HEIGHT - 16) / 2}px` }}
          >

            <p className="mb-3 text-sm font-bold text-[#5B5288]">
              Kuis
            </p>

            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#E5A800] bg-[#FFC107] text-xl font-black text-[#5B5288] shadow-inner">
              ?
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
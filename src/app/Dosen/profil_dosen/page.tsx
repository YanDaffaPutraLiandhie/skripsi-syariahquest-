"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

type Dosen = {
  id_dosen: number;
  nama_dosen: string;
  email: string | null;
  riwayat_pendidikan: string | null;
};

export default function ProfilDosen() {
  const [dosen, setDosen] = useState<Dosen | null>(null);
  const [jumlahModul, setJumlahModul] = useState(0);

  const [userEmail, setUserEmail] = useState("");
  const [authUserId, setAuthUserId] = useState("");

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadProfilDosen();
  }, []);

  async function loadProfilDosen() {
    try {
      setLoading(true);
      setErrorMessage("");

      // =====================================================
      // 1. AMBIL USER YANG SEDANG LOGIN DARI SUPABASE AUTH
      // =====================================================

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      console.log("=================================");
      console.log("AUTH USER");
      console.log("=================================");
      console.log("User:", user);

      if (authError) {
        console.error("Gagal mengambil user login:", authError);
        setErrorMessage("Gagal mengambil data user login.");
        return;
      }

      if (!user) {
        console.error("Tidak ada user yang sedang login.");
        setErrorMessage("Tidak ada user yang sedang login.");
        return;
      }

      setAuthUserId(user.id);
      setUserEmail(user.email ?? "");

      console.log("Auth User ID:", user.id);
      console.log("Email:", user.email);

      // =====================================================
      // 2. CARI DATA USER DI TABEL "user"
      //
      // user.auth_user_id = auth.users.id
      // user.id_dosen     = dosen.id_dosen
      // =====================================================

      const {
        data: userRow,
        error: userRowError,
      } = await supabase
        .from("user")
        .select("id_user, auth_user_id, id_dosen")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      console.log("=================================");
      console.log("DATA USER DATABASE");
      console.log("=================================");
      console.log("userRow:", userRow);
      console.log("userRowError:", userRowError);

      if (userRowError) {
        console.error(
          "Gagal mengambil data user:",
          userRowError
        );

        setErrorMessage(
          `Gagal mengambil data user: ${
            userRowError.message || "Unknown error"
          }`
        );

        return;
      }

      if (!userRow) {
        console.error(
          "Data user tidak ditemukan untuk auth_user_id:",
          user.id
        );

        setErrorMessage(
          "Data user belum terhubung dengan akun login."
        );

        return;
      }

      // =====================================================
      // 3. PASTIKAN USER MEMILIKI id_dosen
      // =====================================================

      if (!userRow.id_dosen) {
        console.error(
          "User ini tidak memiliki id_dosen:",
          userRow
        );

        setErrorMessage(
          "Akun yang sedang login bukan akun dosen atau belum terhubung ke data dosen."
        );

        return;
      }

      console.log("ID Dosen:", userRow.id_dosen);

      // =====================================================
      // 4. AMBIL DATA DOSEN
      // =====================================================

      const {
        data: dosenData,
        error: dosenError,
      } = await supabase
        .from("dosen")
        .select(`
          id_dosen,
          nama_dosen,
          email,
          riwayat_pendidikan
        `)
        .eq("id_dosen", userRow.id_dosen)
        .maybeSingle();

      console.log("=================================");
      console.log("DATA DOSEN");
      console.log("=================================");
      console.log("dosenData:", dosenData);
      console.log("dosenError:", dosenError);

      if (dosenError) {
        console.error(
          "Gagal mengambil data dosen:",
          dosenError
        );

        setErrorMessage(
          `Gagal mengambil data dosen: ${
            dosenError.message || "Unknown error"
          }`
        );

        return;
      }

      if (!dosenData) {
        console.error(
          "Data dosen tidak ditemukan untuk id_dosen:",
          userRow.id_dosen
        );

        setErrorMessage(
          "Data dosen tidak ditemukan di database."
        );

        return;
      }

      // =====================================================
      // 5. SIMPAN DATA DOSEN KE STATE
      // =====================================================

      setDosen(dosenData);

      // =====================================================
      // 6. AMBIL JUMLAH MODUL YANG DIBUAT DOSEN
      //
      // modul.dibuat_oleh -> dosen.id_dosen
      // =====================================================

      const {
        count,
        error: modulError,
      } = await supabase
        .from("modul")
        .select("id_modul", {
          count: "exact",
          head: true,
        })
        .eq("dibuat_oleh", dosenData.id_dosen);

      console.log("=================================");
      console.log("JUMLAH MODUL");
      console.log("=================================");
      console.log("Jumlah:", count);
      console.log("Error:", modulError);

      if (modulError) {
        console.error(
          "Gagal mengambil jumlah modul:",
          modulError
        );

        setJumlahModul(0);
      } else {
        setJumlahModul(count ?? 0);
      }
    } catch (error) {
      console.error(
        "Terjadi kesalahan saat mengambil profil dosen:",
        error
      );

      setErrorMessage(
        "Terjadi kesalahan saat mengambil profil dosen."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white text-[#2b2540]">
        <Sidebar activeLabel="Profil" />

        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8a80b8] border-t-transparent" />

            <p className="text-sm text-gray-400">
              Memuat profil dosen...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (!dosen) {
    return (
      <div className="flex min-h-screen bg-white text-[#2b2540]">
        <Sidebar activeLabel="Profil" />

        <main className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-lg rounded-2xl bg-red-50 p-6 text-center">

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-7 w-7 text-red-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                />

                <path d="M12 8v4" />

                <path d="M12 16h.01" />
              </svg>
            </div>

            <h2 className="mb-2 text-lg font-bold text-red-600">
              Data profil tidak ditemukan
            </h2>

            <p className="mb-4 text-sm text-gray-500">
              {errorMessage ||
                "User yang sedang login belum memiliki data dosen."}
            </p>

            {userEmail && (
              <div className="rounded-xl bg-white p-4 text-left">
                <p className="text-xs text-gray-400">
                  Email login
                </p>

                <p className="mt-1 text-sm font-semibold text-[#4a3f7a]">
                  {userEmail}
                </p>

                <p className="mt-3 text-xs text-gray-400">
                  Auth User ID
                </p>

                <p className="mt-1 break-all text-xs text-gray-500">
                  {authUserId}
                </p>
              </div>
            )}

            <button
              onClick={loadProfilDosen}
              className="mt-5 rounded-xl bg-[#4a3f7a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d3466]"
            >
              Coba Lagi
            </button>
          </div>
        </main>
      </div>
    );
  }

  // =====================================================
  // PROFIL DOSEN
  // =====================================================

  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <Sidebar activeLabel="Profil" />

      <main className="flex-1 p-8">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-6 flex items-start gap-8">

          {/* AVATAR */}
          <div className="flex h-[178px] w-[178px] flex-shrink-0 items-center justify-center rounded-2xl bg-[#4a3f7a]">

            <svg
              className="h-20 w-20 text-white/70"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle
                cx="12"
                cy="8"
                r="4"
              />

              <path d="M4 20a8 8 0 0 1 16 0" />
            </svg>

          </div>

          {/* DATA DOSEN */}
          <div className="flex-1">

            <div className="mb-1 flex items-center gap-3">

              <h1 className="text-2xl font-bold text-[#3d3466]">
                {dosen.nama_dosen}
              </h1>

              <button
                aria-label="Edit profil"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4a3f7a] text-white transition hover:bg-[#3d3466]"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 20h9" />

                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </button>

            </div>

            {/* EMAIL USER LOGIN */}
            <p className="mb-1 text-sm text-[#a79fd6]">
              {dosen.email || userEmail}
            </p>

            <p className="mb-4 text-sm text-[#a79fd6]">
              Dosen Politeknik Negeri Malang
            </p>

            {/* ================================================= */}
            {/* JUMLAH MODUL */}
            {/* ================================================= */}

            <div className="flex w-fit items-center gap-3 rounded-xl bg-[#4a3f7a] px-5 py-4">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">

                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.8"
                >
                  <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13z" />

                  <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13z" />
                </svg>

              </div>

              <div>
                <p className="text-lg font-extrabold text-white">
                  {jumlahModul}
                </p>

                <p className="text-xs text-[#c9c3e6]">
                  Modul Anda
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* RIWAYAT + MODUL */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* RIWAYAT PENDIDIKAN */}
          <div className="flex min-h-[240px] flex-col rounded-2xl bg-[#8a80b8] p-6 text-white">

            <h2 className="mb-6 text-lg font-bold">
              Riwayat pendidikan
            </h2>

            {dosen.riwayat_pendidikan ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-white/90">
                {dosen.riwayat_pendidikan}
              </p>
            ) : (
              <p className="text-sm text-white/60">
                Belum ada riwayat pendidikan.
              </p>
            )}

            <div className="mt-auto border-t border-white/30 pt-3 text-center">
              <button className="text-sm font-medium hover:underline">
                Lihat Semua
              </button>
            </div>

          </div>

          {/* MODUL */}
          <div className="flex min-h-[240px] flex-col rounded-2xl bg-[#8a80b8] p-6 text-white">

            <h2 className="text-lg font-bold">
              Modul Yang Anda Buat
            </h2>

            <p className="mt-2 text-sm text-white/70">
              {jumlahModul} modul telah dibuat.
            </p>

            <div className="mt-6 space-y-2">

              <div className="rounded-xl bg-white/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80">
                    Total Modul
                  </span>

                  <span className="text-lg font-bold">
                    {jumlahModul}
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
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

  // Menyimpan user yang sedang login
  const [userEmail, setUserEmail] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfilDosen() {
      try {
        setLoading(true);

        // =====================================================
        // 1. CEK USER YANG SEDANG LOGIN
        // =====================================================

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        console.log("=================================");
        console.log("USER LOGIN");
        console.log("=================================");

        if (authError) {
          console.error("Gagal mengambil user login:", authError);
          return;
        }

        if (!user) {
          console.error("Tidak ada user yang sedang login.");
          return;
        }

        console.log("ID User (auth):", user.id);
        console.log("email:", user.email);

        setUserEmail(user.email ?? "");

        // =====================================================
        // 2. CARI id_dosen DARI TABEL "user"
        //    berdasarkan auth_user_id = user.id
        // =====================================================

        const { data: userRow, error: userRowError } = await supabase
          .from("user")
          .select("id_user, id_dosen")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (userRowError) {
          console.error("Gagal mengambil data user:", userRowError);
          return;
        }

        if (!userRow?.id_dosen) {
          console.error(
            "Akun ini tidak terhubung dengan data dosen.",
            userRow
          );
          return;
        }

        console.log("ID Dosen (dari tabel user):", userRow.id_dosen);

        // =====================================================
        // 3. AMBIL DATA DOSEN DARI TABEL "dosen"
        //    berdasarkan id_dosen
        // =====================================================

        const { data: dosenData, error: dosenError } = await supabase
          .from("dosen")
          .select(
            `
              id_dosen,
              nama_dosen,
              email,
              riwayat_pendidikan
            `
          )
          .eq("id_dosen", userRow.id_dosen)
          .maybeSingle();

        if (dosenError) {
          console.error("Gagal mengambil data dosen:", dosenError);
          return;
        }

        if (!dosenData) {
          console.error("Data dosen tidak ditemukan.");
          console.log("id_dosen yang dicari:", userRow.id_dosen);
          return;
        }

        console.log("=================================");
        console.log("DATA DOSEN");
        console.log("=================================");
        console.log("ID Dosen:", dosenData.id_dosen);
        console.log("Nama Dosen:", dosenData.nama_dosen);

        setDosen(dosenData);

        // =====================================================
        // 4. AMBIL JUMLAH MODUL MILIK DOSEN
        //    tabel modul, fk: dibuat_oleh -> dosen.id_dosen
        // =====================================================

        const { count, error: modulError } = await supabase
          .from("modul")
          .select("id_modul", {
            count: "exact",
            head: true,
          })
          .eq("dibuat_oleh", dosenData.id_dosen);

        if (modulError) {
          console.error("Gagal mengambil jumlah modul:", modulError);
        } else {
          setJumlahModul(count ?? 0);
        }
      } catch (error) {
        console.error("Terjadi kesalahan:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfilDosen();
  }, []);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white text-[#2b2540]">
        <Sidebar activeLabel="Profil" />

        <main className="flex flex-1 items-center justify-center">
          <div className="text-sm text-gray-400">
            Memuat profil dosen...
          </div>
        </main>
      </div>
    );
  }

  // =====================================================
  // USER TIDAK TERHUBUNG DENGAN DATA DOSEN
  // =====================================================

  if (!dosen) {
    return (
      <div className="flex min-h-screen bg-white text-[#2b2540]">
        <Sidebar activeLabel="Profil" />

        <main className="flex flex-1 items-center justify-center">
          <div className="rounded-2xl bg-red-50 p-6 text-center">
            <p className="mb-2 text-lg font-bold text-red-500">
              Data profil tidak ditemukan
            </p>

            <p className="text-sm text-gray-500">
              User yang sedang login belum memiliki data pada tabel dosen.
            </p>

            {userEmail && (
              <p className="mt-3 text-xs text-gray-400">
                Login sebagai: {userEmail}
              </p>
            )}
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
        {/* HEADER */}
        <div className="mb-6 flex items-start gap-8">
          {/* AVATAR */}
          <div className="flex h-[178px] w-[178px] items-center justify-center rounded-2xl bg-[#4a3f7a]">
            <svg
              className="h-20 w-20 text-white/70"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="8" r="4" />
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4a3f7a] text-white hover:bg-[#3d3466]"
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

            <p className="mb-1 text-sm text-[#a79fd6]">{userEmail}</p>

            <p className="mb-4 text-sm text-[#a79fd6]">
              Dosen Politeknik Negeri Malang
            </p>

            {/* JUMLAH MODUL */}
            <div className="flex w-fit items-center gap-3 rounded-xl bg-[#4a3f7a] px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.8"
                >
                  <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13zM20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13z" />
                </svg>
              </div>

              <div>
                <p className="text-lg font-extrabold text-white">
                  {jumlahModul}
                </p>
                <p className="text-xs text-[#c9c3e6]">Modul Anda</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIWAYAT + MODUL */}
        <div className="grid grid-cols-2 gap-6">
          {/* RIWAYAT PENDIDIKAN */}
          <div className="flex h-[240px] flex-col rounded-2xl bg-[#8a80b8] p-6 text-white">
            <h2 className="mb-6 text-lg font-bold">Riwayat pendidikan</h2>

            {dosen.riwayat_pendidikan ? (
              <p className="text-sm text-white/90">
                {dosen.riwayat_pendidikan}
              </p>
            ) : (
              <p className="text-sm text-white/60">
                Belum ada riwayat pendidikan.
              </p>
            )}

            <div className="mt-auto border-t border-white/30 pt-3 text-center">
              <a href="#" className="text-sm font-medium hover:underline">
                Lihat Semua
              </a>
            </div>
          </div>

          {/* MODUL */}
          <div className="flex h-[240px] flex-col rounded-2xl bg-[#8a80b8] p-6 text-white">
            <h2 className="text-lg font-bold">Modul Yang Anda Buat</h2>

            <p className="mt-2 text-sm text-white/70">
              {jumlahModul} modul telah dibuat.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
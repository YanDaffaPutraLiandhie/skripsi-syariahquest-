"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Dosen = {
  id_dosen: number;
  nama_dosen: string;
  email: string | null;
  riwayat_pendidikan: string | null;
  modul: number | null;
  foto_dosen: string | null;
};

export default function ProfilDosen() {
  const [dosen, setDosen] = useState<Dosen | null>(null);

  const [userEmail, setUserEmail] = useState("");
  const [authUserId, setAuthUserId] = useState("");

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // =====================================================
  // JUMLAH MODUL (DIHITUNG REAL-TIME DARI TABEL modul)
  // =====================================================

  const [jumlahModul, setJumlahModul] = useState<number>(0);

  // =====================================================
  // MODAL EDIT
  // =====================================================

  const [showEditModal, setShowEditModal] = useState(false);

  const [editNama, setEditNama] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRiwayat, setEditRiwayat] = useState("");

  // =====================================================
  // FOTO
  // =====================================================

  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  // =====================================================
  // STATUS
  // =====================================================

  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {
    loadProfilDosen();
  }, []);

  async function loadProfilDosen() {
    try {
      setLoading(true);
      setErrorMessage("");

      // =================================================
      // 1. AMBIL USER LOGIN
      // =================================================

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      console.log("AUTH USER:", user);

      if (authError) {
        throw new Error(
          `Gagal mengambil user login: ${authError.message}`
        );
      }

      if (!user) {
        throw new Error("Tidak ada user yang sedang login.");
      }

      setAuthUserId(user.id);
      setUserEmail(user.email ?? "");

      // =================================================
      // 2. AMBIL DATA USER
      // =================================================

      const { data: userRow, error: userError } = await supabase
        .from("user")
        .select("id_user, auth_user_id, id_dosen")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      console.log("USER DATABASE:", userRow);
      console.log("USER ERROR:", userError);

      if (userError) {
        throw new Error(
          `Gagal mengambil data user: ${userError.message}`
        );
      }

      if (!userRow) {
        throw new Error(
          "Data user belum terhubung dengan akun login."
        );
      }

      if (!userRow.id_dosen) {
        throw new Error(
          "Akun ini belum terhubung dengan data dosen."
        );
      }

      // =================================================
      // 3. AMBIL DATA DOSEN
      // =================================================

      const { data: dosenData, error: dosenError } = await supabase
        .from("dosen")
        .select(`
          id_dosen,
          nama_dosen,
          email,
          riwayat_pendidikan,
          modul,
          foto_dosen
        `)
        .eq("id_dosen", userRow.id_dosen)
        .maybeSingle();

      console.log("DOSEN DATA:", dosenData);
      console.log("DOSEN ERROR:", dosenError);

      if (dosenError) {
        throw new Error(
          `Gagal mengambil data dosen: ${dosenError.message}`
        );
      }

      if (!dosenData) {
        throw new Error("Data dosen tidak ditemukan.");
      }

      setDosen(dosenData);

      // =================================================
      // 4. HITUNG JUMLAH MODUL YANG DIBUAT DOSEN INI
      // =================================================

      const totalModul = await hitungJumlahModul(
        dosenData.nama_dosen,
        dosenData.id_dosen
      );

      setJumlahModul(totalModul);

      // =================================================
      // 5. SIMPAN HASIL HITUNGAN KE KOLOM dosen.modul
      // =================================================
      // Hanya update jika angkanya berbeda dari yang
      // tersimpan, supaya tidak menulis ke DB tanpa perlu
      // setiap kali halaman profil dibuka.
      // =================================================

      if (totalModul !== dosenData.modul) {
        const berhasilSimpan = await simpanJumlahModulKeDosen(
          dosenData.id_dosen,
          totalModul
        );

        if (berhasilSimpan) {
          setDosen((prev) =>
            prev ? { ...prev, modul: totalModul } : prev
          );
        }
      }

    } catch (error) {
      console.error("Gagal mengambil profil:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengambil profil dosen."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // HITUNG JUMLAH MODUL BERDASARKAN DOSEN YANG LOGIN
  // =====================================================
  //
  // Kolom "dibuat_oleh" pada tabel modul kadang berisi
  // nama_dosen (mis. "renald") dan kadang berisi id_dosen
  // (mis. "9"), jadi pencocokan dilakukan untuk keduanya
  // agar hasil hitungan akurat.
  // =====================================================

  async function hitungJumlahModul(
    namaDosen: string,
    idDosen: number
  ): Promise<number> {
    try {
      const nama = namaDosen.trim();

      // =================================================
      // Kolom "dibuat_oleh" pada tabel modul berisi
      // campuran nama dosen (mis. "renald", "jak") dan
      // id_dosen dalam bentuk teks (mis. "9"). Karena itu,
      // pencocokan dilakukan terhadap ketiganya:
      //   1. Nama persis (case-insensitive) -> ilike
      //   2. Id dosen sebagai angka           -> eq
      // =================================================

      const { data, count, error } = await supabase
        .from("modul")
        .select("id_modul, nama_modul, dibuat_oleh", {
          count: "exact",
        })
        .or(
          `dibuat_oleh.ilike.${nama},dibuat_oleh.eq.${idDosen}`
        );

      console.log("MODUL DITEMUKAN:", data);
      console.log("JUMLAH MODUL:", count);
      console.log("JUMLAH MODUL ERROR:", error);

      if (error) {
        console.error(
          "Gagal menghitung jumlah modul:",
          error
        );
        return 0;
      }

      return count ?? data?.length ?? 0;

    } catch (error) {
      console.error(
        "Gagal menghitung jumlah modul:",
        error
      );
      return 0;
    }
  }

  // =====================================================
  // SIMPAN JUMLAH MODUL KE KOLOM dosen.modul
  // =====================================================
  //
  // Menulis hasil hitungan dari tabel "modul" ke kolom
  // "modul" pada tabel "dosen", sehingga data tetap
  // tersinkron setiap kali profil dimuat/diperbarui.
  // =====================================================

  async function simpanJumlahModulKeDosen(
    idDosen: number,
    jumlah: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("dosen")
        .update({ modul: jumlah })
        .eq("id_dosen", idDosen);

      console.log(
        "SIMPAN JUMLAH MODUL KE DOSEN:",
        jumlah
      );
      console.log(
        "SIMPAN JUMLAH MODUL ERROR:",
        error
      );

      if (error) {
        console.error(
          "Gagal menyimpan jumlah modul ke tabel dosen:",
          error
        );
        return false;
      }

      return true;

    } catch (error) {
      console.error(
        "Gagal menyimpan jumlah modul ke tabel dosen:",
        error
      );
      return false;
    }
  }

  // =====================================================
  // BUKA MODAL EDIT
  // =====================================================

  function openEditModal() {
    console.log("TOMBOL EDIT DIKLIK");

    if (!dosen) {
      console.log("Data dosen belum tersedia.");
      return;
    }

    setEditNama(dosen.nama_dosen ?? "");
    setEditEmail(dosen.email ?? userEmail);
    setEditRiwayat(dosen.riwayat_pendidikan ?? "");

    setFotoFile(null);
    setFotoPreview(dosen.foto_dosen ?? null);

    setEditError("");
    setSuccessMessage("");

    setShowEditModal(true);
  }

  // =====================================================
  // TUTUP MODAL
  // =====================================================

  function closeEditModal() {
    if (saving) return;

    if (
      fotoPreview &&
      fotoPreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(fotoPreview);
    }

    setShowEditModal(false);
    setEditError("");
    setFotoFile(null);
    setFotoPreview(null);
  }

  // =====================================================
  // PILIH FOTO
  // =====================================================

  function handleFotoChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setEditError("File harus berupa gambar.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setEditError("Ukuran foto maksimal 5 MB.");
      return;
    }

    setEditError("");
    setFotoFile(file);

    if (
      fotoPreview &&
      fotoPreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(fotoPreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setFotoPreview(previewUrl);
  }

  // =====================================================
  // UPLOAD FOTO
  // =====================================================

  async function uploadFoto(
    file: File,
    idDosen: number
  ): Promise<string> {
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const filePath =
      `profil/dosen-${idDosen}-${Date.now()}.${extension}`;

    console.log("UPLOAD FOTO:", filePath);

    const { error: uploadError } = await supabase.storage
      .from("foto-dosen")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error(
        "Upload foto gagal:",
        uploadError
      );

      throw new Error(
        `Gagal upload foto: ${uploadError.message}`
      );
    }

    const { data } = supabase.storage
      .from("foto-dosen")
      .getPublicUrl(filePath);

    if (!data.publicUrl) {
      throw new Error(
        "URL foto tidak berhasil dibuat."
      );
    }

    console.log(
      "URL FOTO:",
      data.publicUrl
    );

    return data.publicUrl;
  }

  // =====================================================
  // SIMPAN PERUBAHAN
  // =====================================================

  async function handleUpdateProfil(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!dosen) return;

    try {
      setSaving(true);
      setEditError("");
      setSuccessMessage("");

      // =================================================
      // VALIDASI
      // =================================================

      const nama = editNama.trim();
      const email = editEmail.trim();
      const riwayat = editRiwayat.trim();

      if (!nama) {
        setEditError(
          "Nama dosen tidak boleh kosong."
        );
        return;
      }

      if (!email) {
        setEditError(
          "Email tidak boleh kosong."
        );
        return;
      }

      // =================================================
      // FOTO LAMA
      // =================================================

      let fotoUrl = dosen.foto_dosen;

      // =================================================
      // FOTO BARU
      // =================================================

      if (fotoFile) {
        fotoUrl = await uploadFoto(
          fotoFile,
          dosen.id_dosen
        );
      }

      // =================================================
      // UPDATE DATABASE
      // =================================================

      const {
        data: updatedDosen,
        error: updateError,
      } = await supabase
        .from("dosen")
        .update({
          nama_dosen: nama,
          email: email,
          riwayat_pendidikan: riwayat || null,
          foto_dosen: fotoUrl,
        })
        .eq("id_dosen", dosen.id_dosen)
        .select(`
          id_dosen,
          nama_dosen,
          email,
          riwayat_pendidikan,
          modul,
          foto_dosen
        `)
        .single();

      if (updateError) {
        console.error(
          "UPDATE DOSEN ERROR:",
          updateError
        );

        throw new Error(
          `Gagal menyimpan perubahan: ${updateError.message}`
        );
      }

      if (!updatedDosen) {
        throw new Error(
          "Data dosen tidak berhasil diperbarui."
        );
      }

      console.log(
        "DATA DOSEN SETELAH UPDATE:",
        updatedDosen
      );

      // =================================================
      // UPDATE STATE
      // =================================================

      setDosen(updatedDosen);

      setUserEmail(
        updatedDosen.email ?? ""
      );

      // Jika nama dosen berubah, hitung ulang jumlah modul
      // karena pencocokan "dibuat_oleh" bisa berdasarkan nama.
      const totalModul = await hitungJumlahModul(
        updatedDosen.nama_dosen,
        updatedDosen.id_dosen
      );

      setJumlahModul(totalModul);

      // Sinkronkan hasil hitungan terbaru ke kolom dosen.modul
      if (totalModul !== updatedDosen.modul) {
        const berhasilSimpan = await simpanJumlahModulKeDosen(
          updatedDosen.id_dosen,
          totalModul
        );

        if (berhasilSimpan) {
          setDosen((prev) =>
            prev ? { ...prev, modul: totalModul } : prev
          );
        }
      }

      if (
        fotoPreview &&
        fotoPreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          fotoPreview
        );
      }

      setFotoFile(null);
      setFotoPreview(null);
      setShowEditModal(false);

      setSuccessMessage(
        "Profil berhasil diperbarui."
      );

    } catch (error) {
      console.error(
        "Gagal menyimpan profil:",
        error
      );

      setEditError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan profil."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">

          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8a80b8] border-t-transparent" />

          <p className="text-sm text-gray-400">
            Memuat profil dosen...
          </p>

        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (!dosen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8">

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
              "Data dosen belum tersedia."}
          </p>

          {userEmail && (
            <div className="mb-4 rounded-xl bg-white p-4 text-left">

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
            type="button"
            onClick={loadProfilDosen}
            className="cursor-pointer rounded-xl bg-[#4a3f7a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d3466]"
          >
            Coba Lagi
          </button>

        </div>

      </div>
    );
  }

  // =====================================================
  // HALAMAN PROFIL
  // =====================================================

  return (
    <div className="relative min-h-screen bg-white text-[#2b2540]">

      <main className="relative z-0 p-8">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 flex items-start gap-8">

          {/* FOTO PROFIL */}

          <div className="flex h-[178px] w-[178px] flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#4a3f7a]">

            {dosen.foto_dosen ? (
              <img
                src={dosen.foto_dosen}
                alt={`Foto ${dosen.nama_dosen}`}
                className="h-full w-full object-cover"
              />
            ) : (
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
            )}

          </div>

          {/* DATA DOSEN */}

          <div className="flex-1">

            <div className="mb-1 flex items-center gap-3">

              <h1 className="text-2xl font-bold text-[#3d3466]">
                {dosen.nama_dosen}
              </h1>

              {/* =================================================
                  TOMBOL EDIT
              ================================================= */}

              <button
                type="button"
                onClick={openEditModal}
                aria-label="Edit profil"
                title="Edit Profil"
                className="relative z-20 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#4a3f7a] text-white shadow-md transition hover:bg-[#3d3466] active:scale-95"
              >

                <svg
                  className="pointer-events-none h-4 w-4"
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

            <p className="mb-1 text-sm text-[#a79fd6]">
              {dosen.email ||
                userEmail}
            </p>

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

        {/* =================================================
            PESAN BERHASIL
        ================================================= */}

        {successMessage && (
          <div className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-600">
            {successMessage}
          </div>
        )}

        {/* =================================================
            CONTENT
        ================================================= */}

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

              <button
                type="button"
                className="cursor-pointer text-sm font-medium hover:underline"
              >
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

      {/* =====================================================
          MODAL EDIT PROFIL
      ===================================================== */}

      {showEditModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeEditModal();
            }
          }}
        >

          <div
            className="relative z-[10000] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >

            {/* HEADER MODAL */}

            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">

              <div>

                <h2 className="text-xl font-bold text-[#3d3466]">
                  Edit Profil Dosen
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  Perbarui informasi profil Anda
                </p>

              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                aria-label="Tutup"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed"
              >
                <span className="text-xl leading-none">
                  ×
                </span>
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={handleUpdateProfil}
              className="max-h-[80vh] overflow-y-auto p-6"
            >

              {/* ERROR */}

              {editError && (
                <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {editError}
                </div>
              )}

              {/* FOTO */}

              <div className="mb-6">

                <label className="mb-3 block text-sm font-semibold text-[#3d3466]">
                  Foto Profil
                </label>

                <div className="flex items-center gap-5">

                  <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#4a3f7a]">

                    {fotoPreview ? (
                      <img
                        src={fotoPreview}
                        alt="Preview foto profil"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <svg
                        className="h-10 w-10 text-white/70"
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
                    )}

                  </div>

                  <div>

                    <label
                      htmlFor="foto-dosen"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#4a3f7a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d3466]"
                    >

                      <svg
                        className="pointer-events-none h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 16V4" />

                        <path d="M8 8l4-4 4 4" />

                        <path d="M4 20h16" />
                      </svg>

                      Pilih Foto

                    </label>

                    <input
                      id="foto-dosen"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFotoChange}
                      disabled={saving}
                      className="hidden"
                    />

                    <p className="mt-2 text-xs text-gray-400">
                      JPG, PNG, WEBP. Maksimal 5 MB.
                    </p>

                  </div>

                </div>

              </div>

              {/* NAMA */}

              <div className="mb-5">

                <label
                  htmlFor="edit-nama"
                  className="mb-2 block text-sm font-semibold text-[#3d3466]"
                >
                  Nama Dosen
                </label>

                <input
                  id="edit-nama"
                  type="text"
                  value={editNama}
                  onChange={(e) =>
                    setEditNama(e.target.value)
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-[#8a80b8] focus:ring-2 focus:ring-[#8a80b8]/20"
                  placeholder="Masukkan nama dosen"
                />

              </div>

              {/* EMAIL */}

              <div className="mb-5">

                <label
                  htmlFor="edit-email"
                  className="mb-2 block text-sm font-semibold text-[#3d3466]"
                >
                  Email
                </label>

                <input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) =>
                    setEditEmail(e.target.value)
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-[#8a80b8] focus:ring-2 focus:ring-[#8a80b8]/20"
                  placeholder="Masukkan email"
                />

              </div>

              {/* RIWAYAT PENDIDIKAN */}

              <div className="mb-5">

                <label
                  htmlFor="edit-riwayat"
                  className="mb-2 block text-sm font-semibold text-[#3d3466]"
                >
                  Riwayat Pendidikan
                </label>

                <textarea
                  id="edit-riwayat"
                  value={editRiwayat}
                  onChange={(e) =>
                    setEditRiwayat(e.target.value)
                  }
                  disabled={saving}
                  rows={5}
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-[#8a80b8] focus:ring-2 focus:ring-[#8a80b8]/20"
                  placeholder="Masukkan riwayat pendidikan"
                />

              </div>

              {/* JUMLAH MODUL */}

              <div className="mb-6 rounded-xl bg-[#f4f2fa] px-4 py-3">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-sm font-semibold text-[#3d3466]">
                      Jumlah Modul
                    </p>

                    <p className="text-xs text-gray-400">
                      Dikelola otomatis oleh sistem
                    </p>

                  </div>

                  <span className="text-xl font-bold text-[#4a3f7a]">
                    {jumlahModul}
                  </span>

                </div>

              </div>

              {/* BUTTON */}

              <div className="flex justify-end gap-3">

                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  className="cursor-pointer rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex min-w-[160px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#4a3f7a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d3466] disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {saving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}
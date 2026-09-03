"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DosenContainer from "@/components/layout/DosenContainer";

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
      <div className="flex min-h-screen items-center justify-center bg-[#f8f7fd]">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#4a3f7a]/20 border-t-[#4a3f7a]" />
          <p className="text-sm font-bold text-[#4a3f7a]">Memuat profil dosen...</p>
        </div>
      </div>
    );
  }

  if (!dosen) {
    return (
      <DosenContainer
        categoryTag="PROFIL DOSEN"
        title="Gagal Memuat Profil"
        subtitle="Data akun dosen tidak dapat ditemukan atau belum terhubung."
      >
        <div className="mx-auto max-w-lg rounded-[28px] bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
          <h2 className="mb-2 text-lg font-bold text-rose-600">
            Data profil tidak ditemukan
          </h2>
          <p className="mb-4 text-xs font-semibold text-[#8b84a5]">
            {errorMessage || "Data dosen belum tersedia."}
          </p>

          {userEmail && (
            <div className="mb-6 rounded-2xl bg-[#f8f7fd] p-4 text-left ring-1 ring-[#4a3f7a]/10">
              <p className="text-xs text-[#8b84a5]">Email Account:</p>
              <p className="mt-0.5 text-sm font-bold text-[#4a3f7a]">{userEmail}</p>
            </div>
          )}

          <button
            type="button"
            onClick={loadProfilDosen}
            className="rounded-full bg-[#4a3f7a] px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-[#3d3466] transition"
          >
            Coba Lagi
          </button>
        </div>
      </DosenContainer>
    );
  }

  return (
    <DosenContainer
      categoryTag="AKUN & PROFIL"
      title="Profil Pengajar Dosen"
      subtitle="Kelola data pribadi, foto profil, dan pantau statistik modul pembelajaran."
      headerAction={
        <button
          type="button"
          onClick={openEditModal}
          className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-xs font-bold text-amber-950 shadow-md shadow-amber-900/20 hover:bg-amber-300 transition"
        >
          Edit Profil Dosen
        </button>
      }
    >
      {/* HEADER CARD */}
      <div className="mb-8 rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* FOTO PROFIL */}
          <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#4a3f7a] to-[#3d3466] shadow-md ring-4 ring-white">
            {dosen.foto_dosen ? (
              <img
                src={dosen.foto_dosen}
                alt={`Foto ${dosen.nama_dosen}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <svg
                className="h-16 w-16 text-amber-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20a8 8 0 0 1 16 0" />
              </svg>
            )}
          </div>

          {/* DATA DOSEN */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-black text-[#2b2540]">
              {dosen.nama_dosen}
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#8b84a5]">
              {dosen.email || userEmail}
            </p>
            <p className="mt-0.5 text-xs font-bold text-[#4a3f7a]">
              Dosen Pengampu Syariah Quest
            </p>

            <div className="mt-4 inline-flex items-center gap-4 rounded-2xl bg-[#f8f7fd] px-5 py-3 ring-1 ring-[#4a3f7a]/10">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4a3f7a] text-amber-300 shadow-sm">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13z" />
                  <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-black text-[#2b2540]">{jumlahModul}</p>
                <p className="text-[11px] font-bold text-[#8b84a5]">Modul Dibuat</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-center text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
          {successMessage}
        </div>
      )}

      {/* CARDS INFORMATION */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* RIWAYAT PENDIDIKAN */}
        <div className="flex min-h-[220px] flex-col rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-black/5">
          <h2 className="text-lg font-bold text-[#3d3466] border-b border-[#f0edf9] pb-3">
            Riwayat Pendidikan
          </h2>
          <div className="mt-4 flex-1">
            {dosen.riwayat_pendidikan ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-[#2b2540]">
                {dosen.riwayat_pendidikan}
              </p>
            ) : (
              <p className="text-sm font-semibold text-[#8b84a5]">
                Belum ada riwayat pendidikan yang diisi.
              </p>
            )}
          </div>
        </div>

        {/* MODUL SINKRON */}
        <div className="flex min-h-[220px] flex-col rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-black/5">
          <h2 className="text-lg font-bold text-[#3d3466] border-b border-[#f0edf9] pb-3">
            Statistik Pembelajaran
          </h2>
          <div className="mt-4 flex-1 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-[#f8f7fd] p-4 ring-1 ring-[#4a3f7a]/5">
              <span className="text-sm font-bold text-[#4a3f7a]">Total Modul Diterbitkan</span>
              <span className="text-xl font-black text-[#2b2540]">{jumlahModul}</span>
            </div>
            <p className="text-xs font-medium text-[#8b84a5]">
              Jumlah modul ini terhubung otomatis secara real-time dengan basis data modul Anda.
            </p>
          </div>
        </div>
      </div>

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
    </DosenContainer>
  );
}
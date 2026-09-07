"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Dosen = {
  id_dosen: number;
  nama_dosen: string;
  email: string | null;
  riwayat_pendidikan: string | null;
  modul: number | null;
  foto_dosen: string | null;
};

export default function EditProfilDosenPage() {
  const router = useRouter();

  const [dosen, setDosen] = useState<Dosen | null>(null);

  const [namaDosen, setNamaDosen] = useState("");
  const [email, setEmail] = useState("");
  const [riwayatPendidikan, setRiwayatPendidikan] = useState("");

  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // =====================================================
  // AMBIL DATA DOSEN
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

      if (authError) {
        throw new Error(
          `Gagal mengambil user login: ${authError.message}`
        );
      }

      if (!user) {
        throw new Error("Tidak ada user yang sedang login.");
      }

      // =================================================
      // 2. AMBIL DATA USER
      // =================================================

      const { data: userRow, error: userError } = await supabase
        .from("user")
        .select("id_user, auth_user_id, id_dosen")
        .eq("auth_user_id", user.id)
        .maybeSingle();

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

      if (dosenError) {
        throw new Error(
          `Gagal mengambil data dosen: ${dosenError.message}`
        );
      }

      if (!dosenData) {
        throw new Error("Data dosen tidak ditemukan.");
      }

      // =================================================
      // 4. MASUKKAN DATA KE FORM
      // =================================================

      setDosen(dosenData);

      setNamaDosen(dosenData.nama_dosen ?? "");

      setEmail(
        dosenData.email ?? user.email ?? ""
      );

      setRiwayatPendidikan(
        dosenData.riwayat_pendidikan ?? ""
      );

      setFotoPreview(
        dosenData.foto_dosen ?? null
      );

    } catch (error) {
      console.error("Gagal mengambil profil:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengambil profil."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // PILIH FOTO
  // =====================================================

  function handleFotoChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Ukuran foto maksimal 5 MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("File harus berupa gambar.");
      return;
    }

    setErrorMessage("");
    setFotoFile(file);

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

    const { error: uploadError } = await supabase.storage
      .from("foto-dosen")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(
        `Gagal upload foto: ${uploadError.message}`
      );
    }

    const { data } = supabase.storage
      .from("foto-dosen")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  // =====================================================
  // SIMPAN PROFIL
  // =====================================================

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!dosen) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      // =================================================
      // VALIDASI
      // =================================================

      if (!namaDosen.trim()) {
        setErrorMessage("Nama dosen tidak boleh kosong.");
        setSaving(false);
        return;
      }

      if (!email.trim()) {
        setErrorMessage("Email tidak boleh kosong.");
        setSaving(false);
        return;
      }

      // =================================================
      // FOTO
      // =================================================

      let fotoUrl = dosen.foto_dosen;

      if (fotoFile) {
        fotoUrl = await uploadFoto(
          fotoFile,
          dosen.id_dosen
        );
      }

      // =================================================
      // UPDATE TABEL DOSEN
      // =================================================

      const { error: updateError } = await supabase
        .from("dosen")
        .update({
          nama_dosen: namaDosen.trim(),
          email: email.trim(),
          riwayat_pendidikan:
            riwayatPendidikan.trim() || null,
          foto_dosen: fotoUrl,
        })
        .eq("id_dosen", dosen.id_dosen);

      if (updateError) {
        throw new Error(
          `Gagal menyimpan profil: ${updateError.message}`
        );
      }

      // =================================================
      // KEMBALI KE PROFIL
      // =================================================

      router.push("/Dosen/profil_dosen");
      router.refresh();

    } catch (error) {
      console.error(
        "Gagal menyimpan profil:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan perubahan."
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
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8a80b8] border-t-transparent" />

          <p className="text-sm text-gray-400">
            Memuat profil...
          </p>
        </div>
      </main>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (!dosen) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-8">
        <div className="w-full max-w-lg rounded-2xl bg-red-50 p-6 text-center">

          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-7 w-7 text-red-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>

          <h2 className="text-lg font-bold text-red-600">
            Profil tidak ditemukan
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => router.push("/Dosen/profil_dosen")}
            className="mt-5 cursor-pointer rounded-xl bg-[#4a3f7a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3d3466]"
          >
            Kembali
          </button>

        </div>
      </main>
    );
  }

  // =====================================================
  // HALAMAN EDIT
  // =====================================================

  return (
    <main className="min-h-screen bg-[#f8f7fb] p-8">

      <div className="mx-auto max-w-3xl">

        {/* HEADER */}

        <div className="mb-6 flex items-center gap-4">

          <button
            type="button"
            onClick={() =>
              router.push("/Dosen/profil_dosen")
            }
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-xl text-[#4a3f7a] shadow-sm transition hover:bg-[#4a3f7a] hover:text-white"
          >
            ←
          </button>

          <div>
            <h1 className="text-2xl font-bold text-[#3d3466]">
              Edit Profil Dosen
            </h1>

            <p className="mt-1 text-sm text-gray-400">
              Perbarui informasi profil Anda
            </p>
          </div>

        </div>

        {/* FORM CARD */}

        <div className="rounded-2xl bg-white p-8 shadow-sm">

          <form onSubmit={handleSubmit}>

            {/* ERROR */}

            {errorMessage && (
              <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            {/* FOTO */}

            <div className="mb-8">

              <label className="mb-3 block text-sm font-semibold text-[#3d3466]">
                Foto Profil
              </label>

              <div className="flex items-center gap-6">

                <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#4a3f7a]">

                  {fotoPreview ? (
                    <img
                      src={fotoPreview}
                      alt="Foto profil dosen"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <svg
                      className="h-14 w-14 text-white/70"
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
                    htmlFor="fotoDosen"
                    className="inline-flex cursor-pointer rounded-xl bg-[#4a3f7a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3d3466]"
                  >
                    Pilih Foto
                  </label>

                  <input
                    id="fotoDosen"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFotoChange}
                    disabled={saving}
                    className="hidden"
                  />

                  <p className="mt-2 text-xs text-gray-400">
                    JPG, PNG, atau WEBP
                  </p>

                  <p className="text-xs text-gray-400">
                    Maksimal 5 MB
                  </p>

                </div>

              </div>

            </div>

            {/* NAMA */}

            <div className="mb-6">

              <label
                htmlFor="namaDosen"
                className="mb-2 block text-sm font-semibold text-[#3d3466]"
              >
                Nama Dosen
              </label>

              <input
                id="namaDosen"
                type="text"
                value={namaDosen}
                onChange={(e) =>
                  setNamaDosen(e.target.value)
                }
                disabled={saving}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-[#8a80b8] focus:ring-2 focus:ring-[#8a80b8]/20"
                placeholder="Masukkan nama dosen"
              />

            </div>

            {/* EMAIL */}

            <div className="mb-6">

              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-[#3d3466]"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                disabled={saving}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-[#8a80b8] focus:ring-2 focus:ring-[#8a80b8]/20"
                placeholder="Masukkan email"
              />

            </div>

            {/* RIWAYAT PENDIDIKAN */}

            <div className="mb-6">

              <label
                htmlFor="riwayat"
                className="mb-2 block text-sm font-semibold text-[#3d3466]"
              >
                Riwayat Pendidikan
              </label>

              <textarea
                id="riwayat"
                value={riwayatPendidikan}
                onChange={(e) =>
                  setRiwayatPendidikan(
                    e.target.value
                  )
                }
                disabled={saving}
                rows={6}
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-[#8a80b8] focus:ring-2 focus:ring-[#8a80b8]/20"
                placeholder="Masukkan riwayat pendidikan"
              />

            </div>

            {/* BUTTON */}

            <div className="flex justify-end gap-3">

              <button
                type="button"
                onClick={() =>
                  router.push("/Dosen/profil_dosen")
                }
                disabled={saving}
                className="cursor-pointer rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex min-w-[170px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#4a3f7a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3d3466] disabled:cursor-not-allowed disabled:opacity-60"
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

    </main>
  );
}
"use client";

import { Suspense, useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { logActivity } from "@/lib/logActivity";

const LEVELS = [
  { key: "easy", label: "Easy", color: "bg-emerald-500" },
  { key: "medium", label: "Medium", color: "bg-amber-400" },
  { key: "hard", label: "Hard", color: "bg-red-600" },
] as const;

type LevelKey = (typeof LEVELS)[number]["key"];

const BUCKET = "modul";

type UploadBoxProps = {
  label: string;
  borderColor: string;
  onFile: (file: File | null) => void;
  fileName: string | null;
};

function UploadBox({
  label,
  borderColor,
  onFile,
  fileName,
}: UploadBoxProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-white">
        {label}
      </label>

      <label
        className={`flex h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white text-center ${borderColor}`}
      >
        <span className="px-4 text-sm font-semibold text-[#a3a0b5]">
          {fileName ?? "Unggah File disini"}
        </span>

        <input
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            onFile(file);
          }}
        />
      </label>
    </div>
  );
}

function TambahModulContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /*
   * =========================================================
   * AMBIL ID DARI URL
   * Contoh:
   * /Dosen/modul/tambah_modul?id=12
   * =========================================================
   */
  const idParam = searchParams.get("id");

  const editId =
    idParam && /^\d+$/.test(idParam)
      ? Number(idParam)
      : 0;

  const [nilai, setNilai] = useState(80);

  const [level, setLevel] =
    useState<LevelKey>("medium");

  const [namaModul, setNamaModul] =
    useState("");

  const [linkVideo, setLinkVideo] =
    useState("");

  const [docFile, setDocFile] =
    useState<File | null>(null);

  const [thumbnailFile, setThumbnailFile] =
    useState<File | null>(null);

  const [docLabel, setDocLabel] =
    useState<string | null>(null);

  const [thumbnailLabel, setThumbnailLabel] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isEditMode, setIsEditMode] =
    useState(false);

  const [editingModuleId, setEditingModuleId] =
    useState<number | null>(null);

  /*
   * =========================================================
   * DATA DOSEN LOGIN
   * =========================================================
   */
  const [idDosen, setIdDosen] =
    useState<number | null>(null);

  const [namaDosen, setNamaDosen] =
    useState("");

  const [loadingDosen, setLoadingDosen] =
    useState(true);

  /*
   * =========================================================
   * LEVEL
   * =========================================================
   */
  const LEVEL_VALUE: Record<LevelKey, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
  };

  function getLevelKeyFromId(
    idLevel: number | null
  ): LevelKey {
    switch (idLevel) {
      case 1:
        return "easy";

      case 3:
        return "hard";

      case 2:
      default:
        return "medium";
    }
  }

  /*
   * =========================================================
   * LOAD MODUL UNTUK EDIT
   * =========================================================
   */
  useEffect(() => {
    let cancelled = false;

    async function loadExistingModule() {
      if (!editId) {
        setIsEditMode(false);
        setEditingModuleId(null);
        return;
      }

      setIsEditMode(true);
      setEditingModuleId(editId);
      setLoading(true);
      setMessage("");

      try {
        const {
          data,
          error,
        } = await supabase
          .from("modul")
          .select(
            `
              id_modul,
              nama_modul,
              id_level,
              video_url,
              thumbnail_url,
              dokumen_pendukung,
              parameter_nilai
            `
          )
          .eq("id_modul", editId)
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (error) {
          console.error(
            "Gagal memuat modul:",
            error
          );

          setMessage(
            `Gagal memuat data modul: ${error.message}`
          );

          return;
        }

        if (!data) {
          setMessage(
            "Modul yang dipilih tidak ditemukan."
          );

          return;
        }

        setNamaModul(
          data.nama_modul ?? ""
        );

        setLevel(
          getLevelKeyFromId(data.id_level)
        );

        setLinkVideo(
          data.video_url ?? ""
        );

        setNilai(
          data.parameter_nilai ?? 80
        );

        setThumbnailLabel(
          data.thumbnail_url
            ? "File thumbnail sudah ada"
            : null
        );

        setDocLabel(
          data.dokumen_pendukung
            ? "File dokumen sudah ada"
            : null
        );
      } catch (error) {
        console.error(
          "Gagal memuat modul untuk edit:",
          error
        );

        if (!cancelled) {
          setMessage(
            "Gagal memuat data modul yang akan diedit."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadExistingModule();

    return () => {
      cancelled = true;
    };
  }, [editId]);

  /*
   * =========================================================
   * AMBIL DATA DOSEN LOGIN
   * =========================================================
   */
  useEffect(() => {
    let cancelled = false;

    async function fetchDosen() {
      setLoadingDosen(true);

      try {
        /*
         * 1. USER AUTH SUPABASE
         */
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error(
            "Gagal mendapatkan user yang sedang login:",
            authError
          );

          if (!cancelled) {
            setMessage(
              "Gagal mendapatkan data user yang sedang login."
            );
          }

          return;
        }

        console.log(
          "Auth User ID:",
          user.id
        );

        /*
         * =====================================================
         * 2. CARI id_dosen DI TABEL user
         * =====================================================
         */
        const {
          data: userData,
          error: userError,
        } = await supabase
          .from("user")
          .select("id_dosen")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (userError) {
          console.error(
            "Gagal mendapatkan id_dosen:",
            userError
          );

          if (!cancelled) {
            setMessage(
              "Gagal mengambil data dosen dari akun Anda."
            );
          }

          return;
        }

        if (!userData?.id_dosen) {
          if (!cancelled) {
            setMessage(
              "Akun yang sedang login belum terhubung dengan data dosen."
            );
          }

          return;
        }

        const dosenId = Number(
          userData.id_dosen
        );

        console.log(
          "ID Dosen:",
          dosenId
        );

        if (cancelled) {
          return;
        }

        setIdDosen(dosenId);

        /*
         * =====================================================
         * 3. AMBIL NAMA DOSEN
         * =====================================================
         */
        const {
          data: dosenData,
          error: dosenError,
        } = await supabase
          .from("dosen")
          .select("nama_dosen")
          .eq("id_dosen", dosenId)
          .maybeSingle();

        if (dosenError) {
          console.error(
            "Gagal mendapatkan data dosen:",
            dosenError
          );

          if (!cancelled) {
            setMessage(
              "Data dosen tidak ditemukan."
            );
          }

          return;
        }

        if (!dosenData?.nama_dosen) {
          if (!cancelled) {
            setMessage(
              "Nama dosen belum tersedia di database."
            );
          }

          return;
        }

        console.log(
          "Nama Dosen:",
          dosenData.nama_dosen
        );

        if (!cancelled) {
          setNamaDosen(
            dosenData.nama_dosen
          );
        }
      } catch (error) {
        console.error(
          "Terjadi kesalahan saat mengambil data dosen:",
          error
        );

        if (!cancelled) {
          setMessage(
            "Terjadi kesalahan saat mengambil data dosen."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingDosen(false);
        }
      }
    }

    fetchDosen();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * =========================================================
   * UPLOAD FILE
   * =========================================================
   */
  async function uploadFile(
    file: File,
    folder: string
  ): Promise<string | null> {
    try {
      /*
       * Bersihkan nama file agar lebih aman
       */
      const safeFileName = file.name
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "");

      const filePath = `${folder}/${Date.now()}-${safeFileName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file);

      if (uploadError) {
        console.error(
          "Upload error:",
          uploadError
        );

        return null;
      }

      const {
        data,
      } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      return data?.publicUrl ?? null;
    } catch (error) {
      console.error(
        "Unexpected upload error:",
        error
      );

      return null;
    }
  }

  /*
   * =========================================================
   * RESET FORM
   * =========================================================
   */
  function resetForm() {
    setNamaModul("");
    setLinkVideo("");
    setDocFile(null);
    setThumbnailFile(null);
    setDocLabel(null);
    setThumbnailLabel(null);
    setNilai(80);
    setLevel("medium");
    setMessage("");
  }

  /*
   * =========================================================
   * SIMPAN MODUL
   * =========================================================
   */
  async function handleSubmit() {
    /*
     * VALIDASI NAMA
     */
    if (!namaModul.trim()) {
      setMessage(
        "Nama modul tidak boleh kosong."
      );

      return;
    }

    /*
     * VALIDASI DOSEN
     */
    if (!idDosen) {
      setMessage(
        "Data dosen belum ditemukan. Silakan refresh halaman atau login kembali."
      );

      return;
    }

    setLoading(true);
    setMessage("");

    try {
      /*
       * =====================================================
       * CEK USER LOGIN
       * =====================================================
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(
          "Gagal mendapatkan user login:",
          userError
        );

        setMessage(
          "Anda belum login."
        );

        return;
      }

      /*
       * =====================================================
       * URL THUMBNAIL
       * =====================================================
       */
      let thumbnail_url = "";

      if (thumbnailFile) {
        const url = await uploadFile(
          thumbnailFile,
          "thumbnail"
        );

        if (!url) {
          setMessage(
            "Gagal mengunggah thumbnail."
          );

          return;
        }

        thumbnail_url = url;
      } else if (
        isEditMode &&
        editingModuleId
      ) {
        const {
          data: existing,
          error: existingError,
        } = await supabase
          .from("modul")
          .select("thumbnail_url")
          .eq(
            "id_modul",
            editingModuleId
          )
          .maybeSingle();

        if (existingError) {
          console.error(
            "Gagal mengambil thumbnail lama:",
            existingError
          );
        }

        thumbnail_url =
          existing?.thumbnail_url ?? "";
      }

      /*
       * =====================================================
       * URL DOKUMEN
       * =====================================================
       */
      let dokumen_pendukung = "";

      if (docFile) {
        const url = await uploadFile(
          docFile,
          "dokumen"
        );

        if (!url) {
          setMessage(
            "Gagal mengunggah dokumen."
          );

          return;
        }

        dokumen_pendukung = url;
      } else if (
        isEditMode &&
        editingModuleId
      ) {
        const {
          data: existing,
          error: existingError,
        } = await supabase
          .from("modul")
          .select("dokumen_pendukung")
          .eq(
            "id_modul",
            editingModuleId
          )
          .maybeSingle();

        if (existingError) {
          console.error(
            "Gagal mengambil dokumen lama:",
            existingError
          );
        }

        dokumen_pendukung =
          existing?.dokumen_pendukung ?? "";
      }

      /*
       * =====================================================
       * PAYLOAD
       * =====================================================
       */
      const payload = {
        nama_modul:
          namaModul.trim(),

        id_level:
          LEVEL_VALUE[level],

        video_url:
          linkVideo.trim() || null,

        thumbnail_url:
          thumbnail_url || null,

        dokumen_pendukung:
          dokumen_pendukung || null,

        parameter_nilai:
          nilai,
      };

      /*
       * =====================================================
       * MODE EDIT
       * =====================================================
       */
      if (
        isEditMode &&
        editingModuleId
      ) {
        const {
          error: updateError,
        } = await supabase
          .from("modul")
          .update(payload)
          .eq(
            "id_modul",
            editingModuleId
          );

        if (updateError) {
          console.error(
            "Update modul error:",
            updateError
          );

          setMessage(
            `Gagal memperbarui modul: ${updateError.message}`
          );

          return;
        }

        /*
         * CATAT AKTIVITAS EDIT
         */
        try {
          await logActivity({
            fitur: "Modul",
            jenis_aktivitas: "Edit",
            keterangan: `Dosen ${namaDosen} memperbarui modul "${namaModul.trim()}"`,
          });
        } catch (logError) {
          console.error(
            "Gagal mencatat aktivitas edit modul:",
            logError
          );
        }

        setMessage(
          "Modul berhasil diperbarui."
        );

        setTimeout(() => {
          router.push(
            "/Dosen/modul"
          );
        }, 800);

        return;
      }

      /*
       * =====================================================
       * MODE TAMBAH
       * =====================================================
       */
      const {
        data,
        error: insertError,
      } = await supabase
        .from("modul")
        .insert({
          ...payload,

          dibuat_oleh:
            idDosen,

          status: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error(
          "Insert modul error:",
          insertError
        );

        setMessage(
          `Gagal menyimpan modul: ${insertError.message}`
        );

        return;
      }

      console.log(
        "Modul berhasil dibuat:",
        data
      );

      /*
       * =====================================================
       * CATAT AKTIVITAS
       * =====================================================
       */
      try {
        await logActivity({
          fitur: "Modul",
          jenis_aktivitas: "Tambah",
          keterangan: `Dosen ${namaDosen} menambahkan modul "${namaModul.trim()}"`,
        });
      } catch (logError) {
        /*
         * LOG GAGAL TIDAK MEMBATALKAN
         * PEMBUATAN MODUL
         */
        console.error(
          "Gagal mencatat aktivitas tambah modul:",
          logError
        );
      }

      setMessage(
        `Modul berhasil disimpan oleh ${namaDosen}!`
      );

      /*
       * RESET FORM
       */
      setTimeout(() => {
        resetForm();
      }, 1500);
    } catch (error) {
      console.error(
        "Terjadi kesalahan saat menyimpan modul:",
        error
      );

      setMessage(
        "Terjadi kesalahan, coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */
  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <Sidebar activeLabel="Modul Pembelajaran" />

      <main className="flex-1 p-8">
        <div className="rounded-[24px] bg-[#4a3f7a] p-8">

          {/* =================================================
              DOSEN
          ================================================= */}
          <div className="mb-4 text-sm font-semibold text-white">
            {loadingDosen ? (
              "Memuat data dosen..."
            ) : isEditMode ? (
              <>
                Edit modul:{" "}
                {namaDosen || "Dosen"}
              </>
            ) : namaDosen ? (
              <>
                Dibuat oleh:{" "}
                {namaDosen}
              </>
            ) : (
              "Data dosen tidak ditemukan."
            )}
          </div>

          {/* =================================================
              PARAMETER NILAI & LEVEL
          ================================================= */}
          <div className="mb-8 flex items-start gap-6">

            {/* PARAMETER NILAI */}
            <div className="rounded-2xl bg-white px-8 py-4">
              <label className="mb-2 block text-center text-sm font-bold text-[#2b2540]">
                Set Parameter Nilai
              </label>

              <div className="flex items-center justify-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={nilai}
                  onChange={(e) => {
                    const rawValue =
                      e.target.value;

                    if (rawValue === "") {
                      setNilai(0);
                      return;
                    }

                    const value =
                      Number(rawValue);

                    if (
                      value >= 0 &&
                      value <= 100
                    ) {
                      setNilai(value);
                    }
                  }}
                  className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-center text-lg font-bold text-[#2b2540] outline-none focus:border-emerald-500"
                />

                <span className="text-lg font-bold text-[#2b2540]">
                  %
                </span>
              </div>
            </div>

            {/* LEVEL */}
            <div className="flex-1 rounded-2xl bg-white px-8 py-4">
              <p className="mb-3 text-center text-sm font-bold text-[#2b2540]">
                Level Modul
              </p>

              <div className="flex justify-center gap-3">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl.key}
                    type="button"
                    onClick={() =>
                      setLevel(
                        lvl.key
                      )
                    }
                    className={`rounded-full px-6 py-2 text-sm font-bold text-white transition-opacity ${lvl.color} ${
                      level === lvl.key
                        ? "opacity-100"
                        : "opacity-50 hover:opacity-80"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* =================================================
              NAMA MODUL
          ================================================= */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-white">
              Nama Modul
            </label>

            <input
              type="text"
              value={namaModul}
              onChange={(e) =>
                setNamaModul(
                  e.target.value
                )
              }
              placeholder="Tulis nama modul"
              className="h-11 w-full rounded-full border-2 border-emerald-400 bg-white px-4 text-sm text-[#2b2540] outline-none placeholder:text-[#c9c6d6]"
            />
          </div>

          {/* =================================================
              LINK VIDEO
          ================================================= */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-white">
              Link Video Pembelajaran
            </label>

            <input
              type="text"
              value={linkVideo}
              onChange={(e) =>
                setLinkVideo(
                  e.target.value
                )
              }
              placeholder="Tempel link video"
              className="h-11 w-full rounded-full border-2 border-orange-400 bg-white px-4 text-sm text-[#2b2540] outline-none placeholder:text-[#c9c6d6]"
            />
          </div>

          {/* =================================================
              UPLOAD FILE
          ================================================= */}
          <div className="mb-8 grid grid-cols-2 gap-6">

            <UploadBox
              label="Dokumen Pembelajaran (Doc/Pdf)"
              borderColor="border-sky-400"
              onFile={setDocFile}
              fileName={
                docFile?.name ??
                docLabel
              }
            />

            <UploadBox
              label="Thumbnail Modul Pembelajaran (Jpg/Png)"
              borderColor="border-amber-400"
              onFile={
                setThumbnailFile
              }
              fileName={
                thumbnailFile?.name ??
                thumbnailLabel
              }
            />
          </div>

          {/* =================================================
              PESAN
          ================================================= */}
          {message && (
            <p className="mb-4 text-center text-sm font-semibold text-white">
              {message}
            </p>
          )}

          {/* =================================================
              BUTTON
          ================================================= */}
          <div className="flex justify-end gap-3">

            <button
              type="button"
              onClick={() => {
                if (isEditMode) {
                  router.push(
                    "/Dosen/modul"
                  );
                  return;
                }

                resetForm();
              }}
              className="rounded-full bg-[#3d3466] px-6 py-2 text-sm font-semibold text-white hover:bg-[#342c58]"
            >
              {isEditMode
                ? "Kembali"
                : "Batal"}
            </button>

            <button
              type="button"
              onClick={
                handleSubmit
              }
              disabled={
                loading ||
                loadingDosen ||
                !idDosen
              }
              className="rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-300 disabled:opacity-50"
            >
              {loading
                ? "Menyimpan..."
                : loadingDosen
                ? "Memuat..."
                : "Selesai"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

/*
 * ===========================================================
 * PAGE WRAPPER
 *
 * PENTING:
 * useSearchParams() berada di TambahModulContent.
 * Component tersebut dibungkus Suspense.
 *
 * Ini memperbaiki:
 *
 * useSearchParams() should be wrapped in a suspense boundary
 *
 * pada `next build`.
 * ===========================================================
 */
export default function TambahModulPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-white">
          <Sidebar activeLabel="Modul Pembelajaran" />

          <main className="flex flex-1 items-center justify-center p-8">
            <div className="rounded-2xl bg-[#f8f7ff] px-8 py-6 shadow-sm">
              <p className="text-sm font-semibold text-[#4a3f7a]">
                Memuat halaman modul...
              </p>
            </div>
          </main>
        </div>
      }
    >
      <TambahModulContent />
    </Suspense>
  );
}
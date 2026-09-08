"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { logActivity } from "@/lib/logActivity";
import { extractDocumentText } from "@/lib/extractDocumentText";
import DosenContainer from "@/components/layout/DosenContainer";

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
      <label className="mb-2 block text-sm font-bold text-[#3d3466]">
        {label}
      </label>

      <label
        className={`flex h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-[#f8f7fd] hover:bg-[#f0edf9] transition-all text-center ${borderColor}`}
      >
        <span className="px-4 text-sm font-bold text-[#4a3f7a]">
          {fileName ?? "Klik untuk unggah file di sini"}
        </span>
        <span className="mt-1 text-xs text-[#8b84a5]">
          Format dokumen/gambar yang didukung
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


interface ModulForm {
  idLevel: number | null
  namaModul: string
  teksMateri: string
  linkVideo: string
  parameterNilai: number
  dokumenFile: File | null
  thumbnailFile: File | null
  dokumenFileName: string
  thumbnailFileName: string
}

const emptyForm: ModulForm = {
  idLevel: null,
  namaModul: '',
  teksMateri: '',
  linkVideo: '',
  parameterNilai: 80,
  dokumenFile: null,
  thumbnailFile: null,
  dokumenFileName: '',
  thumbnailFileName: '',
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

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ModulForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
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

  async function handleDocumentFile(file: File | null) {
    setDocFile(file);
    if (!file) return;

    try {
      const text = await extractDocumentText(file);
      setForm((previous) => ({ ...previous, teksMateri: text }));
      setMessage("Isi dokumen berhasil dibaca dan dimasukkan ke materi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Isi dokumen belum dapat dibaca.");
    }
  }

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
    setForm(emptyForm);
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

        teks_materi:
          form.teksMateri.trim() || null,

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
    <DosenContainer
      categoryTag="MODUL PEMBELAJARAN"
      title={isEditMode ? "Edit Modul Pembelajaran" : "Buat Modul Pembelajaran"}
      subtitle={
        isEditMode
          ? "Perbarui informasi materi, video, atau dokumen pendukung modul."
          : "Isi formulir di bawah ini untuk membuat modul pembelajaran baru."
      }
      headerAction={
        <button
          type="button"
          onClick={() => router.push("/Dosen/modul")}
          className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          ← Kembali ke Modul
        </button>
      }
    >
      <div className="mx-auto max-w-4xl rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-black/5">
        {/* DOSEN INFO BADGE */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#f8f7fd] px-4 py-2 text-xs font-semibold text-[#4a3f7a] ring-1 ring-[#4a3f7a]/10">
          <span className="h-2 w-2 rounded-full bg-[#4a3f7a]" />
          {loadingDosen ? (
            "Memuat data dosen..."
          ) : isEditMode ? (
            <>Mode Edit • Pengajar: {namaDosen || "Dosen"}</>
          ) : namaDosen ? (
            <>Pembuat Modul: {namaDosen}</>
          ) : (
            "Data dosen tidak ditemukan."
          )}
        </div>

        {/* PARAMETER NILAI & LEVEL */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* PARAMETER NILAI */}
          <div className="rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] p-5">
            <label className="mb-2 block text-center text-sm font-bold text-[#3d3466]">
              Set Parameter Nilai Kelulusan
            </label>
            <div className="flex items-center justify-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={nilai}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  if (rawValue === "") {
                    setNilai(0);
                    return;
                  }
                  const value = Number(rawValue);
                  if (value >= 0 && value <= 100) {
                    setNilai(value);
                  }
                }}
                className="w-24 rounded-xl border border-[#4a3f7a]/20 bg-white px-3 py-2 text-center text-xl font-black text-[#3d3466] outline-none focus:border-[#4a3f7a] focus:ring-2 focus:ring-[#4a3f7a]/20"
              />
              <span className="text-xl font-black text-[#3d3466]">%</span>
            </div>
          </div>

          {/* LEVEL MODUL */}
          <div className="rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] p-5">
            <p className="mb-3 text-center text-sm font-bold text-[#3d3466]">
              Pilih Level Kesulitan Modul
            </p>
            <div className="flex justify-center gap-3">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl.key}
                  type="button"
                  onClick={() => setLevel(lvl.key)}
                  className={`rounded-full px-6 py-2 text-sm font-bold text-white shadow-sm transition-all ${lvl.color} ${level === lvl.key
                    ? "opacity-100 scale-105 ring-2 ring-offset-2 ring-[#4a3f7a]"
                    : "opacity-40 hover:opacity-80"
                    }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* NAMA MODUL */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-[#3d3466]">
            Nama Modul Pembelajaran
          </label>
          <input
            type="text"
            value={namaModul}
            onChange={(e) => setNamaModul(e.target.value)}
            placeholder="Contoh: Pengantar Ekonomi & Keuangan Syariah"
            className="h-12 w-full rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] px-4 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20"
          />
        </div>

        {/* TEKS MATERI — sekarang pakai gaya Tailwind yang sama
            dengan field Nama Modul & Link Video di atas/bawahnya,
            bukan class CSS eksternal (modul-form-field /
            modul-textarea-input) yang tidak ada definisinya di
            sini sehingga tampilannya polos/tidak konsisten. */}

        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-[#3d3466]">
            Teks Materi
          </label>
          <textarea
            value={form.teksMateri}
            onChange={(e) =>
              setForm({ ...form, teksMateri: e.target.value })
            }
            rows={5}
            placeholder="Tulis isi materi pembelajaran di sini..."
            className="w-full resize-none rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] px-4 py-3 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20"
          />
        </div>

        {/* LINK VIDEO */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-[#3d3466]">
            Link Video Pembelajaran (YouTube / Embed URL)
          </label>
          <input
            type="text"
            value={linkVideo}
            onChange={(e) => setLinkVideo(e.target.value)}
            placeholder="Tempelkan link video di sini..."
            className="h-12 w-full rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] px-4 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20"
          />
        </div>

        {/* UPLOAD FILE BOXES */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <UploadBox
            label="Dokumen Pembelajaran (Doc)"
            borderColor="border-sky-400"
            onFile={handleDocumentFile}
            fileName={docFile?.name ?? docLabel}
          />
          <UploadBox
            label="Thumbnail Modul (JPG/PNG)"
            borderColor="border-amber-400"
            onFile={setThumbnailFile}
            fileName={thumbnailFile?.name ?? thumbnailLabel}
          />
        </div>

        {/* MESSAGE */}
        {message && (
          <div
            className={`mb-6 rounded-2xl p-4 text-center text-sm font-bold ${message.includes("berhasil")
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
              }`}
          >
            {message}
          </div>
        )}

        {/* BUTTON ACTIONS */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#f0edf9]">
          <button
            type="button"
            onClick={() => {
              if (isEditMode) {
                router.push("/Dosen/modul");
                return;
              }
              resetForm();
            }}
            className="rounded-full border border-[#e4e2ee] bg-white px-7 py-3 text-sm font-bold text-[#4a3f7a] hover:bg-[#f8f7fd] transition"
          >
            {isEditMode ? "Kembali" : "Batal"}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || loadingDosen || !idDosen}
            className="rounded-full bg-amber-400 px-8 py-3 text-sm font-bold text-amber-950 shadow-md shadow-amber-900/20 hover:bg-amber-300 transition disabled:opacity-50"
          >
            {loading
              ? "Menyimpan..."
              : loadingDosen
                ? "Memuat..."
                : isEditMode
                  ? "Simpan Perubahan"
                  : "Selesai & Simpan"}
          </button>
        </div>
      </div>
    </DosenContainer>
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
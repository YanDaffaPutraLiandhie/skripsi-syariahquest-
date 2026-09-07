"use client";

import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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

function UploadBox({
  label,
  borderColor,
  onFile,
  fileName,
}: {
  label: string;
  borderColor: string;
  onFile: (file: File | null) => void;
  fileName: string | null;
}) {
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
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

function TambahModulContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = Number(searchParams.get("id") ?? 0);

  const [nilai, setNilai] = useState(80);
  const [level, setLevel] = useState<LevelKey>("medium");
  const [namaModul, setNamaModul] = useState("");
  const [linkVideo, setLinkVideo] = useState("");
  const [teksMateri, setTeksMateri] = useState("");

  const [docFile, setDocFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [docLabel, setDocLabel] = useState<string | null>(null);
  const [thumbnailLabel, setThumbnailLabel] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);

  // Data dosen yang sedang login
  const [idDosen, setIdDosen] = useState<number | null>(null);
  const [namaDosen, setNamaDosen] = useState("");
  const [loadingDosen, setLoadingDosen] = useState(true);
  async function handleDocumentFile(file: File | null) {
    setDocFile(file);
    if (!file) return;

    try {
      const text = await extractDocumentText(file);
      setTeksMateri(text);
      setMessage("Isi dokumen berhasil dibaca dan dimasukkan ke materi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Isi dokumen belum dapat dibaca.");
    }
  }

  const LEVEL_VALUE: Record<LevelKey, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
  };

  function getLevelKeyFromId(idLevel: number | null): LevelKey {
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

  // =============================================
  // MUAT DATA MODUL YANG AKAN DIEDIT (berdasarkan id_modul di query param)
  // =============================================
  async function loadExistingModule(id: number) {
    setIsEditMode(true);
    setEditingModuleId(id);
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("modul")
        .select(
          "id_modul, nama_modul, id_level, video_url, teks_materi, thumbnail_url, dokumen_pendukung, parameter_nilai"
        )
        .eq("id_modul", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setMessage("Modul dengan id tersebut tidak ditemukan.");
        setIsEditMode(false);
        setEditingModuleId(null);
        return;
      }

      setNamaModul(data.nama_modul ?? "");
      setLevel(getLevelKeyFromId(data.id_level));
      setLinkVideo(data.video_url ?? "");
      setTeksMateri(data.teks_materi ?? "");
      setNilai(data.parameter_nilai ?? 80);
      setThumbnailLabel(data.thumbnail_url ? "File thumbnail sudah ada" : null);
      setDocLabel(data.dokumen_pendukung ? "File dokumen sudah ada" : null);
    } catch (error) {
      console.error("Gagal memuat modul untuk edit:", error);
      setMessage("Gagal memuat data modul yang akan diedit.");
    } finally {
      setLoading(false);
    }
  }

  // =============================================
  // AMBIL ID DOSEN DAN NAMA DOSEN
  // =============================================
  useEffect(() => {
    async function fetchDosen() {
      setLoadingDosen(true);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error(
            "Gagal mendapatkan user yang sedang login:",
            authError
          );
          setMessage("Gagal mendapatkan data user yang sedang login.");
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from("user")
          .select("id_dosen")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (userError) {
          console.error(
            "Gagal mendapatkan id_dosen dari tabel user:",
            userError
          );
          setMessage("Gagal mengambil data dosen dari akun Anda.");
          return;
        }

        if (!userData?.id_dosen) {
          setMessage(
            "Akun yang sedang login belum terhubung dengan data dosen."
          );
          return;
        }

        const dosenId = userData.id_dosen;
        setIdDosen(dosenId);

        const { data: dosenData, error: dosenError } = await supabase
          .from("dosen")
          .select("nama_dosen")
          .eq("id_dosen", dosenId)
          .maybeSingle();

        if (dosenError) {
          console.error("Gagal mendapatkan data dosen:", dosenError);
          setMessage("Data dosen tidak ditemukan.");
          return;
        }

        if (!dosenData?.nama_dosen) {
          setMessage("Nama dosen belum tersedia di database.");
          return;
        }

        setNamaDosen(dosenData.nama_dosen);
      } catch (error) {
        console.error("Terjadi kesalahan saat mengambil data dosen:", error);
        setMessage("Terjadi kesalahan saat mengambil data dosen.");
      } finally {
        setLoadingDosen(false);
      }
    }

    fetchDosen();
  }, []);

  // =============================================
  // DETEKSI MODE EDIT DARI QUERY PARAM ?id=
  // =============================================
  useEffect(() => {
    if (editId) {
      loadExistingModule(editId);
    } else {
      setIsEditMode(false);
      setEditingModuleId(null);
    }
  }, [editId]);

  // =============================================
  // UPLOAD FILE KE SUPABASE STORAGE
  // =============================================
  async function uploadFile(
    file: File,
    folder: string
  ): Promise<string | null> {
    try {
      const filePath = `${folder}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return null;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

      return data?.publicUrl ?? null;
    } catch (error) {
      console.error("Unexpected upload error:", error);
      return null;
    }
  }

  // =============================================
  // SIMPAN MODUL (INSERT BARU ATAU UPDATE YANG SUDAH ADA)
  // =============================================
  async function handleSubmit() {
    if (!namaModul.trim()) {
      setMessage("Nama modul tidak boleh kosong.");
      return;
    }

    if (!idDosen) {
      setMessage(
        "Data dosen belum ditemukan. Silakan refresh halaman atau login kembali."
      );
      return;
    }

    // Guard tambahan: kalau sedang mode edit tapi id modul tidak valid
    if (isEditMode && !editingModuleId) {
      setMessage("ID modul yang akan diupdate tidak valid.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Gagal mendapatkan user login:", userError);
        setMessage("Anda belum login.");
        return;
      }

      let thumbnail_url = "";
      let dokumen_pendukung = "";

      // =============================================
      // THUMBNAIL: kalau ada file baru -> upload,
      // kalau tidak (mode edit) -> pertahankan yang lama
      // =============================================
      if (thumbnailFile) {
        const url = await uploadFile(thumbnailFile, "thumbnail");
        if (!url) {
          setMessage("Gagal mengunggah thumbnail.");
          return;
        }
        thumbnail_url = url;
      } else if (isEditMode && editingModuleId) {
        const { data: existing, error: existingError } = await supabase
          .from("modul")
          .select("thumbnail_url")
          .eq("id_modul", editingModuleId)
          .maybeSingle();

        if (!existingError) {
          thumbnail_url = existing?.thumbnail_url ?? "";
        }
      }

      // =============================================
      // DOKUMEN: sama seperti thumbnail
      // =============================================
      if (docFile) {
        const url = await uploadFile(docFile, "dokumen");
        if (!url) {
          setMessage("Gagal mengunggah dokumen.");
          return;
        }
        dokumen_pendukung = url;
      } else if (isEditMode && editingModuleId) {
        const { data: existing, error: existingError } = await supabase
          .from("modul")
          .select("dokumen_pendukung")
          .eq("id_modul", editingModuleId)
          .maybeSingle();

        if (!existingError) {
          dokumen_pendukung = existing?.dokumen_pendukung ?? "";
        }
      }

      const payload = {
        nama_modul: namaModul.trim(),
        id_level: LEVEL_VALUE[level],
        video_url: linkVideo.trim() || null,
        teks_materi: teksMateri.trim() || null,
        thumbnail_url: thumbnail_url || null,
        dokumen_pendukung: dokumen_pendukung || null,
        parameter_nilai: nilai,
      };

      // =====================================================
      // MODE EDIT -> UPDATE modul dengan id_modul yang dipilih
      // =====================================================
      if (isEditMode && editingModuleId) {
        const { data, error } = await supabase
          .from("modul")
          .update(payload)
          .eq("id_modul", editingModuleId)
          .select()
          .single();

        if (error) {
          console.error("Update modul error:", error);
          setMessage(`Gagal memperbarui modul: ${error.message}`);
          return;
        }

        console.log("Modul berhasil diupdate:", data);
        setMessage("Modul berhasil diperbarui.");

        // BARU: catat aktivitas "Edit Modul" -- taruh SETELAH update
        // berhasil, jadi kalau update gagal (return duluan di atas),
        // tidak ada log yang tercatat.
        await logActivity({
          fitur: "Modul Pembelajaran",
          jenis_aktivitas: "Edit Modul",
          keterangan: `Memperbarui modul "${namaModul.trim()}"`,
        });

        setTimeout(() => {
          router.push("/Dosen/modul");
        }, 800);
        return;
      }

      // =====================================================
      // MODE TAMBAH BARU -> INSERT modul baru
      // =====================================================
      const { data, error } = await supabase
        .from("modul")
        .insert({
          ...payload,
          dibuat_oleh: idDosen,
          status: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Insert modul error:", error);
        setMessage(`Gagal menyimpan modul: ${error.message}`);
        return;
      }

      console.log("Modul berhasil dibuat:", data);
      setMessage(`Modul berhasil disimpan oleh ${namaDosen}!`);

      // BARU: catat aktivitas "Tambah Modul" -- taruh SETELAH insert
      // berhasil (kalau insert gagal, sudah return duluan di atas).
      await logActivity({
        fitur: "Modul Pembelajaran",
        jenis_aktivitas: "Tambah Modul",
        keterangan: `Menambahkan modul "${namaModul.trim()}"`,
      });

      setTimeout(() => {
        setNamaModul("");
        setLinkVideo("");
        setDocFile(null);
        setThumbnailFile(null);
        setDocLabel(null);
        setThumbnailLabel(null);
        setNilai(80);
        setLevel("medium");
        setMessage("");
      }, 1500);
    } catch (error) {
      console.error("Terjadi kesalahan saat menyimpan modul:", error);
      setMessage("Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DosenContainer
      categoryTag="MODUL PEMBELAJARAN"
      title="Edit Modul Pembelajaran"
      subtitle="Perbarui materi, video pembelajaran, dan dokumen pendukung modul."
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
            <>Mode Edit • ID Modul: {editingModuleId}</>
          ) : namaDosen ? (
            <>Dibuat oleh: {namaDosen}</>
          ) : (
            "Data dosen tidak ditemukan."
          )}
        </div>

        {/* PARAMETER NILAI DAN LEVEL */}
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
                  const value = Number(e.target.value);
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
              Level Modul
            </p>
            <div className="flex justify-center gap-3">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl.key}
                  type="button"
                  onClick={() => setLevel(lvl.key)}
                  className={`rounded-full px-6 py-2 text-sm font-bold text-white shadow-sm transition-all ${lvl.color} ${
                    level === lvl.key
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
            placeholder="Tulis nama modul"
            className="h-12 w-full rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] px-4 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20"
          />
        </div>

        {/* LINK VIDEO */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-[#3d3466]">
            Link Video Pembelajaran
          </label>
          <input
            type="text"
            value={linkVideo}
            onChange={(e) => setLinkVideo(e.target.value)}
            placeholder="Tempel link video"
            className="h-12 w-full rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] px-4 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20"
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-[#3d3466]">Isi Materi</label>
          <textarea
            value={teksMateri}
            onChange={(e) => setTeksMateri(e.target.value)}
            rows={8}
            placeholder="Isi materi dari dokumen akan muncul di sini dan dapat diedit."
            className="w-full rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] p-4 text-sm text-[#2b2540] outline-none focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20"
          />
        </div>

        {/* UPLOAD FILE */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <UploadBox
            label="Dokumen Pembelajaran (Doc/PDF)"
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

        {message && (
          <div
            className={`mb-6 rounded-2xl p-4 text-center text-sm font-bold ${
              message.includes("berhasil")
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* TOMBOL */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#f0edf9]">
          <button
            type="button"
            onClick={() => router.push("/Dosen/modul")}
            className="rounded-full border border-[#e4e2ee] bg-white px-7 py-3 text-sm font-bold text-[#4a3f7a] hover:bg-[#f8f7fd] transition"
          >
            Kembali
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || loadingDosen || !idDosen}
            className="rounded-full bg-amber-400 px-8 py-3 text-sm font-bold text-amber-950 shadow-md shadow-amber-900/20 hover:bg-amber-300 transition disabled:opacity-50"
          >
            {loading
              ? "Memperbarui..."
              : loadingDosen
              ? "Memuat..."
              : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </DosenContainer>
  );
}

// =============================================
// WAJIB dibungkus Suspense karena pakai useSearchParams()
// (syarat Next.js App Router)
// =============================================
export default function TambahModul() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f8f7fd]">
          <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
            <p className="text-sm font-semibold text-[#4a3f7a]">
              Memuat data modul...
            </p>
          </div>
        </div>
      }
    >
      <TambahModulContent />
    </Suspense>
  );
}

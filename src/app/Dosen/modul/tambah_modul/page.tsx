"use client";

import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

export default function TambahModul() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = Number(searchParams.get("id") ?? 0);

  const [nilai, setNilai] = useState(80);
  const [level, setLevel] = useState<LevelKey>("medium");
  const [namaModul, setNamaModul] = useState("");
  const [linkVideo, setLinkVideo] = useState("");

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

  async function loadExistingModule() {
    if (!editId) {
      setIsEditMode(false);
      setEditingModuleId(null);
      return;
    }

    setIsEditMode(true);
    setEditingModuleId(editId);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("modul")
        .select(
          "id_modul, nama_modul, id_level, video_url, thumbnail_url, dokumen_pendukung, parameter_nilai"
        )
        .eq("id_modul", editId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setMessage("Modul yang dipilih tidak ditemukan.");
        return;
      }

      setNamaModul(data.nama_modul ?? "");
      setLevel(getLevelKeyFromId(data.id_level));
      setLinkVideo(data.video_url ?? "");
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
        // 1. Ambil user yang sedang login
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

        console.log("Auth User ID:", user.id);

        // =============================================
        // 2. AMBIL id_dosen DARI TABEL user
        // =============================================
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
        console.log("ID Dosen:", dosenId);

        setIdDosen(dosenId);

        // =============================================
        // 3. AMBIL nama_dosen DARI TABEL dosen
        // =============================================
        const { data: dosenData, error: dosenError } = await supabase
          .from("dosen")
          .select("nama_dosen")
          .eq("id_dosen", dosenId)
          .maybeSingle();

        if (dosenError) {
          console.error(
            "Gagal mendapatkan data dosen:",
            dosenError
          );

          setMessage("Data dosen tidak ditemukan.");
          return;
        }

        if (!dosenData?.nama_dosen) {
          setMessage("Nama dosen belum tersedia di database.");
          return;
        }

        console.log("Nama Dosen:", dosenData.nama_dosen);
        setNamaDosen(dosenData.nama_dosen);
      } catch (error) {
        console.error(
          "Terjadi kesalahan saat mengambil data dosen:",
          error
        );

        setMessage("Terjadi kesalahan saat mengambil data dosen.");
      } finally {
        setLoadingDosen(false);
      }
    }

    fetchDosen();
  }, []);

  useEffect(() => {
    if (editId) {
      loadExistingModule();
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

      const { data } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      return data?.publicUrl ?? null;
    } catch (error) {
      console.error("Unexpected upload error:", error);
      return null;
    }
  }

  // =============================================
  // SIMPAN MODUL
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
        thumbnail_url: thumbnail_url || null,
        dokumen_pendukung: dokumen_pendukung || null,
        parameter_nilai: nilai,
      };

      if (isEditMode && editingModuleId) {
        const { error } = await supabase
          .from("modul")
          .update(payload)
          .eq("id_modul", editingModuleId);

        if (error) {
          console.error("Update modul error:", error);
          setMessage(`Gagal memperbarui modul: ${error.message}`);
          return;
        }

        setMessage("Modul berhasil diperbarui.");

        setTimeout(() => {
          router.push("/Dosen/modul");
        }, 800);
        return;
      }

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
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <Sidebar activeLabel="Modul Pembelajaran" />

      <main className="flex-1 p-8">
        <div className="rounded-[24px] bg-[#4a3f7a] p-8">

          {/* =============================================
              TAMPILKAN NAMA DOSEN
          ============================================= */}
          <div className="mb-4 text-sm font-semibold text-white">
            {loadingDosen ? (
              "Memuat data dosen..."
            ) : isEditMode ? (
              <>Edit modul: {namaDosen || "Dosen"}</>
            ) : namaDosen ? (
              <>Dibuat oleh: {namaDosen}</>
            ) : (
              "Data dosen tidak ditemukan."
            )}
          </div>

          {/* =============================================
              PARAMETER NILAI DAN LEVEL
          ============================================= */}
          <div className="mb-8 flex items-start gap-6">

            {/* Parameter Nilai */}
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
                    const value = Number(e.target.value);

                    if (value >= 0 && value <= 100) {
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

            {/* Level Modul */}
            <div className="flex-1 rounded-2xl bg-white px-8 py-4">
              <p className="mb-3 text-center text-sm font-bold text-[#2b2540]">
                Level Modul
              </p>

              <div className="flex justify-center gap-3">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl.key}
                    type="button"
                    onClick={() => setLevel(lvl.key)}
                    className={`rounded-full px-6 py-2 text-sm font-bold text-white transition-opacity ${
                      lvl.color
                    } ${
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

          {/* =============================================
              NAMA MODUL
          ============================================= */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-white">
              Nama Modul
            </label>

            <input
              type="text"
              value={namaModul}
              onChange={(e) =>
                setNamaModul(e.target.value)
              }
              placeholder="Tulis nama modul"
              className="h-11 w-full rounded-full border-2 border-emerald-400 bg-white px-4 text-sm text-[#2b2540] outline-none placeholder:text-[#c9c6d6]"
            />
          </div>

          {/* =============================================
              LINK VIDEO
          ============================================= */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-white">
              Link Video Pembelajaran
            </label>

            <input
              type="text"
              value={linkVideo}
              onChange={(e) =>
                setLinkVideo(e.target.value)
              }
              placeholder="Tempel link video"
              className="h-11 w-full rounded-full border-2 border-orange-400 bg-white px-4 text-sm text-[#2b2540] outline-none placeholder:text-[#c9c6d6]"
            />
          </div>

          {/* =============================================
              UPLOAD FILE
          ============================================= */}
          <div className="mb-8 grid grid-cols-2 gap-6">

            <UploadBox
              label="Dokumen Pembelajaran (Doc/Pdf)"
              borderColor="border-sky-400"
              onFile={setDocFile}
              fileName={docFile?.name ?? docLabel}
            />

            <UploadBox
              label="Thumbnail Modul Pembelajaran (Jpg/Png)"
              borderColor="border-amber-400"
              onFile={setThumbnailFile}
              fileName={thumbnailFile?.name ?? thumbnailLabel}
            />
          </div>

          {/* =============================================
              PESAN
          ============================================= */}
          {message && (
            <p className="mb-4 text-center text-sm font-semibold text-white">
              {message}
            </p>
          )}

          {/* =============================================
              TOMBOL
          ============================================= */}
          <div className="flex justify-end gap-3">

            <button
              type="button"
              onClick={() => {
                if (isEditMode) {
                  router.push("/Dosen/modul");
                  return;
                }

                setNamaModul("");
                setLinkVideo("");
                setDocFile(null);
                setThumbnailFile(null);
                setDocLabel(null);
                setThumbnailLabel(null);
                setNilai(80);
                setLevel("medium");
                setMessage("");
              }}
              className="rounded-full bg-[#3d3466] px-6 py-2 text-sm font-semibold text-white hover:bg-[#342c58]"
            >
              {isEditMode ? "Kembali" : "Batal"}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || loadingDosen || !idDosen}
              className="rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-300 disabled:opacity-50"
            >
              {loading
                ? "Menyimpan..."
                : loadingDosen
                ? "Memuat..."
                : isEditMode
                ? "Selesai"
                : "Selesai"}
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}
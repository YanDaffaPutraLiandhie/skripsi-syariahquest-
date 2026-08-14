"use client";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

import { useState } from "react";

const LEVELS = [
  { key: "easy", label: "Easy", color: "bg-emerald-500" },
  { key: "medium", label: "Medium", color: "bg-amber-400" },
  { key: "hard", label: "Hard", color: "bg-red-600" },
] as const;

type LevelKey = (typeof LEVELS)[number]["key"];

const BUCKET = "modul";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "home", active: false },
  { label: "Modul Pembelajaran", icon: "book", active: true },
  { label: "Bank Soal", icon: "help", active: false },
  { label: "Leaderboard", icon: "chart", active: false },
  { label: "Profil", icon: "user", active: false },
];

function NavIcon({ name }: { name: string }) {
  const common = "h-[18px] w-[18px] shrink-0";
  switch (name) {
    case "home":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8z" />
        </svg>
      );
    case "book":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13zM20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13z" />
        </svg>
      );
    case "chart":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M5 20V10M12 20V4M19 20v-7" />
        </svg>
      );
    case "user":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
      );
    default:
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.2a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .8-1 1.5" />
          <circle cx="12" cy="16.5" r=".6" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

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
  const [nilai, setNilai] = useState(80);
  const [level, setLevel] = useState<LevelKey>("medium");
  const [namaModul, setNamaModul] = useState("");
  const [linkVideo, setLinkVideo] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const LEVEL_VALUE: Record<LevelKey, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
  };

  async function uploadFile(
    file: File,
    folder: string,
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
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async function handleSubmit() {
    if (!namaModul.trim()) {
      setMessage("Nama modul tidak boleh kosong.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      let thumbnail_url = linkVideo.trim();
      let dokumen_pendukung = "";

      if (thumbnailFile) {
        const url = await uploadFile(thumbnailFile, "thumbnail");
        if (url) thumbnail_url = url;
      }

      if (docFile) {
        const url = await uploadFile(docFile, "dokumen");
        if (url) dokumen_pendukung = url;
      }

      const { error } = await supabase.from("modul").insert({
        nama_modul: namaModul.trim(),
        id_level: LEVEL_VALUE[level],
        video_url: thumbnail_url,
        thumbnail_url,
        dokumen_pendukung,
      });

      if (error) {
        console.error("Insert error:", error);
        setMessage(`Gagal menyimpan: ${error.message}`);
        setLoading(false);
        return;
      }

      setMessage("Modul berhasil disimpan!");
      setTimeout(() => {
        setNamaModul("");
        setLinkVideo("");
        setDocFile(null);
        setThumbnailFile(null);
        setNilai(80);
        setLevel("medium");
      }, 1500);
    } catch (err) {
      console.error(err);
      setMessage("Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <Sidebar activeLabel="Modul Pembelajaran" />

      {/* Main */}
      <main className="flex-1 p-8">
        {/* Topbar */}
      

        {/* Purple panel */}
        <div className="rounded-[24px] bg-[#4a3f7a] p-8">
          {/* Top row: Set Parameter Nilai + Level Modul */}
          <div className="mb-8 flex items-start gap-6">
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
                <span className="text-lg font-bold text-[#2b2540]">%</span>
              </div>
            </div>
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

          {/* Nama Modul */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-white">
              Nama Modul
            </label>
<input
              type="text"
              value={namaModul}
              onChange={(e) => setNamaModul(e.target.value)}
              placeholder="Tulis nama modul"
              className="h-11 w-full rounded-full border-2 border-emerald-400 bg-white px-4 text-sm text-[#2b2540] outline-none placeholder:text-[#c9c6d6]"
            />
          </div>

          {/* Link Vidio Pembelajaran */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-white">
              Link Vidio Pembelajaran
            </label>
            <input
              type="text"
              value={linkVideo}
              onChange={(e) => setLinkVideo(e.target.value)}
              placeholder="Tempel link video"
              className="h-11 w-full rounded-full border-2 border-orange-400 bg-white px-4 text-sm text-[#2b2540] outline-none placeholder:text-[#c9c6d6]"
            />
          </div>

          {/* Upload boxes */}
          <div className="mb-8 grid grid-cols-2 gap-6">
            <UploadBox
              label="Dokumen Pembelajaran (Doc/Pdf)"
              borderColor="border-sky-400"
              onFile={setDocFile}
              fileName={docFile?.name ?? null}
            />
            <UploadBox
              label="thumbnail Modul Pembelajaran (Jpg/Png)"
              borderColor="border-amber-400"
              onFile={setThumbnailFile}
              fileName={thumbnailFile?.name ?? null}
            />
          </div>

          {message && (
            <p className="mb-4 text-center text-sm font-semibold text-white">
              {message}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setNamaModul("");
                setLinkVideo("");
                setDocFile(null);
                setThumbnailFile(null);
                setNilai(80);
                setLevel("medium");
                setMessage("");
              }}
              className="rounded-full bg-[#3d3466] px-6 py-2 text-sm font-semibold text-white hover:bg-[#342c58]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-300 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Selesai"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

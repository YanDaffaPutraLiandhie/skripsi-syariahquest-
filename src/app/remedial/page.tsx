"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Brain,
  Sparkles,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  Database,
  Bot,
  RefreshCw,
  Plus,
  Trash2,
  BookOpen
} from "lucide-react";

type RekomendasiItem = {
  soal: string;
  sumber: "database" | "ai_gemini" | "gemini_native_ai";
  kemiripan: number;
  judul: string;
  topik: string;
};

type RemedialResponse = {
  judul_halaman: string;
  isi_pembelajaran: string;
  topik_terkait: string[];
  detail_rekomendasi?: RekomendasiItem[];
  engine?: string;
  error?: string;
};

const PRESET_SOAL = [
  "Apa konsekuensi pinjaman uang yang berbunga dalam hukum Islam?",
  "Bagaimana cara membagi untung ruginya kerja sama mudharabah?",
  "Bagaimana pembagian harta warisan untuk anak laki-laki menurut hukum waris Islam?",
  "Apa ketentuan nisab dan syarat pengeluaran zakat mal?"
];

export default function HalamanRemedial() {
  const [daftarSoal, setDaftarSoal] = useState<string[]>([
    "Bagaimana konsekuensi pinjaman uang yang berbunga dalam hukum Islam?",
    "Bagaimana pembagian harta warisan untuk anak laki-laki menurut hukum waris Islam?"
  ]);
  const [inputSoalBaru, setInputSoalBaru] = useState("");
  const [threshold, setThreshold] = useState<number>(70);
  const [isLoading, setIsLoading] = useState(false);
  const [hasilRemedi, setHasilRemedi] = useState<RemedialResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTambahSoal = () => {
    if (!inputSoalBaru.trim()) return;
    setDaftarSoal((prev) => [...prev, inputSoalBaru.trim()]);
    setInputSoalBaru("");
  };

  const handleHapusSoal = (index: number) => {
    setDaftarSoal((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePilihPreset = (soal: string) => {
    if (!daftarSoal.includes(soal)) {
      setDaftarSoal((prev) => [...prev, soal]);
    }
  };

  const handleGenerate = async () => {
    if (daftarSoal.length === 0) {
      setErrorMsg("Mohon masukkan minimal 1 soal yang salah dijawab mahasiswa.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setHasilRemedi(null);

    try {
      const response = await fetch("/api/remedial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soal: daftarSoal,
          threshold: threshold,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menghasilkan modul remedial");
      }

      setHasilRemedi(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 sm:text-xl flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Remedial
              </h1>
              <p className="text-sm text-slate-500">
                Buat materi remedial berdasarkan soal yang salah dijawab
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs text-purple-700 border border-purple-200">
              <Sparkles className="h-3.5 w-3.5" />
              Rekomendasi berbasis AI
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Input Soal Salah & Pengaturan */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Search className="h-5 w-5 text-purple-600" />
                Daftar soal yang salah dijawab
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tambahkan soal atau pilih dari contoh di bawah ini.
              </p>

              {/* Input Tambah Soal */}
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={inputSoalBaru}
                  onChange={(e) => setInputSoalBaru(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTambahSoal()}
                  placeholder="Tambahkan pertanyaan..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button
                  onClick={handleTambahSoal}
                  className="flex items-center justify-center rounded-lg bg-purple-600 px-3 py-2 text-white hover:bg-purple-700 transition"
                  title="Tambah soal"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Preset Soal Cepat */}
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-500 mb-1.5">
                  Contoh:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_SOAL.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePilihPreset(preset)}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition text-left"
                    >
                      + {preset.slice(0, 40)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* List Soal Aktif */}
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-1">
                {daftarSoal.map((soal, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-sm text-slate-700"
                  >
                    <div className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 font-medium text-purple-700 text-xs">
                        {index + 1}
                      </span>
                      <span className="leading-relaxed">{soal}</span>
                    </div>
                    <button
                      onClick={() => handleHapusSoal(index)}
                      className="text-slate-400 hover:text-red-500 transition p-0.5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Threshold Slider */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between text-sm text-slate-700 mb-1">
                  <span>Tingkat kemiripan minimal</span>
                  <span className="rounded bg-purple-100 px-2 py-0.5 font-medium text-purple-700">
                    {threshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="90"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Lebih tinggi = lebih ketat mencocokkan ke materi yang ada.
                </p>
              </div>

              {/* Tombol Eksekusi */}
              <button
                onClick={handleGenerate}
                disabled={isLoading || daftarSoal.length === 0}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#3A2E65] hover:bg-[#4E3F88] py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Membuat materi remedial...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Buat materi remedial
                  </>
                )}
              </button>

              {errorMsg && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Hasil Tampilan Modul Remedial */}
          <div className="lg:col-span-7 space-y-6">
            {!hasilRemedi && !isLoading && (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-10 text-center text-slate-400">
                <BookOpen className="h-10 w-10 text-slate-300 mb-3" />
                <h3 className="text-base font-medium text-slate-700">Belum ada materi</h3>
                <p className="max-w-md text-sm text-slate-500 mt-1">
                  Tambahkan soal yang salah dijawab, lalu buat materi remedial.
                </p>
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-10 text-center">
                <div className="relative flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
                  <Brain className="absolute h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-sm font-medium text-slate-700 mt-4">
                  Mencari materi yang relevan...
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  Mencocokkan soal dengan materi di database.
                </p>
              </div>
            )}

            {hasilRemedi && (
              <div className="space-y-6">
                {/* Engine Badge Info */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-200 bg-purple-50/70 px-4 py-2.5 text-sm text-purple-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Materi remedial siap</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasilRemedi.engine === "python_vecs_rag" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-purple-200 px-2 py-0.5 text-xs text-purple-800">
                        <Database className="h-3 w-3" /> Database
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                        <Bot className="h-3 w-3" /> AI
                      </span>
                    )}
                  </div>
                </div>

                {/* Tampilan Isi Materi Remedial (Utama) */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="border-b border-slate-100 pb-4 mb-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs text-purple-700 border border-purple-200 mb-2">
                      <BookOpen className="h-3 w-3" /> Materi remedial
                    </span>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {hasilRemedi.judul_halaman}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {hasilRemedi.topik_terkait?.map((topik, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                        >
                          {topik}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700 space-y-4">
                    {hasilRemedi.isi_pembelajaran.split("\n\n---\n\n").map((section, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 space-y-2 whitespace-pre-line"
                      >
                        {section}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ringkasan Analisis Soal (Sekunder) */}
                {hasilRemedi.detail_rekomendasi && hasilRemedi.detail_rekomendasi.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-700 mb-2">
                      Soal terkait
                    </h3>
                    <div className="space-y-1.5">
                      {hasilRemedi.detail_rekomendasi.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"
                        >
                          <span className="truncate flex-1">
                            {idx + 1}. {item.soal}
                          </span>
                          <span className="shrink-0 text-xs text-purple-700">
                            {item.topik}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

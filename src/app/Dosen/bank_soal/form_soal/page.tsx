"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Papa from "papaparse";
import { Plus, Trash2, Download, Sparkles, CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";


import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";
import { parseQuestionFile } from "@/lib/parseQuestionFile";
import {
  generateLearningObjects,
  generateSoalOtomatis,
  type LearningObject,
} from "@/lib/generateContent";
import DosenContainer from "@/components/layout/DosenContainer";

const ANSWER_KEYS = ["A", "B", "C", "D"] as const;

type AnswerKey = (typeof ANSWER_KEYS)[number];

const OPTION_FIELDS: { key: AnswerKey; label: string }[] = [
  { key: "A", label: "Jawaban Pilihan A" },
  { key: "B", label: "Jawaban Pilihan B" },
  { key: "C", label: "Jawaban Pilihan C" },
  { key: "D", label: "Jawaban Pilihan D" },
];

interface SoalEntry {
  id: string;
  soal: string;
  jawabanA: string;
  jawabanB: string;
  jawabanC: string;
  jawabanD: string;
  kunciJawaban: AnswerKey | null;
  idSubTopik: number | null;
  difficultyRating: number;
}

function makeEmptyEntry(): SoalEntry {
  return {
    id: crypto.randomUUID(),
    soal: "",
    jawabanA: "",
    jawabanB: "",
    jawabanC: "",
    jawabanD: "",
    kunciJawaban: null,
    idSubTopik: null,
    difficultyRating: 1100,
  };
}

/**
 * Cocokkan soal ke Learning Object berdasarkan jumlah kata kunci yang muncul dalam teks soal.
 * Hanya mengembalikan id_sub_topik jika ada kecocokan yang cukup kuat (>= 1 kata kunci).
 */
function matchLOToQuestion(
  question: string,
  learningObjects: { id_sub_topik: number; lo_code: string | null; judul: string; keywords?: string | null }[],
): number | null {
  if (!question || learningObjects.length === 0) return null;
  const q = question.toLowerCase();
  let bestMatch: { id: number; score: number } | null = null;
  for (const lo of learningObjects) {
    const keywords = ((lo.keywords || lo.judul) || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    let score = 0;
    for (const kw of keywords) {
      if (kw.length > 2 && q.includes(kw.toLowerCase())) score += 1;
    }
    // Bonus jika judul LO muncul utuh
    if (lo.judul && q.includes(lo.judul.toLowerCase())) score += 2;
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: lo.id_sub_topik, score };
    }
  }
  return bestMatch?.id ?? null;
}

// =============================================
// TEXTAREA YANG OTOMATIS MEMANJANG SESUAI ISI
// =============================================
function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`resize-none overflow-hidden ${className ?? ""}`}
    />
  );
}

// =============================================
// KOMPONEN UTAMA (dipisah dari default export)
// =============================================
function BankSoalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /*
   * =========================================================
   * AMBIL ID MODUL DARI URL
   * Contoh:
   * /Dosen/bank_soal/form_soal?id_modul=12
   * =========================================================
   */
  const idModulParam = searchParams.get("id_modul");

  const [idModul, setIdModul] = useState<number | null>(null);
  const [namaModul, setNamaModul] = useState("");
  const [teksMateri, setTeksMateri] = useState("");
  const [learningObjects, setLearningObjects] = useState<
    { id_sub_topik: number; lo_code: string | null; judul: string; keywords?: string | null }[]
  >([]);
  const [learningObjectError, setLearningObjectError] = useState("");

  const [loadingModul, setLoadingModul] = useState(true);

  const [soalEntries, setSoalEntries] = useState<SoalEntry[]>([
    makeEmptyEntry(),
  ]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [generateMessageOpen, setGenerateMessageOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const [generatingLO, setGeneratingLO] = useState(false);
  const [generatingSoal, setGeneratingSoal] = useState(false);
  const [generateMessage, setGenerateMessage] = useState("");

  const importInputRef = useRef<HTMLInputElement>(null);

  /*
   * =========================================================
   * CEK ID MODUL
   * =========================================================
   */
  useEffect(() => {
    async function loadModul() {
      setLoadingModul(true);
      setFormError("");

      if (!idModulParam) {
        setFormError(
          "ID modul tidak ditemukan. Silakan kembali dan pilih modul terlebih dahulu.",
        );
        setLoadingModul(false);
        return;
      }

      const parsedId = Number(idModulParam);

      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        setFormError("ID modul tidak valid.");
        setLoadingModul(false);
        return;
      }

      const { data, error } = await supabase
        .from("modul")
        .select("id_modul, nama_modul, teks_materi")
        .eq("id_modul", parsedId)
        .maybeSingle();

      if (error) {
        console.error("Gagal mengambil modul:", error);
        setFormError(`Gagal mengambil data modul: ${error.message}`);
        setLoadingModul(false);
        return;
      }

      if (!data) {
        setFormError(
          `Modul dengan ID ${parsedId} tidak ditemukan di database.`,
        );
        setLoadingModul(false);
        return;
      }

      setIdModul(Number(data.id_modul));
      setNamaModul(data.nama_modul ?? "");
      setTeksMateri(data.teks_materi ?? "");

      console.log("MODUL DIPILIH:", {
        id_modul: data.id_modul,
        nama_modul: data.nama_modul,
      });

      setLoadingModul(false);
    }

    loadModul();
  }, [idModulParam]);

  useEffect(() => {
    if (!idModul) return;

    let active = true;
    async function loadLearningObjects() {
      setLearningObjects([]);
      setLearningObjectError("");
      const { data, error } = await supabase
        .from("sub_topik")
        .select("id_sub_topik, lo_code, judul, keywords")
        .eq("id_modul", idModul)
        .order("urutan", { ascending: true });

      if (!active) return;
      if (error) {
        console.error("Gagal memuat Learning Object modul:", error);
        setLearningObjectError(
          "Learning Object gagal dimuat. Soal tetap bisa disimpan, tetapi belum dapat dipetakan untuk personalisasi.",
        );
        return;
      }

      setLearningObjects((data ?? []).map((lo) => ({
        id_sub_topik: lo.id_sub_topik,
        lo_code: lo.lo_code,
        judul: lo.judul,
        keywords: lo.keywords ?? null,
      })));

      // AUTO-GENERATE LO dari teks materi jika belum ada LO dan materi tersedia
      if ((data ?? []).length === 0 && teksMateri.trim().length >= 50 && !generatingLO) {
        await handleGenerateLO();
      }
    }

    void loadLearningObjects();
    return () => {
      active = false;
    };
  }, [idModul, teksMateri, generatingLO]);

  function updateEntry(id: string, patch: Partial<SoalEntry>) {
    setSoalEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    );
  }

  function addEntry() {
    setSoalEntries((prev) => [...prev, makeEmptyEntry()]);
  }

  function removeEntry(id: string) {
    setSoalEntries((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((entry) => entry.id !== id);
    });
  }

  function handleDownloadTemplate() {
    const headers = [
      "soal",
      "jawaban_a",
      "jawaban_b",
      "jawaban_c",
      "jawaban_d",
      "kunci_jawaban",
      "subtopik",
      "difficulty_rating",
    ];

    const exampleRows = [
      [
        "Apa hukum riba dalam Islam?",
        "Haram",
        "Halal",
        "Makruh",
        "Mubah",
        "A",
        "",
        "950",
      ],
      [
        "Siapa pendiri mazhab Syafi'i?",
        "Imam Malik",
        "Imam Syafi'i",
        "Imam Hanafi",
        "Imam Hambali",
        "B",
        "",
        "1100",
      ],
    ];

    const csv = Papa.unparse({
      fields: headers,
      data: exampleRows,
    });

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "template_bank_soal.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    importInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setImporting(true);
    setFormError("");
    setSuccessMessage("");

    try {
      const rows = await parseQuestionFile(file);

      if (rows.length === 0) {
        throw new Error("File CSV/XLSX kosong atau formatnya tidak sesuai.");
      }

          const parsed: SoalEntry[] = rows.map((row, index) => {
            const rawDifficulty = (row.difficulty_rating || "").trim();
            const difficultyRating = rawDifficulty === "" ? 1100 : Number(rawDifficulty) || 1100;

            const topicValue = (row.subtopik || row.lo_code || "").trim().toLowerCase();
            const learningObject = topicValue
              ? learningObjects.find(
                  (item) =>
                    item.judul.toLowerCase() === topicValue ||
                    item.lo_code?.toLowerCase() === topicValue,
                )
              : undefined;
            if (topicValue && !learningObject) {
              throw new Error(
                `Learning Object "${row.subtopik || row.lo_code}" pada soal ke-${index + 1} tidak ditemukan di modul ini.`,
              );
            }

            const normalizedKunci = (
              row.kunci_jawaban || row.kunci || ""
            )
              .trim()
              .toUpperCase();

            const validKunci: AnswerKey | null = ANSWER_KEYS.includes(
              normalizedKunci as AnswerKey,
            )
              ? (normalizedKunci as AnswerKey)
              : null;

            return {
              id: crypto.randomUUID(),
              soal: (row.soal || "").trim(),
              jawabanA: (row.jawaban_a || "").trim(),
              jawabanB: (row.jawaban_b || "").trim(),
              jawabanC: (row.jawaban_c || "").trim(),
              jawabanD: (row.jawaban_d || "").trim(),
              kunciJawaban: validKunci,
              idSubTopik: learningObject?.id_sub_topik ?? null,
              difficultyRating: difficultyRating,
            };
          });

          const validRows = parsed.filter((entry) => entry.soal);

      if (validRows.length === 0) {
        throw new Error(
          'Tidak ada baris valid ditemukan. Pastikan kolom "soal" terisi.',
        );
      }

          setSoalEntries(validRows);

      setSuccessMessage(`${validRows.length} soal berhasil diimpor.`);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Gagal memproses file CSV/XLSX.",
      );
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  /**
   * Generate Learning Objects (LO) otomatis dari teks materi modul via AI.
   * Setelah sukses, daftar LO di-refresh secara otomatis.
   */
  async function handleGenerateLO(): Promise<LearningObject[]> {
    if (!idModul) return [];
    setGeneratingLO(true);
    setGenerateMessage("");
    setFormError("");
    try {
      const los = await generateLearningObjects(idModul);
      setLearningObjects(
        los.map((lo) => ({
          id_sub_topik: lo.id_sub_topik,
          lo_code: lo.lo_code,
          judul: lo.judul,
          keywords: lo.keywords ?? null,
        })),
      );
      return los;
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Gagal generate Learning Objects.",
      );
      return [];
    } finally {
      setGeneratingLO(false);
    }
  }

  /**
   * Generate soal otomatis per LO via AI dan simpan ke database.
   * Setelah sukses, form soal manual diisi dengan hasil generate.
   */
  async function handleGenerateSoal() {
    if (!idModul) return;
    if (learningObjects.length === 0) {
      setFormError(
        "Belum ada Learning Object. Jalankan Generate Learning Objects terlebih dahulu.",
      );
      return;
    }
    setGeneratingSoal(true);
    setGenerateMessage("");
    setFormError("");
    try {
      const soalList = await generateSoalOtomatis(idModul, 5);
      if (soalList.length === 0) {
        setGenerateMessage("Tidak ada soal yanghasil.");
        return;
      }
      setSoalEntries(
        soalList.map((s) => {
          const jawabans = s.jawaban;
          const findCorrectKey = (): AnswerKey | null => {
            for (let i = 0; i < jawabans.length && i < 4; i++) {
              if (jawabans[i].jawaban_benar) return ANSWER_KEYS[i];
            }
            return null;
          };
          return {
            id: crypto.randomUUID(),
            soal: s.soal,
            jawabanA: jawabans[0]?.jawaban ?? "",
            jawabanB: jawabans[1]?.jawaban ?? "",
            jawabanC: jawabans[2]?.jawaban ?? "",
            jawabanD: jawabans[3]?.jawaban ?? "",
            kunciJawaban: findCorrectKey(),
            idSubTopik: s.id_sub_topik,
            difficultyRating: (s.difficulty_rating as number) ?? 1100,
          };
        }),
      );
      setGenerateMessage(
        `${soalList.length} soal otomatis telah dihasilkan dan disimpan ke bank soal. Anda dapat mengeditnya sebelum menyimpan.`,
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Gagal generate soal otomatis.",
      );
    } finally {
      setGeneratingSoal(false);
    }
  }

  /**
   * Tombol SATU: Generate Otomatis (LO + Soal).
   * 1. Generate LO dari teks materi
   * 2. Generate soal otomatis per LO
   */
  async function handleGenerateAll() {
    if (!idModul) return;
    setGeneratingLO(true);
    setGeneratingSoal(true);
    setGenerateMessage("");
    setFormError("");

    // Langkah 1: Generate LO
    const los = await handleGenerateLO();
    if (los.length === 0) {
      setGeneratingSoal(false);
      return;
    }

    // Langkah 2: Generate soal otomatis
    await handleGenerateSoal();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setFormError("");
    setSuccessMessage("");

    try {
      if (!idModul) {
        throw new Error(
          "ID modul tidak ditemukan. Silakan kembali dan pilih modul.",
        );
      }

      const { data: modulCheck, error: modulError } = await supabase
        .from("modul")
        .select("id_modul, nama_modul")
        .eq("id_modul", idModul)
        .maybeSingle();

      if (modulError) {
        throw new Error(`Gagal mengecek modul: ${modulError.message}`);
      }

      if (!modulCheck) {
        throw new Error(`Modul dengan ID ${idModul} tidak ditemukan.`);
      }

      console.log("================================");
      console.log("MULAI SIMPAN SOAL");
      console.log("ID MODUL:", idModul);
      console.log("NAMA MODUL:", modulCheck.nama_modul);
      console.log("JUMLAH SOAL:", soalEntries.length);
      console.log("================================");

      for (const [index, entry] of soalEntries.entries()) {
        const nomor = index + 1;

        if (!entry.soal.trim()) {
          throw new Error(`Soal ke-${nomor} belum diisi.`);
        }

        if (
          !entry.jawabanA.trim() ||
          !entry.jawabanB.trim() ||
          !entry.jawabanC.trim() ||
          !entry.jawabanD.trim()
        ) {
          throw new Error(
            `Semua pilihan jawaban pada soal ke-${nomor} wajib diisi.`,
          );
        }

        if (!entry.kunciJawaban) {
          throw new Error(`Pilih kunci jawaban untuk soal ke-${nomor}.`);
        }
      }

      // Auto-deteksi otomatis tingkat kesulitan + Learning Object untuk semua soal sebelum disimpan
      setFormError("");
      const autoDetectResults: Array<{ index: number; difficulty: number; loId: number | null }> = [];
      for (const [index, entry] of soalEntries.entries()) {
        const nomor = index + 1;
        if (!entry.soal.trim()) continue;
        try {
          const res = await fetch("/api/analyze-soal", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}`,
            },
            body: JSON.stringify({
              soal: entry.soal.trim(),
              idModul,
              learningObjects: learningObjects.map((lo) => ({
                id_sub_topik: lo.id_sub_topik,
                lo_code: lo.lo_code,
                judul: lo.judul,
                keywords: lo.keywords ?? null,
              })),
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              autoDetectResults.push({
                index,
                difficulty: data.difficulty_rating ?? entry.difficultyRating,
                loId: data.matched_lo?.id_sub_topik ?? entry.idSubTopik,
              });
            }
          }
        } catch {
          // Gagal deteksi per-soal tidak membatalkan penyimpanan; gunakan nilai default
        }
      }

      // Terapkan hasil deteksi otomatis ke entries
      for (const r of autoDetectResults) {
        updateEntry(soalEntries[r.index].id, {
          difficultyRating: r.difficulty,
          idSubTopik: r.loId ?? null,
        });
      }

      for (const [index, entry] of soalEntries.entries()) {
        const nomor = index + 1;

        console.log(`Menyimpan soal ${nomor} ke modul ${idModul}`);

        const { data: soalBaru, error: soalError } = await supabase
          .from("soal")
          .insert({
            id_modul: idModul,
            soal: entry.soal.trim(),
            id_sub_topik: entry.idSubTopik,
            difficulty_rating: entry.difficultyRating,
          })
          .select("id_soal, id_modul, soal")
          .single();

        if (soalError) {
          console.error("===== ERROR INSERT SOAL =====");
          console.error(soalError);
          console.error(JSON.stringify(soalError, null, 2));

          throw new Error(
            `Gagal menyimpan soal ke-${nomor}: ${soalError.message}`,
          );
        }

        if (!soalBaru) {
          throw new Error(`Soal ke-${nomor} gagal dibuat.`);
        }

        console.log("SOAL BERHASIL:", soalBaru);

        const jawaban = [
          {
            id_soal: soalBaru.id_soal,
            jawaban: entry.jawabanA.trim(),
            jawaban_benar: entry.kunciJawaban === "A",
          },
          {
            id_soal: soalBaru.id_soal,
            jawaban: entry.jawabanB.trim(),
            jawaban_benar: entry.kunciJawaban === "B",
          },
          {
            id_soal: soalBaru.id_soal,
            jawaban: entry.jawabanC.trim(),
            jawaban_benar: entry.kunciJawaban === "C",
          },
          {
            id_soal: soalBaru.id_soal,
            jawaban: entry.jawabanD.trim(),
            jawaban_benar: entry.kunciJawaban === "D",
          },
        ];

        const { data: jawabanData, error: jawabanError } = await supabase
          .from("jawaban")
          .insert(jawaban)
          .select();

        if (jawabanError) {
          console.error("===== ERROR INSERT JAWABAN =====");
          console.error(jawabanError);
          console.error(JSON.stringify(jawabanError, null, 2));

          throw new Error(
            `Soal berhasil dibuat, tetapi jawaban soal ke-${nomor} gagal disimpan: ${jawabanError.message}`,
          );
        }

        console.log("JAWABAN BERHASIL:", jawabanData);
      }

      await logActivity({
  fitur: "Bank Soal",
  jenis_aktivitas: "Create",
  keterangan: `Menambahkan ${soalEntries.length} soal ke modul "${modulCheck.nama_modul}"`,
});

      /*
       * =====================================================
       * SUKSES
       * =====================================================
       */
      setSuccessMessage(
        `${soalEntries.length} soal berhasil disimpan ke modul "${modulCheck.nama_modul}".`,
      );

      setSoalEntries([makeEmptyEntry()]);
    } catch (err: any) {
      console.error("===== ERROR SIMPAN =====");
      console.error(err);

      setFormError(
        err?.message ||
          err?.details ||
          err?.hint ||
          "Terjadi kesalahan saat menyimpan soal.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingModul) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f7fd]">
        <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-bold text-[#4a3f7a]">Memuat modul...</p>
        </div>
      </div>
    );
  }

  if (!idModul) {
    return (
      <DosenContainer
        categoryTag="BANK SOAL"
        title="Modul Tidak Ditemukan"
        subtitle="ID modul tidak valid atau belum dipilih."
      >
        <div className="mx-auto max-w-lg rounded-[28px] bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-sm font-bold text-rose-600">{formError}</p>
          <button
            type="button"
            onClick={() => router.push("/Dosen/bank_soal")}
            className="mt-6 rounded-full bg-[#4a3f7a] px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-[#3d3466] transition"
          >
            Kembali ke Bank Soal
          </button>
        </div>
      </DosenContainer>
    );
  }

  return (
    <DosenContainer
      categoryTag="BANK SOAL & KUIS"
      title={`Form Soal: ${namaModul}`}
      subtitle="Tambahkan soal pilihan ganda, tentukan kunci jawaban, atau impor file CSV."
      headerAction={
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleImportClick}
            disabled={importing}
            className="rounded-full bg-emerald-400 px-5 py-2.5 text-xs font-bold text-emerald-950 shadow-md hover:bg-emerald-300 transition disabled:opacity-60"
          >
            {importing ? "Mengimpor..." : "Impor CSV"}
          </button>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <Download size={14} />
            Template CSV
          </button>

          <button
            type="button"
            onClick={handleGenerateAll}
            disabled={generatingLO || generatingSoal}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-400 to-amber-400 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-purple-300 hover:to-amber-300 transition disabled:opacity-60"
          >
            {generatingLO || generatingSoal ? "Membuat..." : "Generate Otomatis"}
          </button>
        </div>
      }
    >
      {/* INFO STRIP */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[24px] bg-[#4a3f7a] p-6 text-white shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Kunci Jawaban Pilihan Ganda
          </span>
          <h2 className="text-lg font-bold text-white">
            Target Modul: {namaModul} 
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#c9c3e6] mr-1">Opsi Kunci:</span>
          {ANSWER_KEYS.map((key) => (
            <span
              key={key}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-black text-amber-300 border border-white/10"
            >
              {key}
            </span>
          ))}
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {soalEntries.map((entry, index) => (
            <div
              key={entry.id}
              className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-black/5"
            >
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0edf9] pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f8f7fd] text-sm font-black text-[#4a3f7a] ring-1 ring-[#4a3f7a]/10">
                    #{index + 1}
                  </span>
                  <h3 className="text-lg font-bold text-[#3d3466]">
                    Soal Pertanyaan {index + 1}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#8b84a5] mr-1">
                    Pilih Kunci:
                  </span>
                  {ANSWER_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateEntry(entry.id, { kunciJawaban: key })}
                      className={`h-9 min-w-[40px] rounded-full px-3 text-xs font-bold transition ${
                        entry.kunciJawaban === key
                          ? "bg-amber-400 text-amber-950 shadow-md ring-2 ring-amber-500/30"
                          : "bg-[#f8f7fd] text-[#4a3f7a] hover:bg-[#f0edf9]"
                      }`}
                    >
                      {key}
                    </button>
                  ))}

                  {soalEntries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition"
                    >
                      <Trash2 size={14} />
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">

                </div>
                {learningObjectError && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    {learningObjectError}
                  </p>
                )}
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#4a3f7a]">
                    Teks Pertanyaan Soal
                  </label>
                  <AutoResizeTextarea
                    value={entry.soal}
                    onChange={(val) => {
                      updateEntry(entry.id, { soal: val });
                      // Auto-cocokkan LO jika belum dipilih dan ada kata kunci yang cocok
                      if (!entry.idSubTopik) {
                        const matched = matchLOToQuestion(val, learningObjects);
                        if (matched !== null) {
                          updateEntry(entry.id, { idSubTopik: matched });
                        }
                      }
                    }}
                    placeholder="Tuliskan pertanyaan soal di sini..."
                    className="w-full min-h-[3.5rem] rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] p-4 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {OPTION_FIELDS.map((field) => {
                    const value =
                      field.key === "A"
                        ? entry.jawabanA
                        : field.key === "B"
                        ? entry.jawabanB
                        : field.key === "C"
                        ? entry.jawabanC
                        : entry.jawabanD;

                    return (
                      <div key={field.key}>
                        <label className="mb-1.5 block text-xs font-bold text-[#3d3466]">
                          {field.label}
                        </label>
                        <div className="relative flex items-start">
                          <span className="absolute left-4 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#4a3f7a]/10 text-xs font-black text-[#4a3f7a]">
                            {field.key}
                          </span>
                          <AutoResizeTextarea
                            value={value}
                            onChange={(val) => {
                              if (field.key === "A") updateEntry(entry.id, { jawabanA: val });
                              if (field.key === "B") updateEntry(entry.id, { jawabanB: val });
                              if (field.key === "C") updateEntry(entry.id, { jawabanC: val });
                              if (field.key === "D") updateEntry(entry.id, { jawabanD: val });
                            }}
                            placeholder={`Isi pilihan ${field.key}`}
                            className="w-full min-h-[2.75rem] rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] pl-12 pr-4 py-2.5 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white focus:ring-2 focus:ring-[#4a3f7a]/20"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* BUTTON ADD ENTRY & NOTIFICATIONS */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={addEntry}
            className="inline-flex items-center gap-2 rounded-full border border-[#4a3f7a]/20 bg-white px-6 py-3 text-xs font-bold text-[#4a3f7a] shadow-sm hover:bg-[#f8f7fd] transition"
          >
            <Plus size={16} />
            Tambah Pertanyaan Soal
          </button>
        </div>

        {formError && (
          <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-center text-sm font-bold text-rose-700 ring-1 ring-rose-200">
            {formError}
          </div>
        )}

        {generateMessage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setGenerateMessageOpen(false)}
          >
            <div
              className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-amber-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#4a3f7a]">Soal Otomatis Dihasilkan</h3>
              </div>
              <p className="text-sm text-gray-700 mb-4">{generateMessage}</p>
              <button
                type="button"
                onClick={() => setGenerateMessageOpen(false)}
                className="w-full rounded-xl bg-[#4a3f7a] px-4 py-2 text-xs font-bold text-white hover:bg-[#3d3466] transition"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {successMessage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSuccessMessage("")}
          >
            <div
              className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-emerald-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#4a3f7a]">Berhasil Disimpan</h3>
              </div>
              <p className="text-sm text-gray-700 mb-4">{successMessage}</p>
              <button
                type="button"
                onClick={() => setSuccessMessage("")}
                className="w-full rounded-xl bg-[#4a3f7a] px-4 py-2 text-xs font-bold text-white hover:bg-[#3d3466] transition"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Spacer agar konten terakhir tidak tertutup floating action bar */}
        <div className="h-24" />

        {/* FLOATING ACTION BAR: Batal & Simpan mengambang di pojok kanan bawah */}
        <div className="fixed bottom-6 right-6 z-30 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/Dosen/bank_soal")}
            className="rounded-full border border-[#e4e2ee] bg-white px-7 py-3.5 text-sm font-bold text-[#4a3f7a] shadow-lg shadow-black/10 hover:bg-[#f8f7fd] transition"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-amber-400 px-10 py-3.5 text-sm font-bold text-amber-950 shadow-lg shadow-amber-900/25 hover:bg-amber-300 transition disabled:opacity-50"
          >
            {saving ? "Menyimpan Semua Soal..." : "Deteksi Otomatis & Simpan Semua Soal"}
          </button>
        </div>
      </form>

      <input
        ref={importInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        hidden
        onChange={handleImportFile}
      />
    </DosenContainer>
  );
}

export default function BankSoalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f8f7fd]">
          <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
            <p className="text-sm font-bold text-[#4a3f7a]">Memuat form soal...</p>
          </div>
        </div>
      }
    >
      <BankSoalPageContent />
    </Suspense>
  );
}
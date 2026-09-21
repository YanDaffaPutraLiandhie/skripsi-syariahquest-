"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Papa from "papaparse";
import { Plus, Trash2, Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";


import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";
import { parseQuestionFile } from "@/lib/parseQuestionFile";
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
  };
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

  const [loadingModul, setLoadingModul] = useState(true);

  const [soalEntries, setSoalEntries] = useState<SoalEntry[]>([
    makeEmptyEntry(),
  ]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [importing, setImporting] = useState(false);

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
        .select("id_modul, nama_modul")
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

      console.log("MODUL DIPILIH:", {
        id_modul: data.id_modul,
        nama_modul: data.nama_modul,
      });

      setLoadingModul(false);
    }

    loadModul();
  }, [idModulParam]);

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
    ];

    const exampleRows = [
      [
        "Apa hukum riba dalam Islam?",
        "Haram",
        "Halal",
        "Makruh",
        "Mubah",
        "A",
      ],
      [
        "Siapa pendiri mazhab Syafi'i?",
        "Imam Malik",
        "Imam Syafi'i",
        "Imam Hanafi",
        "Imam Hambali",
        "B",
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

          const parsed: SoalEntry[] = rows.map((row) => {
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

      for (const [index, entry] of soalEntries.entries()) {
        const nomor = index + 1;

        console.log(`Menyimpan soal ${nomor} ke modul ${idModul}`);

        const { data: soalBaru, error: soalError } = await supabase
          .from("soal")
          .insert({
            id_modul: idModul,
            soal: entry.soal.trim(),
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
  jenis_aktivitas: "Tambah",
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
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#4a3f7a]">
                    Teks Pertanyaan Soal
                  </label>
                  <AutoResizeTextarea
                    value={entry.soal}
                    onChange={(val) => updateEntry(entry.id, { soal: val })}
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

        {successMessage && (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
            {successMessage}
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
            {saving ? "Menyimpan Soal..." : "Simpan Semua Soal"}
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
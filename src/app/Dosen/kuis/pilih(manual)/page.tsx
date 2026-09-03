"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Plus, Trash2, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";
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

type SavedQuiz = {
  id_quis: number;
  nama_kuis: string;
  id_soal: number;
  soal: string;
  id_jawaban: number;
  jawaban: string;
  jawaban_benar: boolean;
};

export default function BankSoalPage() {
  const router = useRouter();
  const [soalEntries, setSoalEntries] = useState<SoalEntry[]>([
    makeEmptyEntry(),
  ]);
  const [namaKuis, setNamaKuis] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [savedQuiz, setSavedQuiz] = useState<SavedQuiz[]>([]);

  const importInputRef = useRef<HTMLInputElement>(null);

  function updateEntry(id: string, patch: Partial<SoalEntry>) {
    setSoalEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  }

  function addEntry() {
    setSoalEntries((prev) => [...prev, makeEmptyEntry()]);
  }

  function removeEntry(id: string) {
    setSoalEntries((prev) => {
      if (prev.length <= 1) return prev;
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
      ["Apa hukum riba dalam Islam?", "Haram", "Halal", "Makruh", "Mubah", "A"],
      [
        "Siapa pendiri mazhab Syafi'i?",
        "Imam Malik",
        "Imam Syafi'i",
        "Imam Hanafi",
        "Imam Hambali",
        "B",
      ],
    ];

    const csv = Papa.unparse({ fields: headers, data: exampleRows });
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

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setFormError("");

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data;

          if (!rows || rows.length === 0) {
            throw new Error(
              "File CSV kosong atau formatnya tidak sesuai (pastikan ada baris header)",
            );
          }

          const parsed: SoalEntry[] = rows.map((row) => {
            const normalizedKunci = (row.kunci_jawaban || row.kunci || "")
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
          setSuccessMessage(
            `${validRows.length} soal berhasil diimpor dari CSV`,
          );
        } catch (err: any) {
          setFormError(err.message || "Gagal memproses file CSV");
        } finally {
          setImporting(false);
          if (importInputRef.current) importInputRef.current.value = "";
        }
      },
      error: (err) => {
        setFormError(err.message || "Gagal membaca file CSV");
        setImporting(false);
        if (importInputRef.current) importInputRef.current.value = "";
      },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setFormError("");
    setSuccessMessage("");

    if (!namaKuis.trim()) {
      setFormError("Silakan isi nama kuis terlebih dahulu.");
      setSaving(false);
      return;
    }

    try {
      const kuisName = namaKuis.trim();
      const quizRows: SavedQuiz[] = [];

      const { data: quisBaru, error: quisError } = await supabase
        .from("quis")
        .insert({ nama_kuis: kuisName })
        .select()
        .single();

      if (quisError) {
        throw new Error(quisError.message);
      }

      const idQuis = quisBaru.id_quis;

      for (const [index, entry] of soalEntries.entries()) {
        const nomor = index + 1;

        if (!entry.soal.trim()) {
          throw new Error(`Soal ke-${nomor} belum diisi`);
        }

        if (
          !entry.jawabanA.trim() ||
          !entry.jawabanB.trim() ||
          !entry.jawabanC.trim() ||
          !entry.jawabanD.trim()
        ) {
          throw new Error(
            `Semua pilihan jawaban pada soal ke-${nomor} wajib diisi`,
          );
        }

        if (!entry.kunciJawaban) {
          throw new Error(`Pilih kunci jawaban untuk soal ke-${nomor}`);
        }

        const { data: soalBaru, error: soalError } = await supabase
          .from("soal")
          .insert({
            id_modul: 8,
            soal: entry.soal,
          })
          .select()
          .single();

        if (soalError) {
          throw new Error(soalError.message);
        }

        const jawabanInput = [
          {
            id_soal: soalBaru.id_soal,
            jawaban: entry.jawabanA,
            jawaban_benar: entry.kunciJawaban === "A",
          },
          {
            id_soal: soalBaru.id_soal,
            jawaban: entry.jawabanB,
            jawaban_benar: entry.kunciJawaban === "B",
          },
          {
            id_soal: soalBaru.id_soal,
            jawaban: entry.jawabanC,
            jawaban_benar: entry.kunciJawaban === "C",
          },
          {
            id_soal: soalBaru.id_soal,
            jawaban: entry.jawabanD,
            jawaban_benar: entry.kunciJawaban === "D",
          },
        ];

        const { data: jawabanData, error: jawabanError } = await supabase
          .from("jawaban")
          .insert(jawabanInput)
          .select();

        if (jawabanError) {
          throw new Error(jawabanError.message);
        }

        for (const j of jawabanData ?? []) {
          const { error: detailError } = await supabase
            .from("detail_kuis")
            .insert({
              id_quis: idQuis,
              id_soal: soalBaru.id_soal,
              id_jawaban: j.id_jawaban,
            });

          if (detailError) {
            throw new Error(detailError.message);
          }

          quizRows.push({
            id_quis: idQuis,
            nama_kuis: kuisName,
            id_soal: soalBaru.id_soal,
            soal: entry.soal,
            id_jawaban: j.id_jawaban,
            jawaban: j.jawaban,
            jawaban_benar: j.jawaban_benar,
          });
        }
      }

      setSavedQuiz(quizRows);
      setSuccessMessage(
        `Kuis "${kuisName}" berhasil dibuat dengan id ${idQuis} (${soalEntries.length} soal).`,
      );

      await logActivity({
        fitur: "Kuis",
        jenis_aktivitas: "Tambah",
        keterangan: `Menambahkan kuis "${kuisName}" secara manual dengan ${soalEntries.length} soal`,
      });

      setSoalEntries([makeEmptyEntry()]);
      setNamaKuis("");
    } catch (err: any) {
      setFormError(
        err?.message || err?.details || err?.hint || "Terjadi kesalahan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <DosenContainer
      categoryTag="PEMBUATAN KUIS MANUAL"
      title="Susun Kuis Baru"
      subtitle="Input soal dan pilihan jawaban secara manual atau impor dari template CSV."
      headerAction={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleImportClick}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2.5 text-xs font-bold text-emerald-950 shadow-md hover:bg-emerald-300 transition"
          >
            {importing ? "Mengimpor..." : "Impor CSV"}
          </button>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold text-white backdrop-blur-sm hover:bg-white/20 transition"
          >
            <Download size={15} />
            Template CSV
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-6 rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-black/5">
          <label className="mb-2 block text-sm font-bold text-[#3d3466]">
            Nama Kuis
          </label>
          <input
            type="text"
            value={namaKuis}
            onChange={(e) => setNamaKuis(e.target.value)}
            placeholder="Tulis nama kuis di sini..."
            className="h-12 w-full rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] px-4 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white"
          />
        </div>

        <div className="space-y-6">
          {soalEntries.map((entry, index) => (
            <section
              key={entry.id}
              className="rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-black/5"
            >
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0edf9] pb-4">
                <div>
                  <span className="inline-flex items-center rounded-full bg-[#f8f7fd] px-3 py-1 text-xs font-black text-[#4a3f7a]">
                    Pertanyaan Soal #{index + 1}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-2 text-xs font-bold text-[#8b84a5]">Kunci:</span>
                  {ANSWER_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        updateEntry(entry.id, { kunciJawaban: key })
                      }
                      className={`h-9 w-9 rounded-full text-xs font-black transition ${
                        entry.kunciJawaban === key
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
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
                      className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition"
                    >
                      <Trash2 size={14} />
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-[#4a3f7a]">
                    Teks Pertanyaan
                  </label>
                  <input
                    type="text"
                    value={entry.soal}
                    onChange={(e) =>
                      updateEntry(entry.id, { soal: e.target.value })
                    }
                    placeholder="Tulis pertanyaan soal..."
                    className="h-12 w-full rounded-2xl border border-[#e4e2ee] bg-[#f8f7fd] px-4 text-sm font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {OPTION_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="mb-2 block text-xs font-bold text-[#4a3f7a]">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={
                          field.key === "A"
                            ? entry.jawabanA
                            : field.key === "B"
                              ? entry.jawabanB
                              : field.key === "C"
                                ? entry.jawabanC
                                : entry.jawabanD
                        }
                        onChange={(e) =>
                          updateEntry(entry.id, {
                            jawabanA:
                              field.key === "A"
                                ? e.target.value
                                : entry.jawabanA,
                            jawabanB:
                              field.key === "B"
                                ? e.target.value
                                : entry.jawabanB,
                            jawabanC:
                              field.key === "C"
                                ? e.target.value
                                : entry.jawabanC,
                            jawabanD:
                              field.key === "D"
                                ? e.target.value
                                : entry.jawabanD,
                          })
                        }
                        placeholder={`Pilihan ${field.key}...`}
                        className="h-11 w-full rounded-xl border border-[#e4e2ee] bg-[#f8f7fd] px-4 text-xs font-semibold text-[#2b2540] outline-none transition focus:border-[#4a3f7a] focus:bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={addEntry}
            className="inline-flex items-center gap-2 rounded-full bg-[#4a3f7a] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#3d3466] transition"
          >
            <Plus size={16} />
            Tambah Pertanyaan Lain
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/Dosen/kuis")}
              className="rounded-full border border-[#e4e2ee] bg-white px-6 py-3 text-xs font-bold text-[#4a3f7a] hover:bg-[#f8f7fd] transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-emerald-400 px-8 py-3 text-xs font-bold text-emerald-950 shadow-md shadow-emerald-900/20 hover:bg-emerald-300 transition disabled:opacity-70"
            >
              {saving ? "Menyimpan..." : "Simpan Kuis"}
            </button>
          </div>
        </div>

        {formError && (
          <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
            {formError}
          </p>
        )}
        {successMessage && (
          <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
            {successMessage}
          </p>
        )}
      </form>

      <input
        ref={importInputRef}
        type="file"
        accept=".csv,.xls,.xlsx"
        hidden
        onChange={handleImportFile}
      />
    </DosenContainer>
  );
}

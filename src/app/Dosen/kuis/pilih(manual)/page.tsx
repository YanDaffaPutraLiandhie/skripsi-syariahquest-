"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Plus, Trash2, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";

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

      // =====================
      // BUAT SATU BARIS PADA TABEL QUIS (1 nama kuis = 1 id_quis)
      // =====================

      const { data: quisBaru, error: quisError } = await supabase
        .from("quis")
        .insert({ nama_kuis: kuisName })
        .select()
        .single();

      if (quisError) {
        console.log("===== ERROR INSERT QUIS =====");
        console.log(quisError);
        console.log(JSON.stringify(quisError, null, 2));
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

        // =====================
        // SIMPAN SOAL
        // =====================

        const { data: soalBaru, error: soalError } = await supabase
          .from("soal")
          .insert({
            id_modul: 8,
            soal: entry.soal,
          })
          .select()
          .single();

        if (soalError) {
          console.log("===== ERROR INSERT SOAL =====");
          console.log(soalError);
          console.log(JSON.stringify(soalError, null, 2));
          throw new Error(soalError.message);
        }

        console.log("SOAL BERHASIL :", soalBaru);

        // =====================
        // SIMPAN JAWABAN
        // =====================

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
          console.log("===== ERROR INSERT JAWABAN =====");
          console.log(jawabanError);
          console.log(JSON.stringify(jawabanError, null, 2));
          throw new Error(jawabanError.message);
        }

        console.log("JAWABAN BERHASIL :", jawabanData);

        // =====================
        // SIMPAN KE TABEL DETAIL_QUIS (relasi kuis -> soal & jawaban)
        // =====================

        for (const j of jawabanData ?? []) {
          const { error: detailError } = await supabase
            .from("detail_kuis")
            .insert({
              id_quis: idQuis,
              id_soal: soalBaru.id_soal,
              id_jawaban: j.id_jawaban,
            });

          if (detailError) {
            console.log("===== ERROR INSERT DETAIL_QUIS =====");
            console.log(detailError);
            console.log(JSON.stringify(detailError, null, 2));
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
      console.log("===== CATCH =====");
      console.log(err);
      console.log(JSON.stringify(err, null, 2));

      setFormError(
        err?.message || err?.details || err?.hint || "Terjadi kesalahan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
<div className="flex min-h-screen bg-[#f8f7ff] text-[#2b2540]">
      <main className="flex-1 p-8">
        <div className="mb-6 rounded-[32px] bg-white p-8 shadow-sm">
          <button
            onClick={() => router.push("/Dosen/kuis")}
            className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#e4e2ee] bg-white text-[#4a3f7a] transition hover:bg-[#f7f6fb]"
            aria-label="Kembali"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#8b84a5]">
                Bank Soal
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[#2b2540]">
                Form Soal
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-[#6e6a85]">
                Tambahkan soal pilihan ganda, pilih kunci jawaban, atau impor
                CSV untuk mempercepat proses.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleImportClick}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
              >
                {importing ? "Mengimpor..." : "Impor Dokumen"}
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-2 rounded-full border border-[#ede8ff] bg-[#f7f4ff] px-5 py-3 text-sm font-semibold text-[#4a3f7a] transition hover:bg-[#ede8ff]"
              >
                <Download size={16} />
                Download Template
              </button>
            </div>
          </div>
        </div>

        <section className="mb-8 rounded-[32px] bg-[#4a3f7a] p-8 shadow-[0_28px_80px_rgba(74,63,122,0.14)]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#c9c6d6]">
                Kunci Jawaban
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Sistem Pilih Jawaban
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {ANSWER_KEYS.map((key) => (
                <span
                  key={key}
                  className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white"
                >
                  {key}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-6 text-[#e7defd]">
            Isi soal secara manual atau gunakan template CSV. Setiap soal dapat
            memiliki empat pilihan jawaban dengan satu kunci jawaban aktif.
          </p>
        </section>

<form onSubmit={handleSubmit}>
          <div className="mb-6 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-[#e5e1f2]">
            <label className="mb-2 block text-sm font-semibold text-[#4a3f7a]">
              Nama Kuis
            </label>
            <input
              type="text"
              value={namaKuis}
              onChange={(e) => setNamaKuis(e.target.value)}
              placeholder="Tulis nama kuis"
              className="h-12 w-full rounded-full border border-[#e4e2ee] bg-[#fcfcff] px-4 text-sm text-[#2b2540] outline-none transition focus:border-[#4a3f7a]"
            />
          </div>

          <div className="grid gap-6">
            {soalEntries.map((entry, index) => (
              <section
                key={entry.id}
                className="overflow-hidden rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-[#e5e1f2]"
              >
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#7b7397]">
                      Soal {index + 1}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-[#2b2540]">
                      Detail Soal
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {ANSWER_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          updateEntry(entry.id, { kunciJawaban: key })
                        }
                        className={`h-10 min-w-[44px] rounded-full px-3 text-sm font-semibold transition ${
                          entry.kunciJawaban === key
                            ? "bg-emerald-400 text-emerald-950"
                            : "bg-[#f1eff8] text-[#4a3f7a] hover:bg-[#e5e0f4]"
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                    {soalEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-[#e4e2ee] bg-[#fbfbfd] px-4 py-2 text-sm font-semibold text-[#8f86a8] hover:bg-[#f3f1f9]"
                      >
                        <Trash2 size={14} />
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid gap-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#4a3f7a]">
                      Soal
                    </label>
                    <input
                      type="text"
                      value={entry.soal}
                      onChange={(e) =>
                        updateEntry(entry.id, { soal: e.target.value })
                      }
                      placeholder="Tulis soal di sini"
                      className="h-12 w-full rounded-full border border-[#e4e2ee] bg-[#fcfcff] px-4 text-sm text-[#2b2540] outline-none transition focus:border-[#4a3f7a]"
                    />
                  </div>

                  {OPTION_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="mb-2 block text-sm font-semibold text-[#4a3f7a]">
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
                        placeholder={`Tulis jawaban pilihan ${field.key} di sini`}
                        className="h-12 w-full rounded-full border border-[#e4e2ee] bg-[#fcfcff] px-4 text-sm text-[#2b2540] outline-none transition focus:border-[#4a3f7a]"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={addEntry}
              className="inline-flex items-center gap-2 rounded-full bg-[#e7d9ff] px-6 py-3 text-sm font-semibold text-[#4a3f7a] transition hover:bg-[#d4c3f0]"
            >
              <Plus size={18} />
              Tambah Soal
            </button>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 rounded-full border border-[#e4e2ee] bg-white px-6 py-3 text-sm font-semibold text-[#4a3f7a] transition hover:bg-[#f8f7ff]"
            >
              <Download size={16} />
              Download Template
            </button>
          </div>

          {formError && (
            <p className="mt-4 text-sm font-semibold text-red-500">
              {formError}
            </p>
          )}
          {successMessage && (
            <p className="mt-4 text-sm font-semibold text-emerald-600">
              {successMessage}
            </p>
          )}

          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setSoalEntries([makeEmptyEntry()])}
              className="rounded-full border border-[#e4e2ee] bg-white px-6 py-3 text-sm font-semibold text-[#4a3f7a] hover:bg-[#f8f7ff]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>

<input
          ref={importInputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          hidden
          onChange={handleImportFile}
        />

        {/* Tabel Kuis yang sudah dibuat */}
        {savedQuiz.length > 0 && (
          <section className="mt-8 overflow-hidden rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-[#e5e1f2]">
            <div className="mb-4">
              <p className="text-sm uppercase tracking-[0.24em] text-[#8b84a5]">
                Hasil Kuis
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#2b2540]">
                {savedQuiz[0]?.nama_kuis ?? "Kuis"}
              </h2>
              <p className="mt-1 text-sm text-[#6e6a85]">
                Kuis disimpan dengan <b>{savedQuiz[0]?.id_quis}</b> sebagai id
                kuis baru.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e5e1f2] text-[#8b84a5]">
                    <th className="px-3 py-3 font-semibold">ID Kuis</th>
                    <th className="px-3 py-3 font-semibold">ID Soal</th>
                    <th className="px-3 py-3 font-semibold">Soal</th>
                    <th className="px-3 py-3 font-semibold">ID Jawaban</th>
                    <th className="px-3 py-3 font-semibold">Jawaban</th>
                    <th className="px-3 py-3 font-semibold">Jawaban Benar</th>
                  </tr>
                </thead>
                <tbody>
                  {savedQuiz.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[#f0eef7] last:border-0"
                    >
                      <td className="px-3 py-3">{row.id_quis}</td>
                      <td className="px-3 py-3">{row.id_soal}</td>
                      <td className="px-3 py-3">{row.soal}</td>
                      <td className="px-3 py-3">{row.id_jawaban}</td>
                      <td className="px-3 py-3">{row.jawaban}</td>
                      <td className="px-3 py-3">
                        {row.jawaban_benar ? (
                          <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold text-emerald-950">
                            Benar
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#f1eff8] px-3 py-1 text-xs font-semibold text-[#8f86a8]">
                            Salah
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

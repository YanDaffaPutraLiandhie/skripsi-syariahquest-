"use client";

import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { Plus, Trash2, Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

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

export default function BankSoalPage() {
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

      /*
       * Jika tidak ada ?id_modul=
       */
      if (!idModulParam) {
        setFormError(
          "ID modul tidak ditemukan. Silakan kembali dan pilih modul terlebih dahulu.",
        );
        setLoadingModul(false);
        return;
      }

      const parsedId = Number(idModulParam);

      /*
       * Pastikan ID berupa angka
       */
      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        setFormError("ID modul tidak valid.");
        setLoadingModul(false);
        return;
      }

      /*
       * Cari modul berdasarkan ID
       */
      const { data, error } = await supabase
        .from("modul")
        .select("id_modul, nama_modul")
        .eq("id_modul", parsedId)
        .maybeSingle();

      if (error) {
        console.error("Gagal mengambil modul:", error);

        setFormError(
          `Gagal mengambil data modul: ${error.message}`,
        );

        setLoadingModul(false);
        return;
      }

      /*
       * ID modul tidak ditemukan
       */
      if (!data) {
        setFormError(
          `Modul dengan ID ${parsedId} tidak ditemukan di database.`,
        );

        setLoadingModul(false);
        return;
      }

      /*
       * Modul valid
       */
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

  /*
   * =========================================================
   * UPDATE SOAL
   * =========================================================
   */
  function updateEntry(id: string, patch: Partial<SoalEntry>) {
    setSoalEntries((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              ...patch,
            }
          : entry,
      ),
    );
  }

  /*
   * =========================================================
   * TAMBAH SOAL
   * =========================================================
   */
  function addEntry() {
    setSoalEntries((prev) => [
      ...prev,
      makeEmptyEntry(),
    ]);
  }

  /*
   * =========================================================
   * HAPUS SOAL
   * =========================================================
   */
  function removeEntry(id: string) {
    setSoalEntries((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      return prev.filter((entry) => entry.id !== id);
    });
  }

  /*
   * =========================================================
   * DOWNLOAD TEMPLATE CSV
   * =========================================================
   */
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

    const blob = new Blob(
      ["\uFEFF" + csv],
      {
        type: "text/csv;charset=utf-8;",
      },
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "template_bank_soal.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /*
   * =========================================================
   * BUKA FILE IMPORT
   * =========================================================
   */
  function handleImportClick() {
    importInputRef.current?.click();
  }

  /*
   * =========================================================
   * IMPORT CSV
   * =========================================================
   */
  function handleImportFile(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setImporting(true);
    setFormError("");
    setSuccessMessage("");

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,

      complete: (results) => {
        try {
          const rows = results.data;

          if (!rows || rows.length === 0) {
            throw new Error(
              "File CSV kosong atau formatnya tidak sesuai.",
            );
          }

          const parsed: SoalEntry[] = rows.map((row) => {
            const normalizedKunci = (
              row.kunci_jawaban ||
              row.kunci ||
              ""
            )
              .trim()
              .toUpperCase();

            const validKunci: AnswerKey | null =
              ANSWER_KEYS.includes(
                normalizedKunci as AnswerKey,
              )
                ? (normalizedKunci as AnswerKey)
                : null;

            return {
              id: crypto.randomUUID(),

              soal: (row.soal || "").trim(),

              jawabanA: (
                row.jawaban_a || ""
              ).trim(),

              jawabanB: (
                row.jawaban_b || ""
              ).trim(),

              jawabanC: (
                row.jawaban_c || ""
              ).trim(),

              jawabanD: (
                row.jawaban_d || ""
              ).trim(),

              kunciJawaban: validKunci,
            };
          });

          const validRows = parsed.filter(
            (entry) => entry.soal,
          );

          if (validRows.length === 0) {
            throw new Error(
              'Tidak ada baris valid ditemukan. Pastikan kolom "soal" terisi.',
            );
          }

          setSoalEntries(validRows);

          setSuccessMessage(
            `${validRows.length} soal berhasil diimpor dari CSV.`,
          );
        } catch (err: any) {
          setFormError(
            err?.message ||
              "Gagal memproses file CSV.",
          );
        } finally {
          setImporting(false);

          if (importInputRef.current) {
            importInputRef.current.value = "";
          }
        }
      },

      error: (err) => {
        setFormError(
          err.message ||
            "Gagal membaca file CSV.",
        );

        setImporting(false);

        if (importInputRef.current) {
          importInputRef.current.value = "";
        }
      },
    });
  }

  /*
   * =========================================================
   * SIMPAN SOAL
   * =========================================================
   */
  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setSaving(true);
    setFormError("");
    setSuccessMessage("");

    try {
      /*
       * =====================================================
       * VALIDASI MODUL
       * =====================================================
       */
      if (!idModul) {
        throw new Error(
          "ID modul tidak ditemukan. Silakan kembali dan pilih modul.",
        );
      }

      /*
       * =====================================================
       * CEK MODUL SEKALI LAGI
       * =====================================================
       */
      const { data: modulCheck, error: modulError } =
        await supabase
          .from("modul")
          .select("id_modul, nama_modul")
          .eq("id_modul", idModul)
          .maybeSingle();

      if (modulError) {
        throw new Error(
          `Gagal mengecek modul: ${modulError.message}`,
        );
      }

      if (!modulCheck) {
        throw new Error(
          `Modul dengan ID ${idModul} tidak ditemukan.`,
        );
      }

      console.log("================================");
      console.log("MULAI SIMPAN SOAL");
      console.log("ID MODUL:", idModul);
      console.log("NAMA MODUL:", modulCheck.nama_modul);
      console.log("JUMLAH SOAL:", soalEntries.length);
      console.log("================================");

      /*
       * =====================================================
       * VALIDASI SEMUA SOAL DULU
       * =====================================================
       */
      for (const [index, entry] of soalEntries.entries()) {
        const nomor = index + 1;

        if (!entry.soal.trim()) {
          throw new Error(
            `Soal ke-${nomor} belum diisi.`,
          );
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
          throw new Error(
            `Pilih kunci jawaban untuk soal ke-${nomor}.`,
          );
        }
      }

      /*
       * =====================================================
       * INSERT SEMUA SOAL
       * =====================================================
       */
      for (const [
        index,
        entry,
      ] of soalEntries.entries()) {
        const nomor = index + 1;

        console.log(
          `Menyimpan soal ${nomor} ke modul ${idModul}`,
        );

        /*
         * PENTING:
         *
         * Jangan lagi menggunakan:
         *
         * id_modul: 8
         *
         * Sekarang menggunakan:
         *
         * id_modul: idModul
         */
        const { data: soalBaru, error: soalError } =
          await supabase
            .from("soal")
            .insert({
              id_modul: idModul,
              soal: entry.soal.trim(),
            })
            .select("id_soal, id_modul, soal")
            .single();

        if (soalError) {
          console.error(
            "===== ERROR INSERT SOAL =====",
          );

          console.error(soalError);

          console.error(
            JSON.stringify(
              soalError,
              null,
              2,
            ),
          );

          throw new Error(
            `Gagal menyimpan soal ke-${nomor}: ${soalError.message}`,
          );
        }

        if (!soalBaru) {
          throw new Error(
            `Soal ke-${nomor} gagal dibuat.`,
          );
        }

        console.log(
          "SOAL BERHASIL:",
          soalBaru,
        );

        /*
         * ===================================================
         * INSERT JAWABAN
         * ===================================================
         */
        const jawaban = [
          {
            id_soal: soalBaru.id_soal,
            jawaban: entry.jawabanA.trim(),
            jawaban_benar:
              entry.kunciJawaban === "A",
          },
          {
            id_soal: soalBaru.id_soal,
            jawaban: entry.jawabanB.trim(),
            jawaban_benar:
              entry.kunciJawaban === "B",
          },
          {
            id_soal: soalBaru.id_soal,
            jawaban: entry.jawabanC.trim(),
            jawaban_benar:
              entry.kunciJawaban === "C",
          },
          {
            id_soal: soalBaru.id_soal,
            jawaban: entry.jawabanD.trim(),
            jawaban_benar:
              entry.kunciJawaban === "D",
          },
        ];

        const {
          data: jawabanData,
          error: jawabanError,
        } = await supabase
          .from("jawaban")
          .insert(jawaban)
          .select();

        if (jawabanError) {
          console.error(
            "===== ERROR INSERT JAWABAN =====",
          );

          console.error(jawabanError);

          console.error(
            JSON.stringify(
              jawabanError,
              null,
              2,
            ),
          );

          throw new Error(
            `Soal berhasil dibuat, tetapi jawaban soal ke-${nomor} gagal disimpan: ${jawabanError.message}`,
          );
        }

        console.log(
          "JAWABAN BERHASIL:",
          jawabanData,
        );
      }

      /*
       * =====================================================
       * SUKSES
       * =====================================================
       */
      setSuccessMessage(
        `${soalEntries.length} soal berhasil disimpan ke modul "${modulCheck.nama_modul}".`,
      );

      setSoalEntries([
        makeEmptyEntry(),
      ]);
    } catch (err: any) {
      console.error(
        "===== ERROR SIMPAN =====",
      );

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

  /*
   * =========================================================
   * LOADING MODUL
   * =========================================================
   */
  if (loadingModul) {
    return (
      <div className="flex min-h-screen bg-[#f8f7ff]">
        <Sidebar activeLabel="Bank Soal" />

        <main className="flex flex-1 items-center justify-center p-8">
          <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
            <p className="text-sm text-[#6e6a85]">
              Memuat modul...
            </p>
          </div>
        </main>
      </div>
    );
  }

  /*
   * =========================================================
   * JIKA MODUL TIDAK VALID
   * =========================================================
   */
  if (!idModul) {
    return (
      <div className="flex min-h-screen bg-[#f8f7ff] text-[#2b2540]">
        <Sidebar activeLabel="Bank Soal" />

        <main className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-lg rounded-[32px] bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-[#2b2540]">
              Modul Tidak Ditemukan
            </h1>

            <p className="mt-3 text-sm text-red-500">
              {formError}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/Dosen/bank_soal")
              }
              className="mt-6 rounded-full bg-[#4a3f7a] px-6 py-3 text-sm font-semibold text-white"
            >
              Kembali ke Bank Soal
            </button>
          </div>
        </main>
      </div>
    );
  }

  /*
   * =========================================================
   * HALAMAN UTAMA
   * =========================================================
   */
  return (
    <div className="flex min-h-screen bg-[#f8f7ff] text-[#2b2540]">
      <Sidebar activeLabel="Bank Soal" />

      <main className="flex-1 p-8">

        {/* HEADER */}
        <div className="mb-6 rounded-[32px] bg-white p-8 shadow-sm">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm uppercase tracking-[0.24em] text-[#8b84a5]">
                Bank Soal
              </p>

              <h1 className="mt-2 text-3xl font-semibold text-[#2b2540]">
                Form Soal
              </h1>

              <p className="mt-3 text-sm text-[#6e6a85]">
                Tambahkan soal pilihan ganda,
                pilih kunci jawaban, atau impor
                CSV untuk mempercepat proses.
              </p>

              {/* MODUL TERPILIH */}
              <div className="mt-5 inline-flex items-center gap-3 rounded-full bg-[#f1eff8] px-5 py-3">

                <span className="text-xs font-semibold uppercase tracking-wider text-[#8b84a5]">
                  Modul
                </span>

                <span className="font-semibold text-[#4a3f7a]">
                  {namaModul}
                </span>

                <span className="rounded-full bg-[#4a3f7a] px-3 py-1 text-xs font-bold text-white">
                  ID: {idModul}
                </span>

              </div>

            </div>

            <div className="flex flex-wrap items-center gap-3">

              <button
                type="button"
                onClick={handleImportClick}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-60"
              >
                {importing
                  ? "Mengimpor..."
                  : "Impor Dokumen"}
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

        {/* INFO */}
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
            Semua soal yang disimpan pada halaman
            ini akan dimasukkan ke modul:
            <strong className="ml-1 text-white">
              {namaModul}
            </strong>
          </p>

        </section>

        {/* FORM */}
        <form onSubmit={handleSubmit}>

          <div className="grid gap-6">

            {soalEntries.map(
              (entry, index) => (
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

                      {ANSWER_KEYS.map(
                        (key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              updateEntry(
                                entry.id,
                                {
                                  kunciJawaban:
                                    key,
                                },
                              )
                            }
                            className={`h-10 min-w-[44px] rounded-full px-3 text-sm font-semibold transition ${
                              entry.kunciJawaban ===
                              key
                                ? "bg-emerald-400 text-emerald-950"
                                : "bg-[#f1eff8] text-[#4a3f7a] hover:bg-[#e5e0f4]"
                            }`}
                          >
                            {key}
                          </button>
                        ),
                      )}

                      {soalEntries.length >
                        1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeEntry(
                              entry.id,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-[#e4e2ee] bg-[#fbfbfd] px-4 py-2 text-sm font-semibold text-[#8f86a8] hover:bg-[#f3f1f9]"
                        >
                          <Trash2 size={14} />
                          Hapus
                        </button>
                      )}

                    </div>

                  </div>

                  <div className="grid gap-5">

                    {/* SOAL */}
                    <div>

                      <label className="mb-2 block text-sm font-semibold text-[#4a3f7a]">
                        Soal
                      </label>

                      <input
                        type="text"
                        value={entry.soal}
                        onChange={(e) =>
                          updateEntry(
                            entry.id,
                            {
                              soal:
                                e.target.value,
                            },
                          )
                        }
                        placeholder="Tulis soal di sini"
                        className="h-12 w-full rounded-full border border-[#e4e2ee] bg-[#fcfcff] px-4 text-sm text-[#2b2540] outline-none transition focus:border-[#4a3f7a]"
                      />

                    </div>

                    {/* JAWABAN */}
                    {OPTION_FIELDS.map(
                      (field) => {

                        const value =
                          field.key ===
                          "A"
                            ? entry.jawabanA
                            : field.key ===
                                "B"
                              ? entry.jawabanB
                              : field.key ===
                                  "C"
                                ? entry.jawabanC
                                : entry.jawabanD;

                        return (
                          <div
                            key={
                              field.key
                            }
                          >

                            <label className="mb-2 block text-sm font-semibold text-[#4a3f7a]">
                              {
                                field.label
                              }
                            </label>

                            <input
                              type="text"
                              value={value}
                              onChange={(
                                e,
                              ) => {

                                const newValue =
                                  e.target
                                    .value;

                                if (
                                  field.key ===
                                  "A"
                                ) {
                                  updateEntry(
                                    entry.id,
                                    {
                                      jawabanA:
                                        newValue,
                                    },
                                  );
                                }

                                if (
                                  field.key ===
                                  "B"
                                ) {
                                  updateEntry(
                                    entry.id,
                                    {
                                      jawabanB:
                                        newValue,
                                    },
                                  );
                                }

                                if (
                                  field.key ===
                                  "C"
                                ) {
                                  updateEntry(
                                    entry.id,
                                    {
                                      jawabanC:
                                        newValue,
                                    },
                                  );
                                }

                                if (
                                  field.key ===
                                  "D"
                                ) {
                                  updateEntry(
                                    entry.id,
                                    {
                                      jawabanD:
                                        newValue,
                                    },
                                  );
                                }
                              }}
                              placeholder={`Tulis jawaban pilihan ${field.key} di sini`}
                              className="h-12 w-full rounded-full border border-[#e4e2ee] bg-[#fcfcff] px-4 text-sm text-[#2b2540] outline-none transition focus:border-[#4a3f7a]"
                            />

                          </div>
                        );
                      },
                    )}

                  </div>

                </section>
              ),
            )}

          </div>

          {/* BUTTON TAMBAH */}
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
              className="inline-flex items-center gap-2 rounded-full border border-[#e4e2ee] bg-white px-6 py-3 text-sm font-semibold text-[#4a3f7a] hover:bg-[#f8f7ff]"
            >
              <Download size={16} />
              Download Template
            </button>

          </div>

          {/* ERROR */}
          {formError && (
            <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-500">
              {formError}
            </div>
          )}

          {/* SUCCESS */}
          {successMessage && (
            <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-600">
              {successMessage}
            </div>
          )}

          {/* BOTTOM BUTTON */}
          <div className="mt-8 flex flex-wrap justify-end gap-3">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/Dosen/bank_soal",
                )
              }
              className="rounded-full border border-[#e4e2ee] bg-white px-6 py-3 text-sm font-semibold text-[#4a3f7a] hover:bg-[#f8f7ff]"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving
                ? "Menyimpan..."
                : "Simpan"}
            </button>

          </div>

        </form>

        {/* FILE INPUT */}
        <input
          ref={importInputRef}
          type="file"
          accept=".csv"
          hidden
          onChange={handleImportFile}
        />

      </main>
    </div>
  );
}
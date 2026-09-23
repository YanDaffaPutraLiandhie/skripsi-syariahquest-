"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DosenContainer from "@/components/layout/DosenContainer";
import { ClipboardList, X } from "lucide-react";

type ModulDone = {
  no: number;
  name: string;
  badge: string;
  badgeColor: string;
  score: number;
  passed: boolean;
};

type AnswerHistory = {
  id_soal: number;
  id_jawaban: number | null;
  is_benar: boolean;
  soal?: { soal: string } | { soal: string }[] | null;
  jawaban?: { jawaban: string } | { jawaban: string }[] | null;
};

type ModulJoin = {
  id_modul: number;
  nama_modul: string;
  level?:
    | { id_level: number; nama_level: string }
    | { id_level: number; nama_level: string }[]
    | null;
};

// Bentuk baris hasil query progress_modul di atas: hanya field yang
// benar-benar di-select (id, nilai, selesai, kuis_dicoba, modul via join).
// id_mahasiswa TIDAK di-select di sini (sudah difilter lewat .eq()), jadi
// tidak boleh diwajibkan di tipe ini.
type ProgressRow = {
  id: number;
  nilai: number | null;
  selesai: boolean;
  kuis_dicoba: boolean;
  modul?: ModulJoin | ModulJoin[] | null;
};

function getBadgeInfo(namaLevel: string | null | undefined) {
  const lvl = (namaLevel ?? "").toLowerCase();
  if (lvl.includes("easy") || lvl.includes("mudah")) return { badge: "E", badgeColor: "bg-emerald-500" };
  if (lvl.includes("medium") || lvl.includes("sedang")) return { badge: "M", badgeColor: "bg-amber-400" };
  if (lvl.includes("hard") || lvl.includes("sulit")) return { badge: "H", badgeColor: "bg-red-600" };
  return { badge: "-", badgeColor: "bg-gray-400" };
}

export default function DetailMahasiswa() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const idMahasiswa = params?.id as string;
  const idModul = searchParams.get("id_modul");

  const [namaMahasiswa, setNamaMahasiswa] = useState("Mahasiswa");
  const [modulDone, setModulDone] = useState<ModulDone[]>([]);
  const [answerHistory, setAnswerHistory] = useState<AnswerHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // BARU: evaluasi jawaban disembunyikan dulu, tampil lewat popup
  // begitu tombol "Lihat Evaluasi Jawaban" ditekan.
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);

  useEffect(() => {
    if (!idMahasiswa) return;

    async function load() {
      setIsLoading(true);

      const { data: mhs, error: mhsError } = await supabase
        .from("mahasiswa")
        .select("nama_mahasiswa")
        .eq("id_mahasiswa", idMahasiswa)
        .maybeSingle();

      if (mhsError) console.error("Gagal fetch mahasiswa:", mhsError);
      setNamaMahasiswa(mhs?.nama_mahasiswa ?? "Mahasiswa");

      // =========================================================
      // Ambil semua modul yang KUIS-nya sudah pernah dicoba
      // (kuis_dicoba = true), bukan hanya yang lulus (selesai = true).
      // Dengan begini modul yang sudah dikerjakan tapi belum lulus
      // tetap muncul di detail aktivitas beserta nilainya.
      // =========================================================
      const { data, error } = await supabase
        .from("progress_modul")
        .select(
          `
          id,
          nilai,
          selesai,
          kuis_dicoba,
          modul:id_modul (
            id_modul,
            nama_modul,
            level:id_level (
              id_level,
              nama_level
            )
          )
        `
        )
        .eq("id_mahasiswa", idMahasiswa)
        .eq("kuis_dicoba", true);

      if (error) {
        console.error("Gagal fetch progress_modul:", error);
        setIsLoading(false);
        return;
      }

      const mapped: ModulDone[] = ((data ?? []) as ProgressRow[]).map((row, index) => {
        const modul = Array.isArray(row.modul) ? row.modul[0] : row.modul;
        const level = Array.isArray(modul?.level) ? modul.level[0] : modul?.level;
        const { badge, badgeColor } = getBadgeInfo(level?.nama_level);

        return {
          no: index + 1,
          name: modul?.nama_modul ?? "Modul",
          badge,
          badgeColor,
          score: Number(row.nilai) || 0,
          passed: !!row.selesai,
        };
      });

      setModulDone(mapped);

      if (idModul) {
        const { data: historyData, error: historyError } = await supabase
          .from("riwayat_jawaban_kuis")
          .select(
            "id_soal, id_jawaban, is_benar, soal:id_soal(soal), jawaban:id_jawaban(jawaban)",
          )
          .eq("id_mahasiswa", idMahasiswa)
          .eq("id_modul", Number(idModul))
          .order("id_soal", { ascending: true });

        if (historyError) {
          console.error("Gagal fetch riwayat jawaban kuis:", historyError);
        } else {
          setAnswerHistory((historyData ?? []) as AnswerHistory[]);
        }
      }

      setIsLoading(false);
    }

    load();
  }, [idMahasiswa, idModul]);

  const jumlahBenar = answerHistory.filter((a) => a.is_benar).length;
  const jumlahSalah = answerHistory.length - jumlahBenar;

  return (
    <DosenContainer
      categoryTag="DETAIL AKTIVITAS MAHASISWA"
      title={namaMahasiswa}
      subtitle="Riwayat modul dan pencapaian nilai yang telah dikerjakan mahasiswa."
      headerAction={
        <button
          type="button"
          onClick={() => router.push("/Dosen/modul/aktivitas")}
          className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          ← Kembali ke Aktivitas
        </button>
      }
    >
      <div className="mx-auto max-w-4xl rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-black/5">
        <div className="mb-8 flex flex-col items-center border-b border-[#f0edf9] pb-6">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#4a3f7a] to-[#3d3466] text-white shadow-md">
            <svg className="h-10 w-10 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#3d3466]">{namaMahasiswa}</h2>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#f8f7fd] px-3.5 py-1 text-xs font-semibold text-[#4a3f7a] ring-1 ring-[#4a3f7a]/10">
            Daftar Modul yang Sudah Dikerjakan ({modulDone.length})
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm font-semibold text-[#8b84a5]">
            Memuat detail progress mahasiswa...
          </div>
        ) : modulDone.length === 0 ? (
          <div className="py-12 text-center text-sm font-semibold text-[#8b84a5]">
            Mahasiswa ini belum mengerjakan kuis modul pembelajaran apapun.
          </div>
        ) : (
          <div className="space-y-3">
            {modulDone.map((row) => (
              <div
                key={row.no}
                className="flex items-center justify-between rounded-2xl bg-[#f8f7fd] p-4 ring-1 ring-[#4a3f7a]/5 transition hover:bg-[#f0edf9]"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4a3f7a] text-xs font-bold text-white">
                    #{row.no}
                  </span>
                  <span className="text-sm font-bold text-[#2b2540]">{row.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${row.badgeColor}`}>
                    {row.badge}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ring-1 ${
                      row.passed
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-rose-50 text-rose-700 ring-rose-200"
                    }`}
                  >
                    Nilai: {row.score}
                    {!row.passed && " (Belum Lulus)"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =====================================================
            EVALUASI JAWABAN — disembunyikan di balik tombol,
            detailnya baru tampil lewat popup saat tombol ditekan.
        ===================================================== */}
        {idModul && (
          <div className="mt-8 border-t border-[#f0edf9] pt-8">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#f8f7fd] p-6 text-center ring-1 ring-[#4a3f7a]/5 sm:flex-row sm:justify-between sm:text-left">
              <div>
                <h3 className="text-base font-bold text-[#3d3466]">
                  Evaluasi Jawaban Kuis
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#8b84a5]">
                  {answerHistory.length > 0
                    ? `${answerHistory.length} soal • ${jumlahBenar} benar, ${jumlahSalah} salah`
                    : "Belum ada riwayat jawaban untuk modul ini."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowEvaluationModal(true)}
                disabled={answerHistory.length === 0}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#4a3f7a] px-6 py-3 text-xs font-bold text-white shadow-md shadow-[#4a3f7a]/20 transition hover:bg-[#3d3466] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ClipboardList size={16} />
                Lihat Evaluasi Jawaban
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          POPUP DETAIL JAWABAN
      ===================================================== */}
      {showEvaluationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowEvaluationModal(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER POPUP */}
            <div className="flex items-center justify-between border-b border-[#f0edf9] px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-[#3d3466]">
                  Detail Jawaban Kuis Evaluasi
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-[#8b84a5]">
                  {namaMahasiswa} • {answerHistory.length} soal ({jumlahBenar} benar, {jumlahSalah} salah)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEvaluationModal(false)}
                aria-label="Tutup"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8b84a5] transition hover:bg-[#f8f7fd] hover:text-[#4a3f7a]"
              >
                <X size={18} />
              </button>
            </div>

            {/* ISI POPUP (scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {answerHistory.length === 0 ? (
                <p className="py-6 text-center text-sm font-semibold text-[#8b84a5]">
                  Belum ada riwayat jawaban untuk modul ini.
                </p>
              ) : (
                <div className="space-y-3">
                  {answerHistory.map((answer, index) => {
                    const soal = Array.isArray(answer.soal) ? answer.soal[0] : answer.soal;
                    const jawaban = Array.isArray(answer.jawaban)
                      ? answer.jawaban[0]
                      : answer.jawaban;

                    return (
                      <div
                        key={`${answer.id_soal}-${index}`}
                        className={`rounded-2xl border-l-4 p-4 ${
                          answer.is_benar
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-rose-500 bg-rose-50"
                        }`}
                      >
                        <p className="text-sm font-bold text-[#2b2540]">
                          {index + 1}. {soal?.soal ?? "Soal tidak tersedia"}
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                          Jawaban mahasiswa: {jawaban?.jawaban ?? "Tidak dijawab"}
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            answer.is_benar
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {answer.is_benar ? "Benar" : "Salah"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FOOTER POPUP */}
            <div className="border-t border-[#f0edf9] px-6 py-4">
              <button
                type="button"
                onClick={() => setShowEvaluationModal(false)}
                className="w-full rounded-full border border-[#e4e2ee] bg-white px-6 py-3 text-sm font-bold text-[#4a3f7a] transition hover:bg-[#f8f7fd]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </DosenContainer>
  );
}
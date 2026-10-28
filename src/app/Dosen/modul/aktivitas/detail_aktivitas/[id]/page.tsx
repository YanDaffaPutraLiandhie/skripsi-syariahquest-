"use client";

// app/.../Dosen/modul/aktivitas/[id]/page.tsx  (versi dengan riwayat attempt + rata-rata)

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DosenContainer from "@/components/layout/DosenContainer";
import { ClipboardList, X } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

const CHART_COLORS = [
  "#4a3f7a", "#F59E0B", "#10B981", "#3B82F6",
  "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6",
];

function shortName(name: string, max = 16) {
  return name.length > max ? name.slice(0, max - 1) + "…" : name;
}

type Attempt = {
  ke: number;
  nilai: number;
};

type ModulDone = {
  no: number;
  idModul: number | null;
  name: string;
  badge: string;
  badgeColor: string;
  score: number;        // nilai akhir modul = nilai tertinggi
  passed: boolean;
  passScore: number;    // nilai minimal lulus modul
  attempts: Attempt[];  // semua percobaan, urut dari ke-1
  avg: number | null;   // rata-rata nilai semua percobaan modul ini
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
  parameter_nilai?: number | null;
  level?:
    | { id_level: number; nama_level: string }
    | { id_level: number; nama_level: string }[]
    | null;
};

// Bentuk baris hasil query progress_modul: hanya field yang di-select.
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

// Rata-rata dibulatkan 1 desimal; null jika tidak ada data
function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
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

  // evaluasi jawaban disembunyikan dulu, tampil lewat popup
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
      // Semua modul yang KUIS-nya pernah dicoba (kuis_dicoba = true),
      // termasuk yang belum lulus.
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
            parameter_nilai,
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

      // =========================================================
      // BARU: semua percobaan (attempt) mahasiswa ini, dikelompokkan per modul.
      // Butuh policy SELECT untuk dosen pada tabel attempt_kuis_modul.
      // =========================================================
      const { data: attemptRows, error: attemptError } = await supabase
        .from("attempt_kuis_modul")
        .select("id_modul, attempt_ke, nilai")
        .eq("id_mahasiswa", idMahasiswa)
        .order("attempt_ke", { ascending: true });

      if (attemptError) {
        console.error("Gagal fetch attempt_kuis_modul:", attemptError);
      }

      const attemptsByModul = new Map<number, Attempt[]>();
      for (const row of attemptRows ?? []) {
        const list = attemptsByModul.get(row.id_modul) ?? [];
        list.push({ ke: row.attempt_ke, nilai: Number(row.nilai) || 0 });
        attemptsByModul.set(row.id_modul, list);
      }

      const mapped: ModulDone[] = ((data ?? []) as ProgressRow[]).map((row, index) => {
        const modul = Array.isArray(row.modul) ? row.modul[0] : row.modul;
        const level = Array.isArray(modul?.level) ? modul.level[0] : modul?.level;
        const { badge, badgeColor } = getBadgeInfo(level?.nama_level);

        const modulId = modul?.id_modul ?? null;
        const attempts = modulId !== null ? attemptsByModul.get(modulId) ?? [] : [];

        return {
          no: index + 1,
          idModul: modulId,
          name: modul?.nama_modul ?? "Modul",
          badge,
          badgeColor,
          score: Number(row.nilai) || 0,
          passed: !!row.selesai,
          passScore: Number(modul?.parameter_nilai ?? 80),
          attempts,
          avg: average(attempts.map((a) => a.nilai)),
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

  // ---- Ringkasan keseluruhan ----
  const semuaAttempt = modulDone.flatMap((m) => m.attempts.map((a) => a.nilai));
  const totalAttempt = semuaAttempt.length;
  const rataSemuaAttempt = average(semuaAttempt);
  const rataNilaiAkhir = average(modulDone.map((m) => m.score));
  const modulLulus = modulDone.filter((m) => m.passed).length;

  const fmt = (v: number | null) => (v === null ? "-" : `${v}`);

  // ---- Data grafik ----
  const modulDenganAttempt = modulDone.filter((m) => m.attempts.length > 0);
  const maxPercobaan = Math.max(0, ...modulDenganAttempt.map((m) => m.attempts.length));

  // Garis: perkembangan nilai tiap modul dari percobaan ke-1, ke-2, ...
  const lineData = {
    labels: Array.from({ length: maxPercobaan }, (_, i) => `Percobaan ${i + 1}`),
    datasets: modulDenganAttempt.map((m, idx) => ({
      label: shortName(m.name, 22),
      data: Array.from({ length: maxPercobaan }, (_, i) => {
        const a = m.attempts.find((x) => x.ke === i + 1);
        return a ? a.nilai : null;
      }),
      borderColor: CHART_COLORS[idx % CHART_COLORS.length],
      backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
      borderWidth: 3,
      tension: 0.3,
      pointRadius: 5,
      pointHoverRadius: 7,
      spanGaps: true,
    })),
  };

  // Batang: rata-rata semua percobaan vs nilai akhir (tertinggi) per modul
  const barData = {
    labels: modulDenganAttempt.map((m) => shortName(m.name)),
    datasets: [
      {
        label: "Rata-rata Percobaan",
        data: modulDenganAttempt.map((m) => m.avg ?? 0),
        backgroundColor: "#F59E0B",
        borderRadius: 8,
      },
      {
        label: "Nilai Akhir (Tertinggi)",
        data: modulDenganAttempt.map((m) => m.score),
        backgroundColor: "#10B981",
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top" as const },
      tooltip: { enabled: true },
    },
    scales: {
      y: { beginAtZero: true, min: 0, max: 100, ticks: { stepSize: 20 } },
    },
  };

  return (
    <DosenContainer
      categoryTag="DETAIL AKTIVITAS MAHASISWA"
      title={namaMahasiswa}
      subtitle="Riwayat modul, percobaan kuis, dan pencapaian nilai yang telah dikerjakan mahasiswa."
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
      <div className="mx-auto max-w-4xl rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-8">
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

        {/* =====================================================
            RINGKASAN NILAI & RATA-RATA
        ===================================================== */}
        {!isLoading && modulDone.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-[#f8f7fd] p-4 text-center ring-1 ring-[#4a3f7a]/5">
              <p className="text-2xl font-extrabold text-[#2b2540]">
                {modulLulus}/{modulDone.length}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#8b84a5]">
                Modul Lulus
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8f7fd] p-4 text-center ring-1 ring-[#4a3f7a]/5">
              <p className="text-2xl font-extrabold text-[#2b2540]">{totalAttempt}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#8b84a5]">
                Total Percobaan
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4 text-center ring-1 ring-amber-200">
              <p className="text-2xl font-extrabold text-amber-700">{fmt(rataSemuaAttempt)}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-700/70">
                Rata-rata Semua Percobaan
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200">
              <p className="text-2xl font-extrabold text-emerald-700">{fmt(rataNilaiAkhir)}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700/70">
                Rata-rata Nilai Akhir
              </p>
            </div>
          </div>
        )}

        {/* =====================================================
            GRAFIK NILAI PERCOBAAN
        ===================================================== */}
        {!isLoading && modulDenganAttempt.length > 0 && (
          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-[#f8f7fd] p-4 ring-1 ring-[#4a3f7a]/5 sm:p-5">
              <h3 className="text-sm font-bold text-[#3d3466]">Perkembangan Nilai per Percobaan</h3>
              <p className="mb-3 text-xs font-medium text-[#8b84a5]">
                Tiap garis adalah satu modul. Naik berarti nilai membaik setelah remedial.
              </p>
              <div className="h-64 sm:h-72">
                <Line data={lineData} options={chartOptions} />
              </div>
            </div>

            <div className="rounded-2xl bg-[#f8f7fd] p-4 ring-1 ring-[#4a3f7a]/5 sm:p-5">
              <h3 className="text-sm font-bold text-[#3d3466]">Rata-rata vs Nilai Akhir per Modul</h3>
              <p className="mb-3 text-xs font-medium text-[#8b84a5]">
                Selisih besar menandakan banyak percobaan gagal sebelum lulus.
              </p>
              <div className="h-64 sm:h-72">
                <Bar data={barData} options={chartOptions} />
              </div>
            </div>
          </div>
        )}

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
                className="rounded-2xl bg-[#f8f7fd] p-4 ring-1 ring-[#4a3f7a]/5 transition hover:bg-[#f0edf9]"
              >
                {/* HEADER MODUL: bertumpuk di mobile, sejajar di layar lebar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4a3f7a] text-xs font-bold text-white">
                      #{row.no}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-sm font-bold leading-snug text-[#2b2540]">
                      {row.name}
                    </span>
                    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${row.badgeColor}`}>
                      {row.badge}
                    </span>
                  </div>
                  <span
                    className={`ml-11 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ring-1 sm:ml-0 sm:shrink-0 ${
                      row.passed
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-rose-50 text-rose-700 ring-rose-200"
                    }`}
                  >
                    Nilai Akhir: {row.score}
                    {!row.passed && " (Belum Lulus)"}
                  </span>
                </div>

                {/* RIWAYAT PERCOBAAN + RATA-RATA */}
                <div className="mt-3 border-t border-[#e4e2ee] pt-3">
                  {row.attempts.length === 0 ? (
                    <span className="text-xs font-semibold text-[#8b84a5]">
                      Riwayat percobaan belum tersedia (dikerjakan sebelum fitur percobaan aktif).
                    </span>
                  ) : (
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-[#8b84a5]">
                          Percobaan:
                        </span>
                        {row.attempts.map((a) => {
                          const lulus = a.nilai >= row.passScore;
                          const tertinggi = a.nilai === Math.max(...row.attempts.map((x) => x.nilai));
                          return (
                            <span
                              key={a.ke}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                                lulus
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                  : "bg-rose-50 text-rose-700 ring-rose-200"
                              }`}
                              title={tertinggi ? "Nilai tertinggi (dipakai sebagai nilai akhir)" : undefined}
                            >
                              #{a.ke}: {a.nilai}
                              {tertinggi && " ★"}
                            </span>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200 sm:justify-start sm:gap-2 sm:rounded-full sm:py-1">
                        <span className="text-xs font-bold text-amber-700/80">Rata-rata</span>
                        <span className="text-sm font-extrabold text-amber-700">{fmt(row.avg)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =====================================================
            EVALUASI JAWABAN
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
                    ? `${answerHistory.length} soal • ${jumlahBenar} benar, ${jumlahSalah} salah (percobaan terakhir)`
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
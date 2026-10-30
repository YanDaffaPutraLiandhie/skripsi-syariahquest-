"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSelectedMentor, MentorCharacter } from "@/constants/mentors";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Sparkles,
  Trophy,
  RotateCcw,
  BookOpen,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Award,
  Maximize2,
  Minimize2,
} from "lucide-react";

export type SoalVN = {
  id_soal: number;
  pertanyaan: string;
  kasusKlien: string;
  pilihan: {
    id_jawaban: number;
    teks: string;
    is_benar: boolean;
    penjelasan: string;
  }[];
};

type Props = {
  idModul: number;
  namaModul: string;
  parameterNilai?: number;
  onFinish?: (lulus: boolean, nilai: number) => void;
  onBackToMateri?: () => void;
};

export default function VisualNovelGame({
  idModul,
  namaModul,
  parameterNilai = 75,
  onFinish,
  onBackToMateri,
}: Props) {
  const router = useRouter();
  const { profile } = useCurrentUser();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [mentor, setMentor] = useState<MentorCharacter | null>(null);
  const [soalList, setSoalList] = useState<SoalVN[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedJawabanId, setSelectedJawabanId] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<
    { id_soal: number; is_benar: boolean; teks_soal: string; penjelasan: string }[]
  >([]);

  // State alur dialog
  // 'intro' -> 'soal' -> 'feedback' -> 'selesai'
  const [dialogStage, setDialogStage] = useState<"intro" | "soal" | "feedback" | "selesai">("intro");
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [showRemedialStudy, setShowRemedialStudy] = useState(false);

  // Ambil karakter mentor
  useEffect(() => {
    setMentor(getSelectedMentor());
  }, []);

  // Sinkronkan state fullscreen (termasuk saat user menekan Esc)
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch (e) {
      console.error("Fullscreen tidak didukung:", e);
    }
  };

  // Ambil soal kuis dari database Supabase
  useEffect(() => {
    async function loadQuestions() {
      try {
        const { data: dbQuestions, error } = await supabase
          .from("soal")
          .select("id_soal, soal, jawaban(*)")
          .eq("id_modul", idModul);

        if (!error && dbQuestions && dbQuestions.length > 0) {
          const mapped: SoalVN[] = dbQuestions.map((q: any) => ({
            id_soal: q.id_soal,
            pertanyaan: q.soal,
            kasusKlien: `Halo Konsultan! Terkait ${namaModul}, saya ingin berkonsultasi mengenai hal ini:`,
            pilihan: (q.jawaban || []).map((j: any) => ({
              id_jawaban: j.id_jawaban,
              teks: j.jawaban,
              is_benar: !!j.is_benar,
              penjelasan: j.is_benar
                ? "Pilihan ini tepat sesuai dengan kaidah rukun dan syarat fiqih muamalah."
                : "Pilihan ini kurang tepat karena belum memenuhi syarat keabsahan akad syariah.",
            })),
          }));
          setSoalList(mapped);
        } else {
          // Fallback soal skenario studi kasus jika modul belum ada soal di DB
          setSoalList([
            {
              id_soal: 101,
              pertanyaan: "Bagaimana hukum transaksi jual beli barang yang belum jelas spesifikasi dan waktu penyerahannya?",
              kasusKlien: "Halo Konsultan! Teman saya mengajak memesan barang pre-order tanpa keterangan waktu kirim dan jenis barang yang pasti. Bagaimana pandangan syariah terhadap kasus saya ini?",
              pilihan: [
                {
                  id_jawaban: 1,
                  teks: "Dilarang karena mengandung unsur Gharar (ketidakjelasan yang memicu sengketa).",
                  is_benar: true,
                  penjelasan: "Gharar dalam obyek akad dan waktu penyerahan dilarang oleh Rasulullah SAW karena merugikan salah satu pihak.",
                },
                {
                  id_jawaban: 2,
                  teks: "Boleh asal kedua pihak sama-sama ikhlas tanpa syarat apapun.",
                  is_benar: false,
                  penjelasan: "Kerelaan saja tidak membatalkan larangan gharar fakhisy (berat) yang bisa merusak akad.",
                },
                {
                  id_jawaban: 3,
                  teks: "Termasuk akad Salam yang sah tanpa ketentuan pembatasan.",
                  is_benar: false,
                  penjelasan: "Akad salam justru mewajibkan kejelasan kriteria, takaran, dan waktu penyerahan yang pasti.",
                },
                {
                  id_jawaban: 4,
                  teks: "Sah jika pembayaran dilakukan secara tunai di akhir.",
                  is_benar: false,
                  penjelasan: "Ketidakjelasan spesifikasi tetap membatalkan jual beli.",
                },
              ],
            },
            {
              id_soal: 102,
              pertanyaan: "Akad kemitraan usaha di mana satu pihak menyetor modal 100% dan pihak lain sebagai pengelola dinamakan...",
              kasusKlien: "Saya berencana membiayai usaha kuliner rekan saya secara penuh dan dia yang menjalankannya. Akad apa yang kami gunakan?",
              pilihan: [
                {
                  id_jawaban: 5,
                  teks: "Mudharabah",
                  is_benar: true,
                  penjelasan: "Mudharabah adalah akad kerjasama modal 100% dari Shahibul Maal dan keahlian dari Mudharib dengan nisbah bagi hasil yang disepakati.",
                },
                {
                  id_jawaban: 6,
                  teks: "Musyarakah",
                  is_benar: false,
                  penjelasan: "Musyarakah mengharuskan kedua belah pihak sama-sama menyetorkan modal.",
                },
                {
                  id_jawaban: 7,
                  teks: "Murabahah",
                  is_benar: false,
                  penjelasan: "Murabahah adalah akad jual beli dengan penegasan harga pokok dan keuntungan, bukan kemitraan modal.",
                },
                {
                  id_jawaban: 8,
                  teks: "Ijarah",
                  is_benar: false,
                  penjelasan: "Ijarah adalah sewa-menyewa atau upah tenaga kerja, bukan kemitraan laba rugi.",
                },
              ],
            },
            {
              id_soal: 103,
              pertanyaan: "Apakah tambahan uang atas pinjaman hutang pokok (Qardh) diperbolehkan dalam Islam?",
              kasusKlien: "Pemberi pinjaman meminta tambahan 5% dari total pinjaman sebagai biaya administrasi tanpa rincian riil. Bolehkah?",
              pilihan: [
                {
                  id_jawaban: 9,
                  teks: "Haram karena setiap pinjaman yang mensyaratkan manfaat lebih adalah Riba.",
                  is_benar: true,
                  penjelasan: "Kaidah fiqih menyatakan: 'Kullu qardin jarra manfa'atan fahuwa riba' (Setiap utang yang menarik manfaat bersyarat adalah riba).",
                },
                {
                  id_jawaban: 10,
                  teks: "Boleh asalkan nilainya di bawah tingkat inflasi bank konvensional.",
                  is_benar: false,
                  penjelasan: "Riba tetap haram berapapun persentasenya.",
                },
                {
                  id_jawaban: 11,
                  teks: "Boleh jika peminjam tidak merasa keberatan.",
                  is_benar: false,
                  penjelasan: "Riba dilarang syariat secara mutlak sekalipun ada kerelaan.",
                },
                {
                  id_jawaban: 12,
                  teks: "Boleh dengan akad hibah paksa.",
                  is_benar: false,
                  penjelasan: "Hibah yang dipersyaratkan di awal akad qardh dihukumi riba.",
                },
              ],
            },
          ]);
        }
      } catch (e) {
        console.error("Gagal memuat soal visual novel:", e);
      }
    }

    loadQuestions();
  }, [idModul, namaModul]);

  const currentSoal = soalList[currentIndex];

  const handleChooseOption = (id_jawaban: number) => {
    if (isAnswerSubmitted) return;
    setSelectedJawabanId(id_jawaban);
  };

  const handleConfirmAnswer = () => {
    if (!currentSoal || selectedJawabanId === null) return;

    const chosen = currentSoal.pilihan.find((p) => p.id_jawaban === selectedJawabanId);
    const isCorrect = !!chosen?.is_benar;

    setIsAnswerSubmitted(true);
    setDialogStage("feedback");

    setUserAnswers((prev) => [
      ...prev,
      {
        id_soal: currentSoal.id_soal,
        is_benar: isCorrect,
        teks_soal: currentSoal.pertanyaan,
        penjelasan: chosen?.penjelasan || "",
      },
    ]);
  };

  const handleNextQuestion = () => {
    setIsAnswerSubmitted(false);
    setSelectedJawabanId(null);

    if (currentIndex + 1 < soalList.length) {
      setCurrentIndex((prev) => prev + 1);
      setDialogStage("soal");
    } else {
      finishNovelGame();
    }
  };

  // Simpan hasil nilai ke progress_modul di Supabase
  const finishNovelGame = async () => {
    setDialogStage("selesai");
    setIsSubmittingScore(true);

    const totalQuestions = soalList.length;
    const correctCount = userAnswers.filter((a) => a.is_benar).length;
    const finalScore = Math.round((correctCount / totalQuestions) * 100);
    const isPassed = finalScore >= parameterNilai;

    try {
      if (profile?.idMahasiswa) {
        await supabase.from("progress_modul").upsert(
          {
            id_mahasiswa: profile.idMahasiswa,
            id_modul: idModul,
            nilai: finalScore,
            selesai: isPassed,
            kuis_dicoba: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id_mahasiswa,id_modul" }
        );

        // Jika lulus, tambahkan XP & Koin
        if (isPassed) {
          await supabase
            .from("mahasiswa")
            .update({
              total_xp: (profile.totalXp || 0) + 100,
              total_poin: (profile.totalPoin || 0) + 50,
            })
            .eq("id_mahasiswa", profile.idMahasiswa);
        }
      }
    } catch (e) {
      console.error("Gagal menyimpan progress visual novel:", e);
    } finally {
      setIsSubmittingScore(false);
      if (onFinish) {
        onFinish(isPassed, finalScore);
      }
    }
  };

  const totalQuestions = soalList.length || 1;
  const correctCount = userAnswers.filter((a) => a.is_benar).length;
  const finalScore = Math.round((correctCount / totalQuestions) * 100);
  const isPassed = finalScore >= parameterNilai;

  const handleStart = () => {
    setDialogStage("soal");
    // Bawa game ke tengah layar supaya langsung nyaman dimainkan
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleRestartVN = () => {
    setCurrentIndex(0);
    setSelectedJawabanId(null);
    setIsAnswerSubmitted(false);
    setUserAnswers([]);
    setDialogStage("soal");
    setShowRemedialStudy(false);
  };

  // Progres bar: jumlah kasus yang sudah dijawab
  const progressPercent =
    dialogStage === "selesai"
      ? 100
      : soalList.length > 0
        ? Math.round((userAnswers.length / soalList.length) * 100)
        : 0;

  // Karakter klien tampil saat kasus berlangsung
  const showClient = dialogStage === "soal" || dialogStage === "feedback";
  const isIntro = dialogStage === "intro";

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden border-2 border-purple-500/40 bg-[#0e0b24] text-white shadow-2xl flex flex-col select-none ${isFullscreen
          ? "h-screen rounded-none"
          : "h-[calc(100dvh-120px)] min-h-[560px] max-h-[920px] rounded-3xl"
        }`}
    >
      {/* 1. SCENE BACKGROUND: Ruang Kelas / Kantor Konsultan */}
      <img
        src="/game/scene-3.jpg"
        alt="Ruang Kelas Syariah Quest"
        className="absolute inset-0 h-full w-full object-cover object-center brightness-90 contrast-[1.05]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0e0b24] via-transparent to-black/30" />

      {/* TOP BAR */}
      <div className="relative z-30 shrink-0">
        <div className="flex items-center justify-between gap-3 bg-gradient-to-b from-slate-950/85 to-transparent p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-purple-400/40 bg-purple-600/80 px-3 py-1 text-xs font-black tracking-wide shadow">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span className="truncate">VISUAL NOVEL: {namaModul}</span>
            </div>
            <span className="hidden text-xs text-purple-200/80 sm:inline">
              Kasus {isIntro ? 0 : Math.min(currentIndex + 1, soalList.length)} dari {soalList.length}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {(dialogStage === "soal" || dialogStage === "feedback") && (
              <div className="hidden items-center gap-1.5 rounded-xl border border-purple-500/30 bg-slate-900/80 px-3 py-1 text-xs font-bold text-amber-300 sm:flex">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span>Target Lulus: {parameterNilai}%</span>
              </div>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
              aria-label={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
              className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-xl border border-purple-400/40 bg-slate-900/80 text-purple-100 transition hover:bg-purple-700/60"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Progress bar tipis */}
        <div className="mx-3 h-1 overflow-hidden rounded-full bg-white/10 sm:mx-4">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-400 to-amber-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ========================================================
          2. PANGGUNG KARAKTER
          Tinggi mengikuti sisa ruang (flex-1 + min-h-0), gambar memakai
          object-contain sehingga seluruh badan karakter selalu terlihat.
      ======================================================== */}
      <div className="pointer-events-none relative z-10 min-h-0 flex-1">
        {/* Klien / Rian (kiri) */}
        {showClient && (
          <div className="absolute bottom-0 left-[3%] flex h-full w-[40%] flex-col items-center justify-end animate-fade-in sm:left-[6%] sm:w-[34%]">
            <div className="mb-1.5 shrink-0 rounded-full border border-indigo-400/50 bg-[#1b1238]/90 px-3 py-0.5 text-[10px] font-black tracking-wide text-indigo-200 shadow-lg backdrop-blur-md">
              Rian (Klien Mahasiswa)
            </div>
            <img
              src="/game/student-1.png"
              alt="Rian - Mahasiswa / Klien Konsultasi"
              className="min-h-0 w-full flex-1 object-contain object-bottom brightness-105 drop-shadow-[0_15px_30px_rgba(10,5,25,0.85)]"
            />
          </div>
        )}

        {/* Mentor (kanan, atau tengah saat intro) */}
        <div
          className={`absolute bottom-0 flex h-full flex-col items-center justify-end transition-all duration-500 ${isIntro
              ? "left-1/2 w-[60%] -translate-x-1/2 sm:w-[40%]"
              : "right-[3%] w-[40%] sm:right-[6%] sm:w-[34%]"
            }`}
        >
          <div className="mb-1.5 shrink-0 rounded-full border border-[#ffc94a]/60 bg-[#1b1238]/90 px-3 py-0.5 text-[10px] font-black tracking-wide text-[#ffc94a] shadow-lg backdrop-blur-md">
            {mentor?.name || "Aisyah (Pembimbing)"}
          </div>
          <img
            src={mentor?.avatar || "/game/npc-2.png"}
            alt={mentor?.name || "Mentor Pengajar"}
            className="min-h-0 w-full flex-1 object-contain object-bottom brightness-105 drop-shadow-[0_15px_30px_rgba(10,5,25,0.85)]"
          />
        </div>
      </div>

      {/* ========================================================
          3. TAHAP 1: DIALOG INTRO PENGAJAR
      ======================================================== */}
      {dialogStage === "intro" && (
        <div className="relative z-30 shrink-0 border-t-2 border-purple-500/50 bg-[#161233]/95 p-4 backdrop-blur-md sm:p-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-2 inline-block rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1 text-xs font-black text-white shadow">
              {mentor?.name || "Pengajar Pembimbing"}
            </div>
            <p className="text-sm font-medium leading-relaxed text-purple-100 sm:text-base">
              "{mentor?.greeting || "Selamat datang di ruang konsultasi syariah!"} Dalam misi ini, seorang klien mahasiswa bernama Rian sedang membutuhkan rekomendasi fatwa dan kaidah fiqih mengenai {namaModul}. Bersiaplah membantunya dengan teliti!"
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleStart}
                disabled={soalList.length === 0}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition hover:scale-105 hover:from-amber-400 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                <span>{soalList.length === 0 ? "Memuat kasus..." : "Mulai Konsultasi Bersama Rian"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. TAHAP 2: DIALOG PERTANYAAN STUDI KASUS DARI KLIEN
      ======================================================== */}
      {dialogStage === "soal" && currentSoal && (
        <div className="relative z-30 max-h-[58%] shrink-0 overflow-y-auto border-t-2 border-purple-500/50 bg-[#161233]/95 p-3 backdrop-blur-md sm:p-5">
          <div className="mx-auto flex max-w-4xl flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-black text-white shadow">
                Rian (Mahasiswa / Klien Konsultasi)
              </span>
              <span className="text-[11px] text-purple-300">
                Kasus {currentIndex + 1} dari {soalList.length}
              </span>
            </div>

            <div className="rounded-2xl border border-purple-700/40 bg-[#201a47]/80 p-3">
              <p className="mb-1 text-xs italic text-purple-300">"{currentSoal.kasusKlien}"</p>
              <h3 className="text-sm font-bold text-white sm:text-base">{currentSoal.pertanyaan}</h3>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {currentSoal.pilihan.map((opsi, idx) => {
                const isSelected = selectedJawabanId === opsi.id_jawaban;
                const alphabet = ["A", "B", "C", "D"][idx] || "-";

                return (
                  <button
                    key={opsi.id_jawaban}
                    type="button"
                    onClick={() => handleChooseOption(opsi.id_jawaban)}
                    className={`flex items-start gap-2.5 rounded-xl border-2 p-2.5 text-left transition-all sm:p-3 ${isSelected
                        ? "scale-[1.01] border-amber-400 bg-amber-400/20 text-white shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                        : "border-purple-800/60 bg-[#1e1842]/70 text-purple-100 hover:border-purple-500 hover:bg-[#251f4f]"
                      }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${isSelected ? "bg-amber-400 text-slate-950" : "bg-purple-900 text-purple-200"
                        }`}
                    >
                      {alphabet}
                    </span>
                    <span className="text-xs font-medium leading-snug sm:text-sm">{opsi.teks}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={selectedJawabanId === null}
                onClick={handleConfirmAnswer}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black transition sm:text-sm ${selectedJawabanId !== null
                    ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 text-white shadow-lg hover:scale-105"
                    : "cursor-not-allowed bg-slate-700/50 text-slate-400"
                  }`}
              >
                <span>Sampaikan Rekomendasi Jawaban</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          5. TAHAP 3: REAKSI & FEEDBACK PENGAJAR / KLIEN
      ======================================================== */}
      {dialogStage === "feedback" && currentSoal && (
        <div className="relative z-30 max-h-[58%] shrink-0 overflow-y-auto border-t-2 border-purple-500/50 bg-[#161233]/95 p-4 backdrop-blur-md sm:p-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            {(() => {
              const chosen = currentSoal.pilihan.find((p) => p.id_jawaban === selectedJawabanId);
              const isCorrect = !!chosen?.is_benar;

              return (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-black shadow ${isCorrect ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                        }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Analisis Tepat! (Benar)</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Analisis Keliru (Salah)</span>
                        </>
                      )}
                    </span>
                    <span className="text-xs font-bold text-amber-300">Tanggapan {mentor?.name}</span>
                  </div>

                  <div
                    className={`rounded-2xl border p-3.5 ${isCorrect
                        ? "border-emerald-500/40 bg-emerald-950/40"
                        : "border-rose-500/40 bg-rose-950/40"
                      }`}
                  >
                    <p className="text-xs font-medium leading-relaxed text-purple-100 sm:text-sm">
                      "{isCorrect ? "Alhamdulillah! " : "Perhatikan baik-baik: "}
                      {chosen?.penjelasan ||
                        (isCorrect
                          ? "Jawabanmu sudah sesuai kaidah fiqih muamalah."
                          : "Kaidah fiqih menetapkan aturan yang berbeda untuk kasus ini.")}"
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-xs font-black text-white shadow-md transition hover:scale-105 hover:from-purple-500 hover:to-indigo-500 sm:text-sm"
                    >
                      <span>
                        {currentIndex + 1 < soalList.length
                          ? "Lanjut Kasus Berikutnya"
                          : "Lihat Hasil Evaluasi Misi"}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================
          6. TAHAP 4: KESIMPULAN AKHIR & FITUR REMEDIAL
      ======================================================== */}
      {dialogStage === "selesai" && (
        <div className="relative z-30 max-h-[70%] shrink-0 overflow-y-auto border-t-2 border-purple-500/50 bg-[#151130]/98 p-4 backdrop-blur-lg sm:p-6">
          <div className="mx-auto max-w-2xl text-center">
            {isPassed ? (
              /* KELULUSAN / MENANG */
              <div className="flex flex-col items-center">
                <div className="mb-3 flex h-14 w-14 animate-bounce items-center justify-center rounded-3xl border-2 border-emerald-400 bg-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                  <Award className="h-9 w-9 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black text-white">Misi Berhasil Diselesaikan!</h3>
                <p className="mt-1 text-sm font-semibold text-emerald-300">
                  Skor Akhir: {finalScore}% (Minimal Lulus: {parameterNilai}%)
                </p>
                <p className="mt-2 max-w-lg text-xs text-purple-200/80 sm:text-sm">
                  "{mentor?.congratsMessage || "Kerja luar biasa! Analisis konsultan mudamu membawa keberkahan dan keadilan transaksi."}"
                </p>

                <div className="mt-4 flex items-center gap-4 rounded-2xl border border-purple-800/60 bg-[#211a4a] p-3">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span>+100 XP Konsultan</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    <span>+50 Koin Syariah</span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/mahasiswa/dashboard")}
                    disabled={isSubmittingScore}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:scale-105 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-60 disabled:hover:scale-100"
                  >
                    <span>{isSubmittingScore ? "Menyimpan hasil..." : "Lanjut ke Peta Misi Berikutnya"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRestartVN}
                    className="flex items-center gap-2 rounded-xl border border-purple-600/40 bg-purple-900/40 px-5 py-3 text-xs font-bold text-purple-200 transition hover:bg-purple-800/50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Mainkan Ulang Kasus</span>
                  </button>
                </div>
              </div>
            ) : (
              /* TIDAK LULUS -> ALUR REMEDIAL */
              <div className="flex flex-col items-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl border-2 border-rose-400 bg-rose-500/20 shadow-[0_0_25px_rgba(244,63,94,0.5)]">
                  <AlertTriangle className="h-8 w-8 text-rose-400" />
                </div>
                <h3 className="text-xl font-black text-white sm:text-2xl">Perlu Remedial Evaluasi</h3>
                <p className="mt-1 text-sm font-bold text-rose-400">
                  Skormu: {finalScore}% (Batas Minimal: {parameterNilai}%)
                </p>
                <p className="mt-2 max-w-lg text-xs text-purple-200/80 sm:text-sm">
                  "{mentor?.remedialMessage || "Jangan berkecil hati. Mari kita pelajari materi remedial agar pemahamanmu semakin matang sebelum mencoba kembali!"}"
                </p>

                <div className="mt-4 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setShowRemedialStudy(!showRemedialStudy)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-xs font-bold text-white shadow-md transition hover:bg-purple-500 sm:w-auto sm:text-sm"
                  >
                    <BookOpen className="h-4 w-4 text-amber-300" />
                    <span>{showRemedialStudy ? "Tutup Materi Remedial" : "Buka Pembahasan Remedial"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRestartVN}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-xs font-black text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] transition hover:scale-105 hover:from-amber-400 hover:to-amber-500 sm:w-auto sm:text-sm"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Ulang Permainan Visual Novel Kelas</span>
                  </button>
                </div>

                {showRemedialStudy && (
                  <div className="mt-4 w-full animate-fade-in rounded-2xl border border-amber-400/40 bg-[#1c1642] p-4 text-left">
                    <div className="mb-2 flex items-center gap-2 text-xs font-black text-amber-300">
                      <Lightbulb className="h-4 w-4" />
                      <span>POIN-POIN PEMBAHASAN REMEDIAL:</span>
                    </div>
                    <div className="max-h-48 space-y-2.5 overflow-y-auto pr-1">
                      {userAnswers.map((ans, idx) => (
                        <div
                          key={idx}
                          className={`rounded-xl border p-2.5 text-xs ${ans.is_benar
                              ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
                              : "border-rose-500/40 bg-rose-950/30 text-rose-200"
                            }`}
                        >
                          <p className="font-bold">
                            {idx + 1}. {ans.teks_soal}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-purple-200/90">
                            💡 <strong>Pembahasan:</strong> {ans.penjelasan}
                          </p>
                        </div>
                      ))}
                    </div>

                    {onBackToMateri && (
                      <div className="mt-3 flex justify-end border-t border-purple-800/50 pt-3">
                        <button
                          type="button"
                          onClick={onBackToMateri}
                          className="text-xs font-bold text-amber-300 underline hover:text-amber-200"
                        >
                          Pelajari Ulang Seluruh Materi Modul Ini →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
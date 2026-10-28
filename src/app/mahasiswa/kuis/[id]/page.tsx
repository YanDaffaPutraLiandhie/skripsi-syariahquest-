"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  ShieldAlert,
  PartyPopper,
  AlertTriangle,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { calculateMasteryScore, selectAdaptiveQuestions, shuffleQuestions, MAX_QUESTION_COUNT, type AdaptiveProgress } from "@/lib/adaptiveLearning";
import { formatDeadline, isPastDeadline } from "@/lib/deadline";

interface Option {
  id_jawaban: number;
  teks_jawaban: string;
  is_benar: boolean;
}

interface Question {
  id_soal: number;
  teks_soal: string;
  opsi: Option[];
}

interface DetailKuisRow {
  id_soal: number;
  id_jawaban: number;
}

type ExamResult = {
  finalScore: number;
  correctCount: number;
  totalQuestions: number;
};

export default function UjianPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = use(params);
  const router = useRouter();
  const { profile } = useCurrentUser();

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [masteryScore, setMasteryScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);

  // Deadline kuis (dari tabel quis) — hanya untuk informasi, tidak
  // memengaruhi nilai karena tidak ada lagi nilai minimal / pematokan nilai.
  const [deadline, setDeadline] = useState<string | null>(null);

  // ==========================================
  // Penjaga Gerbang Kuis
  // Kuis TIDAK BISA DIULANG sama sekali. Begitu ada satu baris riwayat
  // (apa pun nilainya), mahasiswa dianggap sudah pernah mengerjakan
  // dan tidak bisa membuka ujian ini lagi.
  // ==========================================
  const [hasTaken, setHasTaken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // BARU: popup konfirmasi kustom (menggantikan window.confirm bawaan
  // browser yang tampilannya tidak konsisten dengan desain aplikasi).
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");

  useEffect(() => {
    async function fetchQuiz() {
      setIsLoading(true);
      try {
        // 1. CEK KEAMANAN: Apakah mahasiswa ini sudah PERNAH mengerjakan
        // kuis ini (nilai berapa pun)? Kalau sudah, kunci total.
        if (profile?.idMahasiswa) {
          const { data: historyData } = await supabase
            .from('riwayat_ujian')
            .select('id')
            .eq('id_quis', quizId)
            .eq('id_mahasiswa', profile.idMahasiswa)
            .limit(1);

          if (historyData && historyData.length > 0) {
            setHasTaken(true);
            setIsLoading(false);
            return;
          }
        }

        // 2. Ambil deadline kuis (informasi saja)
        const { data: quizMeta } = await supabase
          .from('quis')
          .select('deadline')
          .eq('id_quis', quizId)
          .maybeSingle();

        setDeadline(quizMeta?.deadline ?? null);

        // 3. Ambil relasi soal dan jawaban dari kuis.
        // Data jawaban disimpan sebagai baris terpisah di detail_kuis, jadi
        // limit harus diterapkan setelah soal dikelompokkan, bukan di query ini.
        const { data: detailData, error: detailError } = await supabase
          .from('detail_kuis')
          .select('id_soal, id_jawaban')
          .eq('id_quis', quizId);

        if (detailError) throw detailError;

        const detailRows = (detailData ?? []) as DetailKuisRow[];
        const soalIds = [...new Set(detailRows.map((row) => row.id_soal))];
        const jawabanIds = [...new Set(detailRows.map((row) => row.id_jawaban))];

        if (soalIds.length > 0) {
          const { data: soalData, error: soalError } = await supabase
            .from('soal')
            .select('id_soal, soal')
            .in('id_soal', soalIds);

          if (soalError) throw soalError;

          const { data: jawabanData, error: jawabanError } = await supabase
            .from('jawaban')
            .select('id_jawaban, id_soal, jawaban, jawaban_benar')
            .in('id_jawaban', jawabanIds);

          if (jawabanError) throw jawabanError;

          const soalTextMap = new Map(
            (soalData ?? []).map((row) => [row.id_soal, row.soal]),
          );
          const jawabanMap = new Map<number, Option[]>();

          for (const answer of jawabanData ?? []) {
            const options = jawabanMap.get(answer.id_soal) ?? [];
            options.push({
              id_jawaban: answer.id_jawaban,
              teks_jawaban: answer.jawaban,
              is_benar: Boolean(answer.jawaban_benar),
            });
            jawabanMap.set(answer.id_soal, options);
          }

          const questions = soalIds
            .map((idSoal) => ({
              id_soal: idSoal,
              teks_soal: soalTextMap.get(idSoal) || "Teks soal tidak tersedia",
              opsi: jawabanMap.get(idSoal) ?? [],
            }))
            .filter((question) => question.opsi.length > 0);

          setAllQuestions(shuffleQuestions(questions).slice(0, MAX_QUESTION_COUNT));
        }

        const mahasiswaId = profile?.idMahasiswa;
        if (!mahasiswaId) return;

        const { data: progressData } = await supabase
          .from("progress_modul")
          .select("id_modul, nilai, selesai")
          .eq("id_mahasiswa", mahasiswaId);
        setMasteryScore(calculateMasteryScore((progressData ?? []) as AdaptiveProgress[]));

      } catch (err) {
        console.error("Gagal memuat ujian:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (profile?.idMahasiswa) {
      fetchQuiz();
    }
  }, [quizId, profile?.idMahasiswa]);

  const questions = useMemo(
    () => selectAdaptiveQuestions(allQuestions, masteryScore),
    [allQuestions, masteryScore],
  );

  const handleSelectOption = (idSoal: number, idJawaban: number) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [idSoal]: idJawaban }));
  };

  // BARU: dipanggil saat tombol "Kumpulkan" ditekan. Tidak langsung
  // mengirim jawaban — hanya menyiapkan pesan & membuka popup konfirmasi.
  const openSubmitConfirmation = () => {
    if (Object.keys(answers).length < questions.length) {
      setConfirmMessage(
        "Masih ada soal yang belum kamu jawab! Yakin ingin mengumpulkan ujian sekarang? Kuis ini tidak bisa diulang setelah dikumpulkan.",
      );
    } else {
      setConfirmMessage(
        "Kuis ini hanya bisa dikerjakan satu kali dan tidak bisa diulang. Yakin ingin mengumpulkan jawabanmu sekarang?",
      );
    }
    setShowConfirmModal(true);
  };

  // Logika pengumpulan jawaban sesungguhnya, dipisah dari popup
  // konfirmasi supaya hanya dijalankan setelah mahasiswa menekan "Ya,
  // Kumpulkan" pada popup.
  const performSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);

    let correctCount = 0;

    questions.forEach(q => {
      const userAnswerId = answers[q.id_soal];
      const correctOption = q.opsi.find(opt => opt.is_benar);
      const isCorrect = correctOption && userAnswerId === correctOption.id_jawaban;

      if (isCorrect) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);

    setResult({
      finalScore,
      correctCount,
      totalQuestions: questions.length,
    });

    // ==========================================
    // TIDAK ADA NILAI MINIMAL. Setiap percobaan
    // (hanya sekali seumur hidup per mahasiswa per
    // kuis) selalu dicatat apa adanya ke riwayat_ujian.
    // XP diberikan berdasarkan jumlah jawaban benar.
    // ==========================================
    if (profile?.idMahasiswa) {
      // Cegah exploit tab ganda / submit dobel
      const { data: checkHistory } = await supabase
        .from('riwayat_ujian')
        .select('id')
        .eq('id_quis', quizId)
        .eq('id_mahasiswa', profile.idMahasiswa)
        .limit(1);

      if (!checkHistory || checkHistory.length === 0) {
        // 1. Tambah XP sesuai jumlah jawaban benar
        const { data: mhsData } = await supabase
          .from('mahasiswa')
          .select('total_xp')
          .eq('id_mahasiswa', profile.idMahasiswa)
          .single();
        const currentXp = mhsData?.total_xp || 0;
        const bonusXp = correctCount * 10; // 1 soal benar = 10 XP

        await supabase
          .from('mahasiswa')
          .update({ total_xp: currentXp + bonusXp })
          .eq('id_mahasiswa', profile.idMahasiswa);

        // 2. Catat riwayat ujian apa adanya (tanpa nilai minimal / pematokan)
        const { error: insertError } = await supabase.from('riwayat_ujian').insert({
          id_quis: Number(quizId),
          id_mahasiswa: profile.idMahasiswa,
          nilai: finalScore,
          lulus: true, // tidak ada lagi konsep lulus/tidak lulus; ditandai selesai
        });

        if (insertError) {
          console.error("Gagal menyimpan riwayat ujian:", insertError);
        }
      }
    }

    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FB]">
        <Loader2 className="w-10 h-10 animate-spin text-[#5B5288] mb-4" />
        <p className="text-[#5B5288] font-bold">Mempersiapkan Lembar Ujian...</p>
      </div>
    );
  }

  // ==========================================
  // Layar Penolakan (Sudah Pernah Mengerjakan)
  // Berlaku untuk nilai berapa pun karena kuis
  // tidak bisa diulang sama sekali.
  // ==========================================
  if (hasTaken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FB] p-4">
        <div className="bg-white rounded-[30px] p-10 md:p-14 shadow-sm border border-gray-100 text-center max-w-lg animate-in zoom-in-95 duration-500">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-50 rounded-full mb-6">
            <ShieldAlert className="w-12 h-12 text-[#39C936]" />
          </div>
          <h2 className="text-2xl font-black text-[#5B5288] mb-4">Ujian Sudah Diselesaikan!</h2>
          <p className="text-gray-500 mb-8 font-medium">
            Kamu sudah pernah mengerjakan kuis ujian ini. Kuis hanya bisa dikerjakan satu kali dan tidak bisa diulang.
          </p>
          <button onClick={() => router.push('/mahasiswa/dashboard')} className="px-8 py-3.5 bg-[#5B5288] text-white font-extrabold rounded-2xl shadow-lg hover:shadow-xl hover:bg-[#4A4373] transition-all hover:-translate-y-1 w-full">
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FB]">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <p className="text-gray-600 font-bold mb-6 text-lg">Ujian ini belum tersedia atau ID Kuis salah.</p>
        <button onClick={() => router.push('/mahasiswa/dashboard')} className="px-6 py-2.5 bg-[#5B5288] text-white font-bold rounded-xl hover:bg-opacity-90 transition-all">
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const late = isPastDeadline(deadline);
  const unansweredCount = questions.length - Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-3xl">

        {/* =====================================================
            HEADER BANNER
        ===================================================== */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] px-6 py-8 shadow-lg shadow-[#3d3466]/25 mb-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Header Banner Background SVGs */}
          <div className="absolute right-[28%] top-6 h-5 w-5 text-white/40">✨</div>
          <div className="absolute right-[8%] top-10 h-4 w-4 text-[#f2c94c] animate-pulse">✨</div>

          {/* Banner Decorative Curved Lines */}
          <div className="pointer-events-none absolute -right-10 top-0 opacity-20">
            <svg width="300" height="200" viewBox="0 0 300 200" fill="none">
              <path d="M50 0 C 150 100, 200 50, 300 200" stroke="white" strokeWidth="3" strokeDasharray="6 6" />
              <circle cx="200" cy="80" r="40" stroke="#f2c94c" strokeWidth="2" />
            </svg>
          </div>

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-[#e2dcff] backdrop-blur-md border border-white/15 shadow-inner mb-2">
              <span className="text-amber-300">📝</span>
              Evaluasi Mandiri
            </span>
            <h1 className="text-2xl font-black leading-snug tracking-wide md:text-3xl">
              Ujian Mandiri
            </h1>
          </div>

          <div className="relative z-10 flex flex-col items-start gap-2 md:items-end">
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-md border border-white/20 shadow-inner">
              Soal {currentIndex + 1} dari {questions.length}
            </span>
            {deadline && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${
                  late ? "bg-rose-500/90 text-white" : "bg-white/15 text-[#e2dcff]"
                }`}
              >
                🗓 Deadline: {formatDeadline(deadline)}
                {late && " (lewat)"}
              </span>
            )}
          </div>

          {/* Bottom Wave Decoration */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 opacity-20">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-full fill-white">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.94,130.83,121.3,201,115.8,241.6,112.5,282.6,98.2,321.39,56.44Z" />
            </svg>
          </div>
        </div>

        {/* Info aturan kuis */}
        {!isSubmitted && (
          <div className="mb-6 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
            ⚠️ Kuis ini hanya bisa dikerjakan <span className="font-black">satu kali</span> dan tidak bisa diulang. Nilai yang tercatat adalah nilai apa adanya dari hasil jawabanmu — tidak ada nilai minimal kelulusan. Pastikan kamu sudah siap sebelum mengumpulkan.
          </div>
        )}

        {!isSubmitted ? (
          <div className="bg-white rounded-[30px] p-8 md:p-10 shadow-sm border border-gray-100">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-8 leading-relaxed">
              {currentQ.teks_soal}
            </h2>

            <div className="space-y-4">
              {currentQ.opsi.map((opt) => {
                const isSelected = answers[currentQ.id_soal] === opt.id_jawaban;
                return (
                  <div
                    key={opt.id_jawaban}
                    onClick={() => handleSelectOption(currentQ.id_soal, opt.id_jawaban)}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.01] ${
                      isSelected
                        ? 'border-[#5B5288] bg-purple-50/50 shadow-sm'
                        : 'border-gray-100 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'border-[#5B5288]' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-3 h-3 bg-[#5B5288] rounded-full animate-in zoom-in duration-200"></div>}
                      </div>
                      <span className={`font-semibold md:text-lg ${isSelected ? 'text-[#5B5288]' : 'text-gray-600'}`}>
                        {opt.teks_jawaban}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-12 pt-6 border-t border-gray-100">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0 || isSubmitting}
                className="px-5 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30 flex items-center gap-2 transition-all"
              >
                <ArrowLeft className="w-5 h-5" /> Sebelumnya
              </button>

              {currentIndex === questions.length - 1 ? (
                <button
                  onClick={openSubmitConfirmation}
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-xl font-black text-white bg-[#39C936] hover:bg-[#2EA32B] shadow-lg hover:shadow-xl flex items-center gap-2 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Kumpulkan <CheckCircle className="w-5 h-5" /></>}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-xl font-bold text-white bg-[#5B5288] hover:bg-[#4A4373] shadow-md flex items-center gap-2 transition-all hover:-translate-y-1 disabled:opacity-50"
                >
                  Selanjutnya <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* =====================================================
              LAYAR HASIL — SELALU MUNCUL SETELAH SUBMIT
              Tidak ada lagi status lulus/tidak lulus atau tombol
              ulangi, karena kuis hanya bisa dikerjakan sekali dan
              nilai dicatat apa adanya tanpa nilai minimal.
          ===================================================== */
          <div className="bg-white rounded-[30px] p-10 md:p-14 shadow-sm border border-gray-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-purple-50 rounded-full mb-6 border-4 border-white shadow-lg">
              <PartyPopper className="w-14 h-14 text-[#5B5288]" />
            </div>

            <h2 className="text-3xl font-black text-[#5B5288] mb-2">Ujian Selesai!</h2>
            <p className="text-gray-500 mb-4 font-medium">
              Jawabanmu sudah tersimpan. Nilai dan XP kamu sudah diperbarui — pantau progresmu lewat halaman Dashboard.
            </p>

            {result && (
              <div className="mb-8 inline-flex items-center gap-2 rounded-2xl bg-[#f8f7fd] px-6 py-3 text-lg font-black text-[#5B5288] ring-1 ring-[#5B5288]/10">
                Nilai Akhir: {result.finalScore}%
              </div>
            )}

            <button
              onClick={() => router.push('/mahasiswa/dashboard')}
              className="mt-2 px-10 py-4 bg-[#5B5288] text-white font-extrabold rounded-2xl shadow-lg hover:shadow-xl hover:bg-[#4A4373] transition-all hover:-translate-y-1 w-full md:w-auto text-lg"
            >
              Kembali ke Dashboard
            </button>
          </div>
        )}

      </div>

      {/* =====================================================
          POPUP KONFIRMASI KUMPULKAN JAWABAN
          Menggantikan window.confirm() bawaan browser supaya
          tampilannya konsisten dengan desain aplikasi.
      ===================================================== */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => !isSubmitting && setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-md rounded-[28px] bg-white p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
                unansweredCount > 0 ? "bg-amber-50" : "bg-purple-50"
              }`}
            >
              <AlertTriangle
                className={`h-8 w-8 ${
                  unansweredCount > 0 ? "text-amber-500" : "text-[#5B5288]"
                }`}
              />
            </div>

            <h3 className="mb-2 text-xl font-black text-[#5B5288]">
              {unansweredCount > 0 ? "Masih Ada Soal Kosong" : "Kumpulkan Jawaban?"}
            </h3>
            <p className="mb-8 text-sm font-medium leading-relaxed text-gray-500">
              {confirmMessage}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <button
                type="button"
                onClick={performSubmit}
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#39C936] px-6 py-3.5 text-sm font-black text-white shadow-lg transition-all hover:bg-[#2EA32B] hover:-translate-y-0.5 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>Ya, Kumpulkan <CheckCircle className="h-4 w-4" /></>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 rounded-xl border-2 bg-[#ef2525] border-gray-100 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#c41111] hover:-translate-y-0.5 disabled:opacity-60"
              >
                Batal, Cek Lagi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
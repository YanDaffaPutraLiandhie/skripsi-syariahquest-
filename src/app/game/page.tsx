"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/lib/supabase";
import {
  getCharacter,
  getExpressionSrc,
  type CharacterId,
  type Expression,
} from "@/lib/game/characterRegistry";
import { formatDialogue } from "@/lib/game/dialogueFormatter";
import {
  getModulState,
  submitAttemptModul,
  simpanRiwayatJawaban,
  type ModulState,
} from "@/lib/remedial";
import {
  VisualNovelScene,
  CharacterSprite,
  DialogueBox,
  ChoiceButton,
  ChapterCompletePanel,
  ResourceHUD,
} from "@/components/visual-novel";
import {
  Sparkles,
  MapPin,
  AlertCircle,
  BookOpen,
  Brain,
  ArrowLeft,
} from "lucide-react";

const AVATAR_KEY = "sq_game_avatar";

type JawabanDB = {
  id_jawaban: number;
  id_soal: number;
  jawaban: string;
  jawaban_benar: boolean;
};

type SoalDB = {
  id_soal: number;
  id_modul: number;
  soal: string;
  jawaban: JawabanDB[];
};

type ModulDetail = {
  id_modul: number;
  nama_modul: string;
  id_level: number;
  parameter_nilai: number;
};

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#140e28] text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500/30 border-t-[#ffc94a]" />
          <span className="ml-3 font-bold text-sm">Memuat Visual Novel...</span>
        </div>
      }
    >
      <GamePageContent />
    </Suspense>
  );
}

function GamePageContent() {
  const router = useRouter();
  const { profile, isLoading: isUserLoading } = useCurrentUser();
  const searchParams = useSearchParams();
  const modulIdParam = searchParams.get("modul");

  // State Avatar & Karakter
  const [avatar, setAvatar] = useState<CharacterId | null>(null);

  // State Data Modul & Soal Aktual
  const [activeModul, setActiveModul] = useState<ModulDetail | null>(null);
  const [questions, setQuestions] = useState<SoalDB[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State Gate Pembelajaran
  const [materiDilihat, setMateriDilihat] = useState<boolean | null>(null);
  const [modulState, setModulState] = useState<ModulState | null>(null);

  // State Visual Novel Flow: 'intro' | 'question' | 'feedback' | 'result'
  const [phase, setPhase] = useState<"intro" | "question" | "feedback" | "result">("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [lastAnswerWasCorrect, setLastAnswerWasCorrect] = useState<boolean | null>(null);

  // Record Jawaban Mahasiswa
  const [recordedAnswers, setRecordedAnswers] = useState<
    Array<{ id_soal: number; id_jawaban: number | null; is_benar: boolean }>
  >([]);

  // State Hasil Akhir
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [finalResult, setFinalResult] = useState<{
    skor: number;
    benarCount: number;
    totalSoal: number;
    lulus: boolean;
    xpDidapat: number;
    eloSesudah: number;
    eloDelta: number;
  } | null>(null);

  // Ambil Avatar Tersimpan
  useEffect(() => {
    if (profile?.authUserId) {
      const saved = localStorage.getItem(`${AVATAR_KEY}_${profile.authUserId}`) as CharacterId | null;
      if (saved) {
        setAvatar(saved);
      } else {
        setAvatar("teacher_female"); // default Aisyah
      }
    }
  }, [profile]);

  // Muat Modul, Gate Materi, Remedial, dan Bank Soal Aktual dari Supabase
  useEffect(() => {
    let isCancelled = false;

    async function loadGameAndQuestions() {
      if (isUserLoading) return;
      setIsLoadingData(true);
      setErrorMessage(null);

      const studentId = profile?.idMahasiswa || 1;

      try {
        let targetModulId: number | null = modulIdParam ? Number(modulIdParam) : null;

        if (!targetModulId) {
          const { data: firstModul } = await supabase
            .from("modul")
            .select("id_modul")
            .eq("status", true)
            .order("id_modul", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (firstModul) {
            targetModulId = firstModul.id_modul;
          }
        }

        if (!targetModulId) {
          targetModulId = 1;
        }

        const [modulRes, progressRes, stateRes, soalRes] = await Promise.all([
          supabase
            .from("modul")
            .select("id_modul, nama_modul, id_level, parameter_nilai")
            .eq("id_modul", targetModulId)
            .maybeSingle(),
          profile?.idMahasiswa
            ? supabase
                .from("progress_modul")
                .select("materi_dilihat")
                .eq("id_mahasiswa", studentId)
                .eq("id_modul", targetModulId)
                .maybeSingle()
            : Promise.resolve({ data: { materi_dilihat: true }, error: null }),
          profile?.idMahasiswa ? getModulState(studentId, targetModulId).catch(() => null) : Promise.resolve(null),
          supabase
            .from("soal")
            .select("id_soal, id_modul, soal, jawaban(id_jawaban, id_soal, jawaban, jawaban_benar)")
            .eq("id_modul", targetModulId),
        ]);

        if (isCancelled) return;

        if (modulRes.data) {
          setActiveModul(modulRes.data as ModulDetail);
        } else {
          setActiveModul({
            id_modul: targetModulId,
            nama_modul: "Pengantar Akad & Fiqih Muamalah",
            id_level: 1,
            parameter_nilai: 75,
          });
        }

        setMateriDilihat(Boolean(progressRes.data?.materi_dilihat ?? true));
        setModulState(stateRes);

        const rawSoal = (soalRes.data ?? []) as any[];
        let formattedQuestions: SoalDB[] = rawSoal.map((s) => ({
          id_soal: s.id_soal,
          id_modul: s.id_modul,
          soal: s.soal,
          jawaban: [...(s.jawaban ?? [])].sort((a, b) => a.id_jawaban - b.id_jawaban),
        }));

        // Fallback studi kasus interaktif jika modul belum memiliki soal di database
        if (formattedQuestions.length === 0) {
          formattedQuestions = [
            {
              id_soal: 101,
              id_modul: targetModulId,
              soal: "Klien UMKM ingin mengajukan permodalan usaha dengan sistem bagi hasil tanpa bunga. Akad syariah manakah yang paling tepat untuk direkomendasikan?",
              jawaban: [
                { id_jawaban: 1, id_soal: 101, jawaban: "Akad Mudharabah atau Musyarakah dengan kesepakatan nisbah di awal", jawaban_benar: true },
                { id_jawaban: 2, id_soal: 101, jawaban: "Pinjaman qardh dengan tambahan bunga tetap 5% per bulan", jawaban_benar: false },
                { id_jawaban: 3, id_soal: 101, jawaban: "Jual beli gharar tanpa kepastian objek barang dagangan", jawaban_benar: false },
                { id_jawaban: 4, id_soal: 101, jawaban: "Sistem talangan dengan denda berbunga harian", jawaban_benar: false },
              ],
            },
            {
              id_soal: 102,
              id_modul: targetModulId,
              soal: "Dalam akad pembiayaan Murabahah, apakah penjual atau bank wajib memberitahukan harga perolehan pokok dan margin keuntungan?",
              jawaban: [
                { id_jawaban: 5, id_soal: 102, jawaban: "Wajib transparan memberitahukan harga beli pokok dan margin laba yang disepakati", jawaban_benar: true },
                { id_jawaban: 6, id_soal: 102, jawaban: "Tidak perlu memberitahukan margin laba kepada pembeli", jawaban_benar: false },
                { id_jawaban: 7, id_soal: 102, jawaban: "Harga pokok boleh disembunyikan agar pihak bank untung lebih besar", jawaban_benar: false },
                { id_jawaban: 8, id_soal: 102, jawaban: "Margin keuntungan ditentukan sepihak saat pelunasan", jawaban_benar: false },
              ],
            },
            {
              id_soal: 103,
              id_modul: targetModulId,
              soal: "Mengapa transaksi jual beli yang mengandung unsur ketidakjelasan berat (Gharar Fahisy) dilarang dalam syariat Islam?",
              jawaban: [
                { id_jawaban: 9, id_soal: 103, jawaban: "Karena berpotensi menimbulkan perselisihan dan merugikan salah satu pihak", jawaban_benar: true },
                { id_jawaban: 10, id_soal: 103, jawaban: "Karena keuntungan yang diperoleh terlalu sedikit", jawaban_benar: false },
                { id_jawaban: 11, id_soal: 103, jawaban: "Karena prosesnya memerlukan waktu lebih lama", jawaban_benar: false },
                { id_jawaban: 12, id_soal: 103, jawaban: "Hanya dilarang jika dilakukan di pasar tradisional", jawaban_benar: false },
              ],
            },
          ];
        }

        setQuestions(formattedQuestions);
      } catch (err: any) {
        console.error("Gagal memuat soal VN:", err);
        if (!isCancelled) {
          setErrorMessage("Terjadi kesalahan saat mempersiapkan soal visual novel.");
        }
      } finally {
        if (!isCancelled) setIsLoadingData(false);
      }
    }

    loadGameAndQuestions();

    return () => {
      isCancelled = true;
    };
  }, [isUserLoading, profile?.idMahasiswa, modulIdParam]);

  // Loading Screens
  if (isUserLoading || isLoadingData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#140e28] text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500/30 border-t-[#ffc94a]" />
        <p className="mt-4 text-sm font-bold tracking-wide text-purple-200">
          Menyiapkan Petualangan Visual Novel...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#140e28] p-6 text-white text-center">
        <p className="text-lg font-bold mb-4">Silakan login untuk mengakses permainan.</p>
        <Link href="/login" className="rounded-xl bg-[#5740a0] px-6 py-2.5 font-bold hover:bg-[#483387]">
          Halaman Login
        </Link>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#140e28] p-6 text-white text-center">
        <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
        <p className="text-lg font-bold mb-4">{errorMessage}</p>
        <Link href="/game/map" className="rounded-xl bg-[#5740a0] px-6 py-2.5 font-bold hover:bg-[#483387]">
          Kembali ke Peta Kota
        </Link>
      </div>
    );
  }

  // Gate 1: Materi Belum Dilihat
  if (activeModul && materiDilihat === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#140e28] p-6 text-white text-center">
        <div className="max-w-md rounded-3xl border border-[#ffc94a]/30 bg-[#21173d] p-8 shadow-2xl backdrop-blur-md">
          <BookOpen className="mx-auto h-12 w-12 text-[#ffc94a] mb-4" />
          <h2 className="text-2xl font-black mb-2 text-white">Materi Belum Selesai</h2>
          <p className="text-sm text-purple-200/80 mb-6 leading-relaxed">
            Untuk memulai kuis cerita modul <strong>{activeModul.nama_modul}</strong>, kamu perlu menyelesaikan materi pembelajarannya terlebih dahulu.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/mahasiswa/modul/${activeModul.id_modul}`}
              className="rounded-xl bg-gradient-to-r from-[#ffc94a] to-amber-500 px-6 py-3 font-black text-[#21173d] shadow-lg hover:brightness-110"
            >
              Buka Materi Modul Sekarang
            </Link>
            <Link href="/game/map" className="text-xs text-purple-300 hover:underline py-1">
              Kembali ke Peta Kota
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Gate 2: Remedial Belum Selesai
  if (activeModul && modulState && modulState.status === "remedial" && !modulState.canRetake) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#140e28] p-6 text-white text-center">
        <div className="max-w-md rounded-3xl border border-rose-400/30 bg-[#21173d] p-8 shadow-2xl backdrop-blur-md">
          <Brain className="mx-auto h-12 w-12 text-rose-400 mb-4 animate-pulse" />
          <h2 className="text-2xl font-black mb-2 text-white">Remedial Diperlukan</h2>
          <p className="text-sm text-purple-200/80 mb-6 leading-relaxed">
            Nilai kuis sebelumnya belum mencapai batas minimal ({modulState.passScore}%). Selesaikan seluruh materi penguatan (remedial) sebelum kamu dapat mengulang kuis modul ini.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/mahasiswa/modul/${activeModul.id_modul}`}
              className="rounded-xl bg-rose-600 px-6 py-3 font-bold text-white shadow-lg hover:bg-rose-700"
            >
              Buka Materi Remedial
            </Link>
            <Link href="/game/map" className="text-xs text-purple-300 hover:underline py-1">
              Kembali ke Peta Kota
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Jika bank soal kosong
  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#140e28] p-6 text-white text-center">
        <div className="max-w-md rounded-3xl border border-white/10 bg-[#21173d] p-8 shadow-2xl backdrop-blur-md">
          <BookOpen className="mx-auto h-12 w-12 text-purple-400 mb-3" />
          <h2 className="text-xl font-bold mb-2">Soal Belum Tersedia</h2>
          <p className="text-sm text-purple-200/70 mb-6">
            Dosen belum menambahkan bank soal evaluasi untuk modul <strong>{activeModul?.nama_modul}</strong>.
          </p>
          <Link href="/game/map" className="rounded-xl bg-[#5740a0] px-6 py-2.5 font-bold hover:bg-[#483387]">
            Kembali ke Peta Kota
          </Link>
        </div>
      </div>
    );
  }

  // Karakter & Dialog Data
  const teacher = getCharacter(avatar || "teacher_female");
  const teacherName = teacher?.name || "Aisyah (Mentor Konsultan)";
  const playerName = profile.namaMahasiswa || "Mahasiswa";
  const currentQ = questions[currentQuestionIndex];

  // Interaksi Pilihan & Submit
  const handleSelectAnswer = (option: JawabanDB) => {
    if (selectedOptionId !== null) return;

    setSelectedOptionId(option.id_jawaban);
    const isCorrect = Boolean(option.jawaban_benar);
    setLastAnswerWasCorrect(isCorrect);

    const newRecord = [
      ...recordedAnswers,
      {
        id_soal: currentQ.id_soal,
        id_jawaban: option.id_jawaban,
        is_benar: isCorrect,
      },
    ];
    setRecordedAnswers(newRecord);
    setPhase("feedback");
  };

  const handleNextStep = async () => {
    setSelectedOptionId(null);
    setLastAnswerWasCorrect(null);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setPhase("question");
    } else {
      await finishQuiz();
    }
  };

  const finishQuiz = async () => {
    if (!activeModul || !profile.idMahasiswa) return;
    setIsSavingResult(true);

    const correctCount = recordedAnswers.filter((a) => a.is_benar).length;
    const finalScore = Math.round((correctCount / questions.length) * 100);
    const passGrade = activeModul.parameter_nilai ?? 75;
    const passed = finalScore >= passGrade;

    try {
      await simpanRiwayatJawaban(profile.idMahasiswa, activeModul.id_modul, recordedAnswers);
      const submitRes = await submitAttemptModul(profile.idMahasiswa, activeModul.id_modul, finalScore);

      setFinalResult({
        skor: finalScore,
        benarCount: correctCount,
        totalSoal: questions.length,
        lulus: passed,
        xpDidapat: submitRes.xpDidapat,
        eloSesudah: submitRes.eloSesudah,
        eloDelta: submitRes.eloDelta,
      });
    } catch (saveErr) {
      console.error("Gagal menyimpan hasil kuis VN:", saveErr);
      setFinalResult({
        skor: finalScore,
        benarCount: correctCount,
        totalSoal: questions.length,
        lulus: passed,
        xpDidapat: passed ? 50 : 0,
        eloSesudah: 1000,
        eloDelta: passed ? 10 : -10,
      });
    } finally {
      setIsSavingResult(false);
      setPhase("result");
    }
  };

  // Ekspresi karakter
  let teacherExpression: Expression = "normal";
  if (phase === "intro") teacherExpression = "smile";
  else if (phase === "question") teacherExpression = "thinking";
  else if (phase === "feedback") {
    teacherExpression = lastAnswerWasCorrect ? "happy" : "sad";
  } else if (phase === "result") {
    teacherExpression = finalResult?.lulus ? "happy" : "disappointed";
  }

  // Teks Dialog
  let dialogText = "";
  let speakerLabel = teacherName;

  if (phase === "intro") {
    dialogText = `Assalamu’alaikum, {{playerName}}! Selamat datang di sesi studi kasus interaktif untuk modul "${activeModul?.nama_modul}". Pilihan analisismu akan menentukan keberhasilan konsultasi syariah ini. Siap untuk memulai?`;
  } else if (phase === "question") {
    dialogText = `Kasus #${currentQuestionIndex + 1}:\n${currentQ?.soal}`;
  } else if (phase === "feedback") {
    const selectedOpt = currentQ?.jawaban.find((j) => j.id_jawaban === selectedOptionId);
    const correctOpt = currentQ?.jawaban.find((j) => j.jawaban_benar);

    if (lastAnswerWasCorrect) {
      dialogText = `Tepat sekali {{playerName}}! Analisismu benar: "${selectedOpt?.jawaban}". Prinsip rukun dan syarat akad terpenuhi dengan baik.`;
    } else {
      dialogText = `Keputusanmu belum tepat, {{playerName}}. Solusi syariah yang benar adalah: "${correctOpt?.jawaban}". Mari ingat kembali batasan rukun akad muamalah.`;
    }
  }

  // Huruf index opsi
  const letters = ["A", "B", "C", "D", "E"];

  // Total XP & Coins dari user
  const totalXp = profile.totalXp || 210;
  const koin = profile.totalPoin || "1.250";
  const badgeCount = profile.modulSelesai || 3;

  return (
    <div className="min-h-screen bg-[#140e28] text-white p-3 sm:p-6 flex flex-col justify-between max-w-5xl mx-auto">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/game/map"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#21173d] border border-purple-500/30 text-xs font-bold text-white hover:bg-[#2d1f52] transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#ffc94a]" />
            <span>Peta Kota</span>
          </Link>
          <div className="text-xs text-purple-200">
            Modul: <b className="text-white">{activeModul?.nama_modul}</b>
          </div>
        </div>

        <ResourceHUD koin={koin} xp={totalXp} badgeCount={badgeCount} />
      </div>

      {/* JIKA FASE RESULT: TAMPILKAN CHAPTER COMPLETE PANEL */}
      {phase === "result" && finalResult ? (
        <div className="my-auto py-6">
          <ChapterCompletePanel
            chapterTitle={activeModul?.nama_modul || "Studi Kasus Modul"}
            isPassed={finalResult.lulus}
            score={finalResult.skor}
            xpEarned={finalResult.xpDidapat}
            passingScore={activeModul?.parameter_nilai ?? 75}
            correctCount={finalResult.benarCount}
            totalQuestions={finalResult.totalSoal}
            onContinue={() => router.push("/game/map")}
            onRemedial={
              !finalResult.lulus && activeModul
                ? () => router.push(`/mahasiswa/modul/${activeModul.id_modul}`)
                : undefined
            }
            onRetry={() => {
              setPhase("intro");
              setCurrentQuestionIndex(0);
              setSelectedOptionId(null);
              setLastAnswerWasCorrect(null);
              setRecordedAnswers([]);
              setFinalResult(null);
            }}
          />
        </div>
      ) : (
        /* FASE VISUAL NOVEL: SCENE + SPRITE + DIALOGUE + CHOICES */
        <div className="flex flex-col gap-4">
          <VisualNovelScene
            backgroundSrc="/game/scene-3.jpg"
            locationLabel="KAMPUS MADANI"
            sceneCaption={`ADEGAN 0${currentQuestionIndex + 1} • STUDI KASUS`}
          >
            {/* Sprite Karakter Siswa & Mentor Pengajar */}
            {phase === "intro" ? (
              <CharacterSprite
                src={getExpressionSrc(avatar, teacherExpression)}
                alt={teacherName}
                name={teacherName}
                position="center"
              />
            ) : (
              <>
                {/* Karakter Klien Mahasiswa (Kiri) */}
                <CharacterSprite
                  src="/game/student-1.png"
                  alt="Rian - Mahasiswa Klien"
                  name="Rian (Mahasiswa)"
                  position="left"
                />

                {/* Karakter Mentor Pengajar (Kanan) */}
                <CharacterSprite
                  src={getExpressionSrc(avatar, teacherExpression)}
                  alt={teacherName}
                  name={teacherName}
                  position="right"
                />
              </>
            )}

            {/* Kotak Dialog */}
            <div className="mt-auto relative z-20">
              <DialogueBox
                speaker={speakerLabel}
                text={formatDialogue(dialogText, playerName)}
                counter={
                  phase === "question" || phase === "feedback"
                    ? `0${currentQuestionIndex + 1} / 0${questions.length}`
                    : undefined
                }
                isFinal={
                  phase === "feedback" &&
                  currentQuestionIndex === questions.length - 1
                }
                nextLabel={
                  phase === "intro"
                    ? "Mulai Kasus →"
                    : phase === "feedback" && currentQuestionIndex === questions.length - 1
                    ? "Selesaikan Bab ✓"
                    : "Lanjutkan →"
                }
                showNextButton={phase === "intro" || phase === "feedback"}
                onNext={() => {
                  if (phase === "intro") {
                    setPhase("question");
                  } else if (phase === "feedback") {
                    handleNextStep();
                  }
                }}
              />
            </div>
          </VisualNovelScene>

          {/* Area Interaksi Pilihan Jawaban */}
          {phase === "question" && currentQ && (
            <div className="rounded-2xl border border-purple-500/30 bg-[#21173d]/90 p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3 text-xs font-bold text-purple-200">
                <span className="flex items-center gap-1.5 text-[#ffc94a]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pilih Solusi / Keputusan Terbaik:</span>
                </span>
                <span>Pilih salah satu opsi</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQ.jawaban.map((opt, idx) => (
                  <ChoiceButton
                    key={opt.id_jawaban}
                    indexLetter={letters[idx] || `${idx + 1}`}
                    text={opt.jawaban}
                    isSelected={selectedOptionId === opt.id_jawaban}
                    onClick={() => handleSelectAnswer(opt)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <footer className="mt-4 pt-3 border-t border-purple-900/40 text-center text-[10px] font-black tracking-widest text-purple-300/60 uppercase">
        SYARIAH-QUEST <span>•</span> VISUAL NOVEL PEMBELAJARAN ADAPTIF
      </footer>
    </div>
  );
}

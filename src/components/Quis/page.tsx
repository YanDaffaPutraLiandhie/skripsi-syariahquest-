"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/lib/supabase";
import { checkAndAwardModulBadges, type EarnedBadge } from "@/lib/badges";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { calculateMasteryScore, selectAdaptiveQuestions, shuffleQuestions, MAX_QUESTION_COUNT, type AdaptiveProgress } from "@/lib/adaptiveLearning";

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

type QuizProps = {
  onClaimXP?: (score: number) => void;
  idModul: number;
  initialScore?: number | null;
  passingGrade: number;
};

export default function Quiz({ onClaimXP, idModul, initialScore, passingGrade }: QuizProps) {
  const { profile } = useCurrentUser();
  
  const [allQuestions, setAllQuestions] = useState<SoalDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [levelModul, setLevelModul] = useState<number>(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);
  const [newBadges, setNewBadges] = useState<EarnedBadge[]>([]);
  const [masteryScore, setMasteryScore] = useState(0);

  const PASSING_GRADE = Math.min(100, Math.max(0, passingGrade));

  const getBaseXpByLevel = (level: number) => {
    if (level === 2) return 50;
    if (level === 3) return 100;
    return 20;
  };

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      const { data: dataSoal, error: errSoal } = await supabase
        .from('soal')
        .select('*, jawaban(*)')
        .eq('id_modul', idModul)
        .limit(MAX_QUESTION_COUNT);

      if (dataSoal && !errSoal) {
        const shuffledQuestions = shuffleQuestions(dataSoal).slice(0, MAX_QUESTION_COUNT);
        setAllQuestions(shuffledQuestions);
      } else {
        console.error("Gagal memuat soal:", errSoal);
      }

      const { data: dataModul } = await supabase
        .from('modul')
        .select('id_level')
        .eq('id_modul', idModul)
        .single();
      
      if (dataModul) {
        setLevelModul(dataModul.id_level);
      }

      if (profile?.idMahasiswa) {
        const { data: progressData } = await supabase
          .from("progress_modul")
          .select("id_modul, nilai, selesai")
          .eq("id_mahasiswa", profile.idMahasiswa);
        setMasteryScore(calculateMasteryScore((progressData ?? []) as AdaptiveProgress[]));
      }

      setIsLoading(false);
    }

    if (idModul) fetchData();
  }, [idModul, profile?.idMahasiswa]);

  const questions = useMemo(
    () => selectAdaptiveQuestions(allQuestions, masteryScore),
    [allQuestions, masteryScore],
  );

  const handleSelectOption = (optionIndex: number) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: optionIndex });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      processFinishQuiz();
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1);
  };

  const processFinishQuiz = async () => {
    setIsSaving(true);
    let correctCount = 0;
    
    questions.forEach((q, index) => {
      const selectedJawabanIndex = selectedAnswers[index];
      if (selectedJawabanIndex !== undefined) {
        if (q.jawaban[selectedJawabanIndex].jawaban_benar) {
          correctCount++;
        }
      }
    });

    const scorePercentage = Math.round((correctCount / questions.length) * 100);
    const isPassed = scorePercentage >= PASSING_GRADE;

    const baseXp = getBaseXpByLevel(levelModul);
    const isRetry = initialScore !== null && initialScore !== undefined;
    const earnedPoints = Math.round(baseXp * (isRetry ? 0.5 : 1));

    if (profile?.idMahasiswa) {
      try {
        await supabase.from('progress_modul').upsert({
          id_mahasiswa: profile.idMahasiswa,
          id_modul: idModul,
          nilai: scorePercentage,
          selesai: isPassed,
          kuis_dicoba: true,      
          materi_dilihat: true,   
          tanggal_selesai: new Date().toISOString()
        }, { onConflict: 'id_mahasiswa, id_modul' });

        if (isPassed) {
          const { data: mhsData } = await supabase
            .from('mahasiswa')
            .select('total_xp')
            .eq('id_mahasiswa', profile.idMahasiswa)
            .single();

          const currentXp = mhsData?.total_xp || 0;
          await supabase
            .from('mahasiswa')
            .update({ total_xp: currentXp + earnedPoints })
            .eq('id_mahasiswa', profile.idMahasiswa);

          const earned = await checkAndAwardModulBadges(profile.idMahasiswa);
          if (earned.length > 0) {
            setNewBadges(earned);
          }
        }
      } catch (err) {
        console.error("Gagal menyimpan progress:", err);
      }
    }

    setIsSaving(false);
    setIsFinished(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl shadow-sm border border-slate-100">
        <Loader2 className="w-10 h-10 text-[#3A2E65] animate-spin" />
        <p className="text-[#3A2E65] font-bold">Mempersiapkan Soal Kuis...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-white rounded-3xl shadow-sm border border-slate-100">
        <p className="text-xl font-bold text-slate-400">Belum Ada Kuis</p>
        <p className="text-sm text-slate-500">Dosen belum menambahkan soal untuk modul ini.</p>
      </div>
    );
  }

  // UI RETAKE (Kesan bersih modern)
  if (initialScore !== null && initialScore !== undefined && !isRetaking && !isFinished) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 gap-6 text-center w-full max-w-md mx-auto bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100">
        <div className="w-24 h-24 bg-[#10B981]/10 text-[#10B981] rounded-full flex items-center justify-center mb-2">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-[#3A2E65] mb-2">Kuis Telah Diselesaikan</h2>
          <p className="text-slate-500 text-sm">Kamu sudah lulus kuis evaluasi ini sebelumnya dengan nilai:</p>
          <div className="text-5xl font-black text-[#10B981] mt-4">{initialScore}%</div>
        </div>
        <button
          onClick={() => setIsRetaking(true)}
          className="mt-6 w-full py-3.5 px-6 bg-[#FBBF24] hover:bg-[#F59E0B] text-[#3A2E65] font-bold rounded-xl transition-all shadow-sm"
        >
          Ulangi Kuis
        </button>
      </div>
    );
  }

  // =========================================================
  // UI FINISHED / HASIL KUIS (Sudah di-redesign ala Dashboard)
  // =========================================================
  if (isFinished) {
    const totalQuestions = questions.length;
    let correctCount = 0;
    
    questions.forEach((q, index) => {
      const selectedJawabanIndex = selectedAnswers[index];
      if (selectedJawabanIndex !== undefined && q.jawaban[selectedJawabanIndex]?.jawaban_benar) {
        correctCount++;
      }
    });

    const wrongCount = totalQuestions - correctCount;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const isPassed = scorePercentage >= PASSING_GRADE;

    const baseXp = getBaseXpByLevel(levelModul);
    const isRetry = initialScore !== null && initialScore !== undefined;
    const earnedPoints = Math.round(baseXp * (isRetry ? 0.5 : 1));

    const displayAvatar = profile?.avatarUrl || "https://api.dicebear.com/7.x/micah/svg?seed=Pemain&backgroundColor=transparent";
    const displayName = profile?.namaMahasiswa || "Pemain Misterius";

    return (
      <div className="relative -m-4 flex min-h-[650px] w-full flex-col overflow-hidden rounded-3xl border border-[#e4e2ee] bg-[#f8f7fd] p-5 text-[#2b2540] shadow-[0_8px_30px_rgb(61,52,102,0.12)] sm:p-6 md:m-0 md:p-10">
        
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] px-4 py-6 text-center text-white shadow-lg shadow-[#3d3466]/20 sm:px-6">
          <h1 className="text-2xl font-extrabold sm:text-3xl md:text-4xl">
          {isPassed 
            ? `Selamat! Kamu Meraih +${earnedPoints} XP`
            : "Yah, Nilaimu Belum Cukup :("}
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#e2dcff]">
            Nilai kamu {scorePercentage}% dari batas lulus {PASSING_GRADE}%
          </p>
        </div>

        {newBadges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 mb-4 max-w-xl mx-auto w-full mt-4">
            {newBadges.map((badge, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#FBBF24]/20 text-[#3A2E65] rounded-2xl px-4 py-3 shadow-sm border border-[#FBBF24]/30">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex-shrink-0">
                  <img src={badge.icon_url} alt={badge.nama_badge} className="w-full h-full object-contain p-1" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">Badge Baru!</span>
                  <span className="font-extrabold text-sm">{badge.nama_badge}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <Link href="/profile" className="flex flex-col items-center justify-center gap-2 mb-8 w-fit mx-auto group cursor-pointer mt-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full overflow-hidden shadow-sm border-2 border-[#E2E8F0] flex-shrink-0 group-hover:scale-105 transition-transform">
            <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover p-1" />
          </div>
          <span className="text-lg font-bold text-[#3d3466] transition-colors group-hover:text-[#5B5288]">{displayName}</span>
        </Link>

        {/* Progress Bar & Stats - Clean Style */}
        <div className="max-w-xl mx-auto w-full mb-10 space-y-5">
          <div className="h-3 bg-slate-100 rounded-full relative overflow-hidden">
            <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${isPassed ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} style={{ width: `${scorePercentage}%` }}></div>
          </div>
          <div className="flex justify-center gap-4 w-full">
            <div className="bg-[#10B981] text-white font-bold py-3 px-2 rounded-2xl flex-1 text-center shadow-sm text-sm md:text-base">{correctCount} benar</div>
            <div className="bg-[#EF4444] text-white font-bold py-3 px-2 rounded-2xl flex-1 text-center shadow-sm text-sm md:text-base">{wrongCount} salah</div>
            <div className="flex-1 rounded-2xl bg-[#e8e4f5] px-2 py-3 text-center text-sm font-black text-[#3d3466] shadow-sm md:text-base">{scorePercentage}%</div>
          </div>
        </div>

        <h2 className="mb-4 text-center text-xl font-extrabold text-[#3d3466]">Review Kuis</h2>
        
        <div className="mx-auto flex h-[400px] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-2xl bg-[#eeebf7] p-3 pb-28 no-scrollbar sm:p-4">
          {questions.map((q, i) => {
            const selectedJawabanIndex = selectedAnswers[i];
            const isCorrect = selectedJawabanIndex !== undefined && q.jawaban[selectedJawabanIndex]?.jawaban_benar;
            const borderClass = isCorrect ? "border-l-4 border-l-[#10B981]" : "border-l-4 border-l-[#EF4444]";
            
            return (
              <div key={i} className={`relative rounded-2xl border border-[#e4e2ee] bg-white p-4 text-[#2b2540] shadow-sm sm:p-5 ${borderClass}`}>
                <h3 className="mb-4 pr-8 text-[15px] font-bold leading-relaxed text-[#3d3466]">{i + 1}. {q.soal}</h3>
                <div className="flex flex-col gap-2 pl-2">
                  {q.jawaban.map((opt, optIdx) => {
                    let textStyle = "text-[#5b6072] text-sm px-3 py-1.5";
                    if (isCorrect && opt.jawaban_benar) {
                      textStyle = "text-[#10B981] font-bold text-sm bg-[#10B981]/10 px-3 py-1.5 rounded-lg w-fit";
                    } else if (optIdx === selectedJawabanIndex && !isCorrect) {
                      textStyle = "text-[#EF4444] font-bold text-sm bg-[#EF4444]/10 px-3 py-1.5 rounded-lg w-fit";
                    }
                    return <span key={optIdx} className={textStyle}>{String.fromCharCode(97 + optIdx)}. {opt.jawaban}</span>;
                  })}
                </div>
                <div className="absolute top-5 right-5">
                  {isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
                  ) : (
                    <XCircle className="w-6 h-6 text-[#EF4444]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Action Buttons */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center gap-3 rounded-b-3xl bg-gradient-to-t from-[#f8f7fd] via-[#f8f7fd] to-transparent px-5 pb-5 pt-12 sm:px-8">
          {!isPassed && (
             <div className="text-[#EF4444] text-sm font-bold mb-1">
               *Syarat lulus: {PASSING_GRADE}%. Silakan coba lagi.
             </div>
          )}
          <div className="flex gap-4">
             <button
               onClick={() => { setIsFinished(false); setCurrentQuestion(0); setSelectedAnswers({}); setIsRetaking(true); }}
               className="bg-slate-100 text-slate-600 font-bold py-3 px-8 rounded-xl hover:bg-slate-200 transition-all text-center min-w-[140px]"
             >
               Ulangi
             </button>
             {isPassed && (
               <button
                 onClick={() => onClaimXP && onClaimXP(scorePercentage)}
                 className="bg-[#FBBF24] hover:bg-[#F59E0B] text-[#3A2E65] font-extrabold py-3 px-8 rounded-xl shadow-sm transition-all text-center min-w-[140px]"
               >
                 {initialScore ? "Kembali" : "Klaim XP"}
               </button>
             )}
          </div>
        </div>

      </div>
    );
  }

  // =========================================================
  // UI SOAL KUIS AKTIF
  // =========================================================
  const q = questions[currentQuestion];
  const progressPercent = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto py-6 px-4 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-50">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pertanyaan {currentQuestion + 1} dari {questions.length}</span>
          <span className="text-sm font-extrabold text-[#3A2E65]">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#FBBF24] rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>
      <h2 className="text-2xl md:text-3xl font-extrabold text-[#3A2E65] mb-8 leading-snug">{q.soal}</h2>
      <div className="space-y-4 flex-1">
        {q.jawaban.map((opt, index) => {
          const isSelected = selectedAnswers[currentQuestion] === index;
          return (
            <button key={index} onClick={() => handleSelectOption(index)} className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 group ${isSelected ? "border-[#3A2E65] bg-[#3A2E65]/5 shadow-sm" : "border-slate-100 hover:border-[#3A2E65]/30 hover:bg-slate-50"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${isSelected ? "bg-[#3A2E65] text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"}`}>{String.fromCharCode(65 + index)}</div>
              <span className={`font-semibold text-[15px] ${isSelected ? "text-[#3A2E65]" : "text-slate-600"}`}>{opt.jawaban}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-100">
        <button onClick={handlePrev} disabled={currentQuestion === 0 || isSaving} className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-[#3A2E65] disabled:opacity-30 transition-colors">Sebelumnya</button>
        

        {/*    */}
        <button 
          onClick={handleNext} 
          disabled={selectedAnswers[currentQuestion] === undefined || isSaving} 
          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#3A2E65] text-white text-sm font-bold rounded-xl hover:bg-[#2A214D] transition-colors disabled:opacity-50 shadow-md min-w-[160px]"
        >
          {isSaving ? <><Loader2 className="w-4 h-4 animate-spin"/> Merekap...</> : currentQuestion === questions.length - 1 ? "Selesai & Cek Nilai" : "Selanjutnya"}
        </button>
      </div>
    </div>
  );
}
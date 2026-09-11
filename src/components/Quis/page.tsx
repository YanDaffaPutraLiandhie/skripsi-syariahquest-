"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/lib/supabase";
import { checkAndAwardModulBadges, type EarnedBadge } from "@/lib/badges";
import { Loader2, CheckCircle2 } from "lucide-react";
import { calculateMasteryScore, selectAdaptiveQuestions, type AdaptiveProgress } from "@/lib/adaptiveLearning";

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

export default function Quiz({ onClaimXP, idModul, initialScore }: { onClaimXP?: (score: number) => void, idModul: number, initialScore?: number | null }) {
  const { profile } = useCurrentUser();
  
  const [allQuestions, setAllQuestions] = useState<SoalDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // BARU: Menyimpan informasi level modul untuk perhitungan XP dinamis
  const [levelModul, setLevelModul] = useState<number>(1);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);
  const [newBadges, setNewBadges] = useState<EarnedBadge[]>([]);
  const [masteryScore, setMasteryScore] = useState(0);

  const PASSING_GRADE = 70;

  const getBaseXpByLevel = (level: number) => {
    if (level === 2) return 50;
    if (level === 3) return 100;
    return 20;
  };

  // 1. FETCH SOAL & LEVEL MODUL DARI DATABASE
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      // Fetch Soal
      const { data: dataSoal, error: errSoal } = await supabase
        .from('soal')
        .select('*, jawaban(*)')
        .eq('id_modul', idModul);

      if (dataSoal && !errSoal) {
        setAllQuestions(dataSoal);
      } else {
        console.error("Gagal memuat soal:", errSoal);
      }

      // Fetch Level Modul
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

  // 2. PROSES PENILAIAN & SIMPAN KE DATABASE
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

  // --- TAMPILAN LOADING SOAL ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-10 h-10 text-[#5B5288] animate-spin" />
        <p className="text-[#5B5288] font-bold">Mempersiapkan Soal Kuis...</p>
      </div>
    );
  }

  // --- JIKA DOSEN BELUM MEMBUAT SOAL ---
  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <p className="text-xl font-bold text-gray-400">Belum Ada Kuis</p>
        <p className="text-sm text-gray-500">Dosen belum menambahkan soal untuk modul ini.</p>
      </div>
    );
  }

  // --- TAMPILAN JIKA SUDAH PERNAH LULUS TAPI BELUM KLIK "RETAKE" ---
  if (initialScore !== null && initialScore !== undefined && !isRetaking && !isFinished) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center w-full max-w-md mx-auto">
        <div className="w-24 h-24 bg-green-100 text-[#39C936] rounded-full flex items-center justify-center mb-2 shadow-inner">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#5B5288] mb-2">Kuis Telah Diselesaikan</h2>
          <p className="text-gray-500 text-sm">Kamu sudah lulus kuis evaluasi ini sebelumnya dengan nilai:</p>
          <div className="text-5xl font-black text-[#39C936] mt-4">{initialScore}%</div>
        </div>
        <button
          onClick={() => setIsRetaking(true)}
          className="mt-8 w-full py-3.5 px-6 bg-[#E6E4F0] text-[#5B5288] font-bold rounded-xl hover:bg-[#D6D2E7] transition-all border-2 border-transparent hover:border-[#5B5288]/20 shadow-sm"
        >
          Ulangi Kuis
        </button>
      </div>
    );
  }

  // --- TAMPILAN JIKA KUIS SELESAI ---
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
      <div className="flex flex-col bg-black/60 bg-[url('/images/bg-login.jpg')] bg-cover bg-center bg-blend-overlay w-full min-h-[650px] rounded-3xl p-8 relative text-white shadow-xl overflow-hidden -m-4 md:m-0">
        
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 mt-4 drop-shadow-md">
          {isPassed 
            ? (initialScore ? `Selamat! Kamu Meraih +${earnedPoints} XP` : `Selamat! Kamu Meraih +${earnedPoints} XP`) 
            : "Yah, Nilaimu Belum Cukup :("}
        </h1>

        {newBadges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 mb-6 max-w-xl mx-auto w-full">
            {newBadges.map((badge, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-[#DDE225]/90 text-[#5B5288] rounded-2xl px-4 py-3 shadow-lg border border-white/20 animate-fade-in-up"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white flex-shrink-0 shadow-sm">
                  <img src={badge.icon_url} alt={badge.nama_badge} className="w-full h-full object-contain p-1" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold uppercase tracking-wide opacity-70">Badge Baru!</span>
                  <span className="font-extrabold text-sm">{badge.nama_badge}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <Link href="/profile" className="flex items-center justify-center gap-4 mb-8 w-fit mx-auto group hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="w-16 h-16 bg-[#769FCD] rounded-full overflow-hidden shadow-md border-2 border-white/10 flex-shrink-0 group-hover:border-white/40 transition-colors">
            <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover p-1" />
          </div>
          <span className="text-xl md:text-2xl font-bold drop-shadow-md group-hover:text-[#DDE225] transition-colors">{displayName}</span>
        </Link>

        <div className="max-w-xl mx-auto w-full mb-8 space-y-5">
          <div className="h-2.5 bg-white/20 rounded-full relative backdrop-blur-sm">
            <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${isPassed ? 'bg-[#39C936]' : 'bg-[#E73131]'}`} style={{ width: `${scorePercentage}%` }}></div>
            <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm transition-all duration-1000 ${isPassed ? 'bg-[#39C936]' : 'bg-[#E73131]'}`} style={{ left: `calc(${scorePercentage}% - 8px)` }}></div>
          </div>
          <div className="flex justify-center gap-4 w-full">
            <div className="bg-[#39C936] text-white font-bold py-2.5 px-2 rounded-xl flex-1 text-center shadow-md border border-white/10 text-sm md:text-base">{correctCount} benar</div>
            <div className="bg-[#E73131] text-white font-bold py-2.5 px-2 rounded-xl flex-1 text-center shadow-md border border-white/10 text-sm md:text-base">{wrongCount} salah</div>
            <div className="bg-white text-[#5B5288] font-black py-2.5 px-2 rounded-xl flex-1 text-center shadow-md border border-white/10 text-sm md:text-base">{scorePercentage}%</div>
          </div>
        </div>

        <h2 className="text-center text-xl font-bold mb-6 drop-shadow-md">Review Kuis</h2>
        
        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full pb-32 overflow-y-auto no-scrollbar h-[400px] px-2 md:px-6">
          {questions.map((q, i) => {
            const selectedJawabanIndex = selectedAnswers[i];
            const isCorrect = selectedJawabanIndex !== undefined && q.jawaban[selectedJawabanIndex]?.jawaban_benar;
            const borderClass = isCorrect ? "border-b-4 border-b-[#39C936]" : "border-b-4 border-b-[#E73131]";
            
            return (
              <div key={i} className={`bg-white/95 backdrop-blur-md rounded-2xl p-6 text-[#5B5288] relative shadow-lg ${borderClass}`}>
                <h3 className="font-bold text-[15px] mb-4 pr-10">{i + 1}. {q.soal}</h3>
                <div className="flex flex-col gap-1.5 pl-4">
                  {q.jawaban.map((opt, optIdx) => {
                    let textStyle = "text-[#5B5288]/70 text-sm";
                    if (opt.jawaban_benar) textStyle = "text-[#39C936] font-bold text-sm";
                    else if (optIdx === selectedJawabanIndex && !isCorrect) textStyle = "text-[#E73131] font-bold text-sm";
                    
                    return <span key={optIdx} className={textStyle}>{String.fromCharCode(97 + optIdx)}. {opt.jawaban}</span>;
                  })}
                </div>
                <div className="absolute bottom-6 right-6">
                  {isCorrect ? (
                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#39C936] fill-current shadow-sm rounded-full bg-white border border-gray-100"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#E73131] fill-current shadow-sm rounded-full bg-white border border-gray-100"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-8 right-8 flex flex-col items-end gap-3 z-10">
          {!isPassed && (
             <div className="bg-black/40 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-bold border border-white/20 mb-1 shadow-lg">
               *Syarat lulus: {PASSING_GRADE}%. Silakan coba lagi.
             </div>
          )}
          <button 
            onClick={() => { setIsFinished(false); setCurrentQuestion(0); setSelectedAnswers({}); setIsRetaking(true); }}
            className="bg-[#DDE225] text-[#5B5288] font-extrabold py-3 px-8 rounded-xl shadow-xl border border-white/20 hover:scale-105 transition-all text-center w-40"
          >
            Ulangi
          </button>
          {isPassed && (
            <button 
              onClick={() => onClaimXP && onClaimXP(scorePercentage)}
              className="bg-[#39C936] text-white font-extrabold py-3 px-8 rounded-xl shadow-xl border border-white/20 hover:scale-105 transition-all text-center w-40"
            >
              {initialScore ? "Kembali" : "Klaim XP"}
            </button>
          )}
        </div>

      </div>
    );
  }

  // --- TAMPILAN SOAL KUIS BERJALAN ---
  const q = questions[currentQuestion];
  const progressPercent = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto py-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Pertanyaan {currentQuestion + 1} dari {questions.length}</span>
          <span className="text-sm font-bold text-[#5B5288]">{progressPercent}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#5B5288] rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-8 leading-snug">{q.soal}</h2>
      <div className="space-y-4 flex-1">
        {q.jawaban.map((opt, index) => {
          const isSelected = selectedAnswers[currentQuestion] === index;
          return (
            <button key={index} onClick={() => handleSelectOption(index)} className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 group ${isSelected ? "border-[#5B5288] bg-[#5B5288]/5 shadow-sm" : "border-gray-200 hover:border-[#5B5288]/40 hover:bg-gray-50"}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${isSelected ? "bg-[#5B5288] text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"}`}>{String.fromCharCode(65 + index)}</div>
              <span className={`font-medium text-[15px] ${isSelected ? "text-[#5B5288]" : "text-gray-600"}`}>{opt.jawaban}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
        <button onClick={handlePrev} disabled={currentQuestion === 0 || isSaving} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-[#5B5288] disabled:opacity-30 disabled:hover:text-gray-500 transition-colors">Sebelumnya</button>
        
        <button 
          onClick={handleNext} 
          disabled={selectedAnswers[currentQuestion] === undefined || isSaving} 
          className="flex items-center gap-2 px-8 py-3 bg-[#5B5288] text-white text-sm font-bold rounded-xl hover:bg-opacity-90 transition-colors disabled:opacity-50 shadow-sm"
        >
          {isSaving ? <><Loader2 className="w-4 h-4 animate-spin"/> Menyimpan...</> : currentQuestion === questions.length - 1 ? "Selesai & Cek Nilai" : "Selanjutnya"}
        </button>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle, XCircle, ShieldAlert } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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
  soal: { soal: string }[];
  jawaban: { jawaban: string; jawaban_benar: boolean }[];
}

export default function UjianPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = use(params);
  const router = useRouter();
  const { profile } = useCurrentUser();

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  
  // ==========================================
  // STATE BARU: Penjaga Gerbang Kuis
  // ==========================================
  const [hasPassed, setHasPassed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchQuiz() {
      setIsLoading(true);
      try {
        // 1. CEK KEAMANAN: Apakah mahasiswa ini sudah pernah mengerjakan kuis ini?
        if (profile?.idMahasiswa) {
          const { data: historyData } = await supabase
            .from('riwayat_ujian') // <-- SEKARANG PAKAI TABEL BARU
            .select('id')
            .eq('id_quis', quizId)
            .eq('id_mahasiswa', profile.idMahasiswa)
            .limit(1);

          if (historyData && historyData.length > 0) {
            setHasPassed(true); // Gembok aktif! Mahasiswa sudah pernah ngerjain.
            setIsLoading(false);
            return; 
          }
        }

        // 2. Kalau belum mengerjakan, tarik data soal dari detail_kuis
        const { data, error } = await supabase
          .from('detail_kuis')
          .select(`
            id_soal,
            id_jawaban,
            soal ( soal ),
            jawaban ( jawaban, jawaban_benar )
          `)
          .eq('id_quis', quizId);

        if (error) throw error;

        if (data) {
          const qMap = new Map<number, Question>();
          
          data.forEach((row: DetailKuisRow) => {
            const soal = row.soal?.[0];
            const jawaban = row.jawaban?.[0];
            if (!qMap.has(row.id_soal)) {
              qMap.set(row.id_soal, {
                id_soal: row.id_soal,
                teks_soal: soal?.soal || "Teks soal tidak tersedia",
                opsi: []
              });
            }
            
            if (jawaban) {
              qMap.get(row.id_soal)?.opsi.push({
                id_jawaban: row.id_jawaban,
                teks_jawaban: jawaban.jawaban,
                is_benar: jawaban.jawaban_benar
              });
            }
          });

          setAllQuestions(Array.from(qMap.values()));
        }

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

  const questions = allQuestions;

  const handleSelectOption = (idSoal: number, idJawaban: number) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [idSoal]: idJawaban }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      if (!confirm("Masih ada soal yang belum kamu jawab! Yakin ingin mengumpulkan ujian sekarang?")) {
        return;
      }
    }

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
    setScore(finalScore);
    
    // ==========================================
    // SISTEM PENGAMAN BACKEND (Cegah Exploit Tab Ganda)
    // ==========================================
    if (profile?.idMahasiswa) {
      const { data: checkHistory } = await supabase
        .from('riwayat_ujian') // <-- CEK KE TABEL BARU
        .select('id')
        .eq('id_quis', quizId)
        .eq('id_mahasiswa', profile.idMahasiswa)
        .limit(1);

      // Kalau beneran belum ada datanya, baru kasih reward!
      if (!checkHistory || checkHistory.length === 0) {
        
        // 1. Tambah XP
        const { data: mhsData } = await supabase.from('mahasiswa').select('total_xp').eq('id_mahasiswa', profile.idMahasiswa).single();
        const currentXp = mhsData?.total_xp || 0;
        const bonusXp = correctCount * 10; // 1 soal benar = 10 XP
        
        await supabase.from('mahasiswa').update({ total_xp: currentXp + bonusXp }).eq('id_mahasiswa', profile.idMahasiswa);

        // 2. Kunci Gembok: Catat nilai akhir ke riwayat_ujian
        const { error: insertError } = await supabase.from('riwayat_ujian').insert({
          id_quis: Number(quizId),
          id_mahasiswa: profile.idMahasiswa,
          nilai: finalScore
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
  // UI BARU: Layar Penolakan (Sudah Pernah Lulus)
  // ==========================================
  if (hasPassed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FB] p-4">
        <div className="bg-white rounded-[30px] p-10 md:p-14 shadow-sm border border-gray-100 text-center max-w-lg animate-in zoom-in-95 duration-500">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-50 rounded-full mb-6">
            <ShieldAlert className="w-12 h-12 text-[#39C936]" />
          </div>
          <h2 className="text-2xl font-black text-[#5B5288] mb-4">Ujian Sudah Diselesaikan!</h2>
          <p className="text-gray-500 mb-8 font-medium">
            Kamu sudah pernah mengerjakan dan mendapatkan poin XP dari kuis ujian ini. Ujian tidak bisa diulang untuk mencegah eksploitasi poin.
          </p>
          <button onClick={() => router.push('/dashboard')} className="px-8 py-3.5 bg-[#5B5288] text-white font-extrabold rounded-2xl shadow-lg hover:shadow-xl hover:bg-[#4A4373] transition-all hover:-translate-y-1 w-full">
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
        <button onClick={() => router.push('/dashboard')} className="px-6 py-2.5 bg-[#5B5288] text-white font-bold rounded-xl hover:bg-opacity-90 transition-all">
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

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
              Ujian Mandiri (#{quizId})
            </h1>
          </div>

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-md border border-white/20 shadow-inner">
              Soal {currentIndex + 1} dari {questions.length}
            </span>
          </div>

          {/* Bottom Wave Decoration */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 opacity-20">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-full fill-white">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.94,130.83,121.3,201,115.8,241.6,112.5,282.6,98.2,321.39,56.44Z" />
            </svg>
          </div>
        </div>

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
                  onClick={handleSubmit}
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
          <div className="bg-white rounded-[30px] p-10 md:p-14 shadow-sm border border-gray-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-gray-50 rounded-full mb-6 border-4 border-white shadow-lg">
              {score >= 70 ? (
                <CheckCircle className="w-14 h-14 text-[#39C936]" />
              ) : (
                <XCircle className="w-14 h-14 text-red-500" />
              )}
            </div>
            
            <h2 className="text-3xl font-black text-[#5B5288] mb-2">Ujian Selesai!</h2>
            <p className="text-gray-500 mb-8 font-medium">Ini dia hasil kerja kerasmu:</p>
            
            <div className="text-7xl font-black text-[#FFC107] mb-8 drop-shadow-sm">
              {score}
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl mb-10 flex justify-center gap-12 max-w-sm mx-auto border border-gray-100 shadow-inner">
               <div className="text-center">
                 <p className="text-sm text-gray-500 font-bold mb-1 uppercase tracking-wider">Benar</p>
                 <p className="text-3xl font-black text-[#39C936]">
                   {questions.filter(q => q.opsi.find(o => o.is_benar)?.id_jawaban === answers[q.id_soal]).length}
                 </p>
               </div>
               <div className="w-px bg-gray-300"></div>
               <div className="text-center">
                 <p className="text-sm text-gray-500 font-bold mb-1 uppercase tracking-wider">Salah</p>
                 <p className="text-3xl font-black text-red-500">
                   {questions.filter(q => q.opsi.find(o => o.is_benar)?.id_jawaban !== answers[q.id_soal]).length}
                 </p>
               </div>
            </div>

            <button 
              onClick={() => router.push('/dashboard')}
              className="px-10 py-4 bg-[#5B5288] text-white font-extrabold rounded-2xl shadow-lg hover:shadow-xl hover:bg-[#4A4373] transition-all hover:-translate-y-1 w-full md:w-auto text-lg"
            >
              Kembali ke Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
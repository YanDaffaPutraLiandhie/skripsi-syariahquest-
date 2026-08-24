"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle, XCircle } from "lucide-react";
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

export default function UjianPage({ params }: { params: Promise<{ id: string }> }) {
  // Mengambil id_quis dari URL, misal: /kuis/100
  const { id: quizId } = use(params);
  const router = useRouter();
  const { profile } = useCurrentUser();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Map untuk menyimpan status jawaban (id_soal -> id_jawaban)
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    async function fetchQuiz() {
      setIsLoading(true);
      try {
        // Tarik data dari tabel detail_kuis beserta relasi soal & jawabannya
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
          // Logika Grouping: karena 1 soal punya banyak baris jawaban di detail_kuis
          const qMap = new Map<number, Question>();
          
          data.forEach((row: any) => {
            if (!qMap.has(row.id_soal)) {
              qMap.set(row.id_soal, {
                id_soal: row.id_soal,
                teks_soal: row.soal?.soal || "Teks soal tidak tersedia",
                opsi: []
              });
            }
            
            if (row.jawaban) {
              qMap.get(row.id_soal)?.opsi.push({
                id_jawaban: row.id_jawaban,
                teks_jawaban: row.jawaban.jawaban,
                is_benar: row.jawaban.jawaban_benar
              });
            }
          });

          // Ubah dari Map ke Array biar gampang di-map di UI
          setQuestions(Array.from(qMap.values()));
        }
      } catch (err) {
        console.error("Gagal memuat ujian:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchQuiz();
  }, [quizId]);

  const handleSelectOption = (idSoal: number, idJawaban: number) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [idSoal]: idJawaban }));
  };

  const handleSubmit = async () => {
    // Validasi kalau ada soal yang kelewatan
    if (Object.keys(answers).length < questions.length) {
      if (!confirm("Masih ada soal yang belum kamu jawab! Yakin ingin mengumpulkan ujian sekarang?")) {
        return;
      }
    }

    // Kalkulasi nilai 0 - 100
    let correctCount = 0;
    questions.forEach(q => {
      const userAnswerId = answers[q.id_soal];
      const correctOption = q.opsi.find(opt => opt.is_benar);
      if (correctOption && userAnswerId === correctOption.id_jawaban) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);
    setScore(finalScore);
    setIsSubmitted(true);

    // [OPSIONAL] Simpan nilai ujian ke database
    // Saat ini disetting buat nambahin XP mahasiswa (1 soal benar = 10 XP)
    if (profile?.idMahasiswa) {
      const { data: mhsData } = await supabase.from('mahasiswa').select('total_xp').eq('id_mahasiswa', profile.idMahasiswa).single();
      const currentXp = mhsData?.total_xp || 0;
      
      const bonusXp = correctCount * 10;
      await supabase.from('mahasiswa').update({ total_xp: currentXp + bonusXp }).eq('id_mahasiswa', profile.idMahasiswa);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FB]">
        <Loader2 className="w-10 h-10 animate-spin text-[#5B5288] mb-4" />
        <p className="text-[#5B5288] font-bold">Mempersiapkan Lembar Ujian...</p>
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
        
        {/* HEADER UJIAN */}
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm mb-6 border border-gray-100">
          <h1 className="text-xl font-extrabold text-[#5B5288]">Ujian Mandiri (#{quizId})</h1>
          <span className="font-bold text-[#5B5288] bg-purple-50 px-4 py-1.5 rounded-lg border border-purple-100">
            Soal {currentIndex + 1} dari {questions.length}
          </span>
        </div>

        {/* AREA SOAL & JAWABAN */}
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

            {/* NAVIGASI TOMBOL */}
            <div className="flex items-center justify-between mt-12 pt-6 border-t border-gray-100">
              <button 
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="px-5 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30 flex items-center gap-2 transition-all"
              >
                <ArrowLeft className="w-5 h-5" /> Sebelumnya
              </button>

              {currentIndex === questions.length - 1 ? (
                <button 
                  onClick={handleSubmit}
                  className="px-8 py-3 rounded-xl font-black text-white bg-[#39C936] hover:bg-[#2EA32B] shadow-lg hover:shadow-xl flex items-center gap-2 transition-all hover:-translate-y-1"
                >
                  Kumpulkan <CheckCircle className="w-5 h-5" />
                </button>
              ) : (
                <button 
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  className="px-8 py-3 rounded-xl font-bold text-white bg-[#5B5288] hover:bg-[#4A4373] shadow-md flex items-center gap-2 transition-all hover:-translate-y-1"
                >
                  Selanjutnya <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          
          /* LAYAR HASIL SETELAH KUMPULKAN */
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
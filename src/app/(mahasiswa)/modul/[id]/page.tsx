"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, CheckCircle2, ArrowLeft, BookOpen } from "lucide-react";
import Quiz from "@/components/Quis/page"; 
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type DetailModulDB = {
  id_modul: number;
  nama_modul: string;
  video_url: string;
  teks_materi: string;
};

function getYouTubeEmbedUrl(url: string) {
  if (!url) return null;
  if (url.includes("youtube.com/embed/")) return url;
  
  let videoId = "";
  if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split("?")[0];
  } 
  else if (url.includes("youtube.com/watch")) {
    videoId = new URL(url).searchParams.get("v") || "";
  }
  
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

export default function ModulDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);        
  const router = useRouter();
  
  const { profile } = useCurrentUser();
  
  const [course, setCourse] = useState<DetailModulDB | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"materi" | "kuis">("materi");
  const [quizScore, setQuizScore] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchDetail() {
      const { data: modulData } = await supabase
        .from('modul')
        .select('*')
        .eq('id_modul', id)
        .single();

      if (modulData && isMounted) {
        setCourse(modulData);
      }

      if (profile?.idMahasiswa && isMounted) {
        const { data: progData } = await supabase
          .from('progress_modul')
          .select('nilai, selesai')
          .eq('id_modul', id)
          .eq('id_mahasiswa', profile.idMahasiswa)
          .single();

        if (progData && progData.selesai && isMounted) {
          setQuizScore(progData.nilai);
        }
      }

      if (isMounted) setIsLoading(false);
    }

    fetchDetail();

    return () => { isMounted = false; };
  }, [id, profile?.idMahasiswa]);

  // PENGAMAN SUPER KETAT ANTI MODUL KOSONG
  useEffect(() => {
    async function markMateriViewed() {
      if (course && profile?.idMahasiswa && activeTab === "materi") {
        
        // Bersihkan tag HTML (seperti <p><br></p>) jika dari Rich Text
        const teksMateriBersih = course.teks_materi ? course.teks_materi.replace(/<[^>]*>?/gm, '').trim() : '';
        const adaVideo = course.video_url && course.video_url.trim() !== '';
        const adaTeks = teksMateriBersih !== '';
        
        const adaIsiMateri = adaVideo || adaTeks;

        // Kalau kosong melompong, JANGAN berikan nilai 40%
        if (!adaIsiMateri) return; 

        // Kalau ada isinya, baru catat ke database
        const { data: existingProgress } = await supabase
          .from('progress_modul')
          .select('id_modul')
          .eq('id_mahasiswa', profile.idMahasiswa)
          .eq('id_modul', course.id_modul)
          .single();

        if (!existingProgress) {
          await supabase.from('progress_modul').insert({
            id_mahasiswa: profile.idMahasiswa,
            id_modul: course.id_modul,
            materi_dilihat: true,
            kuis_dicoba: false,
            selesai: false,
            nilai: 0
          });
        } else {
          await supabase.from('progress_modul').update({
            materi_dilihat: true
          }).eq('id_mahasiswa', profile.idMahasiswa).eq('id_modul', course.id_modul);
        }
      }
    }
    markMateriViewed();
  }, [course, profile?.idMahasiswa, activeTab]);

  function handleClaimXP(score: number) {
    setQuizScore(score);
    setActiveTab("materi"); 
  }

  if (isLoading) {
    return <div className="p-10 text-center font-bold text-gray-500">Memuat detail modul... ⏳</div>;
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-lg font-bold text-[#5B5288]">Modul tidak ditemukan</p>
        <button onClick={() => router.push("/modul")} className="flex items-center gap-2 rounded-lg border border-[#5B5288]/50 px-4 py-2 text-sm font-bold text-[#5B5288] hover:bg-[#5B5288]/10">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Modul Pembelajaran
        </button>
      </div>
    );
  }

  const paragraphs = course.teks_materi ? course.teks_materi.split('\n').filter(p => p.trim() !== '') : [];
  const embedUrl = course.video_url ? getYouTubeEmbedUrl(course.video_url) : null;

  return (
    <div className="flex flex-col gap-6 p-6 lg:flex-row lg:gap-8">
      {/* AREA KIRI */}
      <div className="flex-1 min-w-0">
        <button onClick={() => router.push("/modul")} className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#5B5288] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Modul
        </button>

        {/* =====================================================
            HEADER BANNER
        ===================================================== */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#4a3f7a] via-[#3d3466] to-[#2a224d] px-6 py-8 shadow-lg shadow-[#3d3466]/25 lg:px-8 mb-6 text-white">
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
              <span className="text-amber-300">📚</span>
              Pembelajaran
            </span>
            <h1 className="text-2xl font-black leading-snug tracking-wide md:text-3xl">
              {course.nama_modul}
            </h1>
          </div>

          {/* Bottom Wave Decoration */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 opacity-20">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-full fill-white">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.94,130.83,121.3,201,115.8,241.6,112.5,282.6,98.2,321.39,56.44Z" />
            </svg>
          </div>
        </div>

        {activeTab === "kuis" ? (
          <div className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#5B5288]/50 bg-white p-8 min-h-[600px]">
            <Quiz 
              onClaimXP={(score: number) => handleClaimXP(score)} 
              idModul={course.id_modul} 
              initialScore={quizScore}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="relative overflow-hidden rounded-xl bg-black">
              {embedUrl ? (
                <iframe 
                  src={embedUrl}
                  title={course.nama_modul}
                  className="aspect-video w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-gray-400 bg-gray-900">
                  <Play className="h-10 w-10 opacity-50" />
                  <p className="text-sm">Video materi belum tersedia.</p>
                </div>
              )}
            </div>

            {paragraphs.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="mb-4 text-xl font-bold text-[#5B5288]">Penjelasan Materi</h2>
                <div className="flex flex-col gap-3 text-sm leading-relaxed text-gray-600">
                  {paragraphs.map((p, i) => (
                    <p key={i} className="mb-2">{p}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
                Materi teks belum ditambahkan oleh dosen.
              </div>
            )}
          </div>
        )}
      </div>

      {/* SIDEBAR KANAN */}
      <aside className="w-full shrink-0 lg:w-80">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 sticky top-6">
          <h3 className="mb-4 text-lg font-bold text-[#5B5288] border-b pb-2">Daftar Isi</h3>
          
          <ul className="flex flex-col gap-2">
            <li>
              <button 
                onClick={() => setActiveTab("materi")} 
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${activeTab === "materi" ? "bg-[#5B5288]/10 border border-[#5B5288]/30" : "hover:bg-gray-50"}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${activeTab === "materi" ? "bg-[#5B5288]" : "bg-gray-200"}`}>
                  <BookOpen className={`h-4 w-4 ${activeTab === "materi" ? "text-white" : "text-gray-500"}`} />
                </span>
                <span className={`text-sm font-semibold flex-1 ${activeTab === "materi" ? "text-[#5B5288]" : "text-gray-600"}`}>
                  Materi Utama
                </span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab("kuis")} 
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${activeTab === "kuis" ? "bg-[#5B5288]/10 border border-[#5B5288]/30" : "hover:bg-gray-50"}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${quizScore !== null ? "bg-green-500" : activeTab === "kuis" ? "bg-[#5B5288]" : "bg-gray-200"}`}>
                  {quizScore !== null ? <CheckCircle2 className="h-4 w-4 text-white" /> : <Play className={`h-4 w-4 ${activeTab === "kuis" ? "text-white fill-white" : "text-gray-500"}`} />}
                </span>
                <span className={`text-sm font-semibold flex-1 ${activeTab === "kuis" ? "text-[#5B5288]" : "text-gray-600"}`}>
                  Kuis Evaluasi
                </span>
                
                {quizScore !== null && (
                  <span className="text-xs font-black text-green-600 bg-green-100 px-2 py-1 rounded-full shadow-sm">
                    {quizScore}%
                  </span>
                )}
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
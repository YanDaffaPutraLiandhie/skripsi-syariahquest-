"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DosenContainer from "@/components/layout/DosenContainer";

type QuestionItem = {
  id_soal: number;
  soal: string;
  jawaban: {
    id_jawaban: number;
    jawaban: string;
    jawaban_benar: boolean;
  }[];
};

export default function DetailKuisPage() {
  const params = useParams();
  const router = useRouter();
  const idKuis = Number(params?.id ?? 0);

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [quizName, setQuizName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!idKuis) {
      setError("ID kuis tidak valid.");
      setLoading(false);
      return;
    }

    async function loadQuizDetail() {
      try {
        setLoading(true);
        setError("");

        const { data: quizData, error: quizError } = await supabase
          .from("quis")
          .select("id_quis, nama_kuis")
          .eq("id_quis", idKuis)
          .maybeSingle();

        if (quizError) throw quizError;
        if (!quizData) {
          setError("Kuis tidak ditemukan.");
          return;
        }

        setQuizName(quizData.nama_kuis ?? "Kuis");

        const { data: detailData, error: detailError } = await supabase
          .from("detail_kuis")
          .select("id_soal, id_jawaban")
          .eq("id_quis", idKuis);

        if (detailError) throw detailError;

        if (!detailData || detailData.length === 0) {
          setQuestions([]);
          return;
        }

        const soalIds = [...new Set(detailData.map((row) => row.id_soal))];
        const jawabanIds = [...new Set(detailData.map((row) => row.id_jawaban))];

        if (soalIds.length === 0) {
          setQuestions([]);
          return;
        }

        const { data: soalData, error: soalError } = await supabase
          .from("soal")
          .select("id_soal, soal")
          .in("id_soal", soalIds);

        if (soalError) throw soalError;

        const { data: jawabanData, error: jawabanError } = await supabase
          .from("jawaban")
          .select("id_jawaban, id_soal, jawaban, jawaban_benar")
          .in("id_jawaban", jawabanIds);

        if (jawabanError) throw jawabanError;

        const jawabanMap: Record<number, QuestionItem["jawaban"]> = {};

        for (const item of jawabanData ?? []) {
          if (!jawabanMap[item.id_soal]) {
            jawabanMap[item.id_soal] = [];
          }

          jawabanMap[item.id_soal].push({
            id_jawaban: item.id_jawaban,
            jawaban: item.jawaban,
            jawaban_benar: Boolean(item.jawaban_benar),
          });
        }

        const mappedQuestions: QuestionItem[] = (soalData ?? []).map((soal) => ({
          id_soal: soal.id_soal,
          soal: soal.soal,
          jawaban: jawabanMap[soal.id_soal] ?? [],
        }));

        setQuestions(mappedQuestions);
      } catch (err: any) {
        console.error("Gagal mengambil detail kuis:", err);
        setError(err?.message || "Terjadi kesalahan saat memuat soal kuis.");
      } finally {
        setLoading(false);
      }
    }

    loadQuizDetail();
  }, [idKuis]);

  return (
    <DosenContainer
      categoryTag="DETAIL KUIS"
      title={quizName || "Detail Kuis"}
      subtitle="Menampilkan seluruh daftar pertanyaan dan kunci jawaban dalam kuis ini."
      headerAction={
        <button
          type="button"
          onClick={() => router.push("/Dosen/kuis")}
          className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          ← Kembali ke Kuis
        </button>
      }
    >
      {loading ? (
        <div className="rounded-[28px] bg-white p-12 text-center text-sm font-semibold text-[#8b84a5] shadow-sm">
          Memuat daftar pertanyaan kuis...
        </div>
      ) : error ? (
        <div className="rounded-[28px] bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-[28px] bg-white p-12 text-center text-sm font-semibold text-[#8b84a5] shadow-sm">
          Belum ada soal yang terdaftar pada kuis ini.
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div
              key={question.id_soal}
              className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-black/5"
            >
              <div className="mb-4 flex items-center justify-between border-b border-[#f0edf9] pb-4">
                <span className="inline-flex h-8 items-center rounded-full bg-[#f8f7fd] px-3 text-xs font-black text-[#4a3f7a] ring-1 ring-[#4a3f7a]/10">
                  Pertanyaan #{index + 1}
                </span>

                {question.jawaban.some((answer) => answer.jawaban_benar) && (
                  <span className="rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                    Kunci Benar:{" "}
                    {String.fromCharCode(
                      65 +
                        question.jawaban.findIndex(
                          (item) => item.jawaban_benar
                        )
                    )}
                  </span>
                )}
              </div>

              <h2 className="mb-6 text-lg font-bold leading-relaxed text-[#2b2540]">
                {question.soal}
              </h2>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {question.jawaban.map((option, optionIndex) => (
                  <div
                    key={option.id_jawaban}
                    className={`flex items-center gap-3 rounded-2xl p-4 text-sm font-semibold transition ${
                      option.jawaban_benar
                        ? "bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/40"
                        : "bg-[#f8f7fd] text-[#2b2540] ring-1 ring-[#4a3f7a]/5"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        option.jawaban_benar
                          ? "bg-emerald-500 text-white"
                          : "bg-[#4a3f7a]/10 text-[#4a3f7a]"
                      }`}
                    >
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span className="leading-snug">{option.jawaban}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DosenContainer>
  );
}
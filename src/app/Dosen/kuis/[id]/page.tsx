"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

        // =====================================================
        // 1. AMBIL NAMA KUIS BERDASARKAN id_quis YANG DIKLIK
        // =====================================================
        const { data: quizData, error: quizError } = await supabase
          .from("quis")
          .select("id_quis, nama_kuis")
          .eq("id_quis", idKuis)
          .maybeSingle();

        if (quizError) {
          throw quizError;
        }

        if (!quizData) {
          setError("Kuis tidak ditemukan.");
          return;
        }

        setQuizName(quizData.nama_kuis ?? "Kuis");

        // =====================================================
        // 2. CARI id_quis YANG SAMA DI TABEL detail_kuis
        //    (fk: id_quis, id_soal, id_jawaban)
        // =====================================================
        const { data: detailData, error: detailError } = await supabase
          .from("detail_kuis")
          .select("id_soal, id_jawaban")
          .eq("id_quis", idKuis);

        if (detailError) {
          throw detailError;
        }

        // Kalau tidak ada baris detail_kuis yang cocok -> tidak ada soal untuk kuis ini
        if (!detailData || detailData.length === 0) {
          setQuestions([]);
          return;
        }

        // Ambil daftar id_soal unik dari detail_kuis
        const soalIds = [...new Set(detailData.map((row) => row.id_soal))];

        // Ambil daftar id_jawaban unik dari detail_kuis
        const jawabanIds = [
          ...new Set(detailData.map((row) => row.id_jawaban)),
        ];

        if (soalIds.length === 0) {
          setQuestions([]);
          return;
        }

        // =====================================================
        // 3. AMBIL DATA SOAL BERDASARKAN id_soal
        //    tabel soal: (id_soal, id_modul, soal)
        // =====================================================
        const { data: soalData, error: soalError } = await supabase
          .from("soal")
          .select("id_soal, soal")
          .in("id_soal", soalIds);

        if (soalError) {
          throw soalError;
        }

        // =====================================================
        // 4. AMBIL DATA JAWABAN BERDASARKAN id_jawaban
        //    yang terdaftar di detail_kuis untuk kuis ini
        //    tabel jawaban: (id_jawaban, id_soal (fk), jawaban, jawaban_benar)
        // =====================================================
        const { data: jawabanData, error: jawabanError } = await supabase
          .from("jawaban")
          .select("id_jawaban, id_soal, jawaban, jawaban_benar")
          .in("id_jawaban", jawabanIds);

        if (jawabanError) {
          throw jawabanError;
        }

        // =====================================================
        // 5. GABUNGKAN JAWABAN KE MASING-MASING SOAL
        //    berdasarkan id_soal (fk di tabel jawaban)
        // =====================================================
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

        const mappedQuestions: QuestionItem[] = (soalData ?? []).map(
          (soal) => ({
            id_soal: soal.id_soal,
            soal: soal.soal,
            jawaban: jawabanMap[soal.id_soal] ?? [],
          })
        );

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
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <main className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.push("/Dosen/kuis")}
            className="rounded-full border border-[#e4e2ee] bg-white px-4 py-2 text-sm font-semibold text-[#4a3f7a] hover:bg-[#f7f6fb]"
          >
            ← Kembali
          </button>

          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8b84a5]">
              Detail Kuis
            </p>
            <h1 className="text-2xl font-bold text-[#2b2540]">
              {quizName || "Kuis"}
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#e4e2ee] bg-[#f9f8fc] p-8 text-center text-sm font-medium text-[#5c5775]">
            Memuat soal kuis...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : questions.length === 0 ? (
          <div className="rounded-2xl border border-[#e4e2ee] bg-[#f9f8fc] p-8 text-center text-sm font-medium text-[#5c5775]">
            Belum ada soal untuk kuis ini.
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((question, index) => (
              <div
                key={question.id_soal}
                className="rounded-[24px] border border-[#e4e2ee] bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8b84a5]">
                    Soal {index + 1}
                  </p>
                  {question.jawaban.some((answer) => answer.jawaban_benar) && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      Jawaban Benar:{" "}
                      {String.fromCharCode(
                        65 +
                          question.jawaban.findIndex(
                            (item) => item.jawaban_benar
                          )
                      )}
                    </span>
                  )}
                </div>

                <h2 className="mb-5 text-lg font-bold text-[#2b2540] leading-relaxed">
                  {question.soal}
                </h2>

                <div className="grid gap-3">
                  {question.jawaban.map((option, optionIndex) => (
                    <div
                      key={option.id_jawaban}
                      className={`rounded-2xl border p-4 text-sm ${
                        option.jawaban_benar
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : "border-[#e4e2ee] bg-[#f9f8fc] text-[#2b2540]"
                      }`}
                    >
                      <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white font-bold text-[#4a3f7a] ring-1 ring-[#e4e2ee]">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      {option.jawaban}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
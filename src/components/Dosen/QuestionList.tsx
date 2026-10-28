// components/Dosen/QuestionList.tsx  (BARU)
// Menggantikan blok daftar soal yang diduplikasi di:
//   - Dosen/kuis/[id]/page.tsx
//   - Dosen/modul/lihat_kuis/page.tsx
// Pemakaian:  <QuestionList questions={questions} />

export type QuestionItem = {
  id_soal: number;
  soal: string;
  jawaban: {
    id_jawaban: number;
    jawaban: string;
    jawaban_benar: boolean;
  }[];
};

const huruf = (i: number) => String.fromCharCode(65 + i);

export default function QuestionList({ questions }: { questions: QuestionItem[] }) {
  return (
    <div className="space-y-6">
      {questions.map((question, index) => {
        const kunci = question.jawaban
          .map((j, i) => (j.jawaban_benar ? huruf(i) : null))
          .filter(Boolean)
          .join(", ");

        return (
          <div
            key={question.id_soal}
            className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-black/5"
          >
            <div className="mb-4 flex items-center justify-between border-b border-[#f0edf9] pb-4">
              <span className="inline-flex h-8 items-center rounded-full bg-[#f8f7fd] px-3 text-xs font-black text-[#4a3f7a] ring-1 ring-[#4a3f7a]/10">
                Pertanyaan #{index + 1}
              </span>

              {kunci && (
                <span className="rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                  Kunci Benar: {kunci}
                </span>
              )}
            </div>

            <h2 className="mb-6 text-lg font-bold leading-relaxed text-[#2b2540]">
              {question.soal}
            </h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {question.jawaban.map((option, i) => (
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
                    {huruf(i)}
                  </span>
                  <span className="leading-snug">{option.jawaban}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
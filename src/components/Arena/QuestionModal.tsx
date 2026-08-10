interface Jawaban {
  id_jawaban: number;
  jawaban: string;
}

interface Soal {
  id_soal: number;
  soal: string;
  jawaban: Jawaban[];
}

interface QuestionModalProps {
  currentSoal: Soal;
  onAnswer: (id_jawaban: number) => void;
}

export default function QuestionModal({ currentSoal, onAnswer }: QuestionModalProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in-up">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative text-center border-4 border-red-100">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <span className="text-5xl">💣</span>
        </div>
        
        <h3 className="text-[#5B5288] text-2xl font-black mb-2 uppercase tracking-wide">Jawab & Selamatkan Diri!</h3>
        <p className="text-gray-500 mb-6 font-medium text-sm">Benar = Maju 1 Langkah | Salah = Mundur 2 Langkah</p>
        
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8 text-left shadow-sm">
          <p className="text-gray-800 font-bold mb-5 text-[15px] leading-relaxed">
            {currentSoal.soal}
          </p>
          
          <div className="space-y-3">
            {currentSoal.jawaban?.map((opsi, index) => {
              const label = ["A", "B", "C", "D"][index] || "-";
              return (
                <button 
                  key={opsi.id_jawaban} 
                  onClick={() => onAnswer(opsi.id_jawaban)} 
                  className="w-full text-left px-5 py-3.5 rounded-xl border-2 border-gray-200 hover:border-[#39C936] hover:bg-green-50 hover:text-green-700 font-bold text-gray-500 transition-all shadow-sm"
                >
                  {label}. {opsi.jawaban}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
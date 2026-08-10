interface FinishModalProps {
  onClose: () => void;
}

export default function FinishModal({ onClose }: FinishModalProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in-up">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative text-center border-4 border-yellow-400">
        <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-bounce">
          <span className="text-6xl">🏆</span>
        </div>
        
        <h3 className="text-yellow-500 text-3xl font-black mb-2 uppercase tracking-wide drop-shadow-sm">SELAMAT!</h3>
        <p className="text-gray-600 mb-6 font-medium text-lg">Kamu berhasil mencapai garis FINISH!</p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8 text-center shadow-sm">
          <p className="text-gray-800 font-bold mb-2 text-[15px]">Sebagai hadiah, kamu mendapatkan:</p>
          <div className="text-5xl my-4 drop-shadow-md">🎖️</div>
          <p className="text-yellow-600 font-bold text-lg">Badge Penakluk Arena</p>
          <p className="text-gray-500 text-xs mt-2 italic">(Asset badge asli segera hadir wkwk)</p>
        </div>

        <button 
          onClick={onClose} 
          className="w-full bg-yellow-400 text-white font-extrabold py-3.5 rounded-xl text-lg hover:bg-yellow-500 transition-all shadow-lg active:scale-95"
        >
          Tutup & Rayakan
        </button>
      </div>
    </div>
  );
}
"use client";

interface DiceControlProps {
  diceValue: number;
  disabled: boolean;
  onRoll: () => void;
}

export default function DiceControl({ diceValue, disabled, onRoll }: DiceControlProps) {
  
  // Komponen Titik Dadu (Biar gampang dipakai berulang)
  const Dot = () => <div className="w-3 h-3 md:w-4 md:h-4 bg-[#5B5288] rounded-full shadow-inner"></div>;

  // Logika Penempatan Titik Dadu pakai Flexbox & CSS Grid
  const renderDiceFace = (val: number) => {
    // Pastikan angka maksimal yang digambar dadu adalah 6 (Kalau lebih dari 6 karena lemparan ganda, biarkan 6)
    const displayVal = val > 6 ? 6 : val; 

    return (
      <div className={`w-20 h-20 md:w-24 md:h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center border-b-[6px] border-gray-200 p-3 md:p-4 transition-transform duration-75 ${disabled && val !== 6 ? 'scale-95 opacity-80' : 'scale-100'}`}>
        
        {displayVal === 1 && <Dot />}
        
        {displayVal === 2 && (
          <div className="flex w-full h-full justify-between">
            <div className="self-start"><Dot /></div>
            <div className="self-end"><Dot /></div>
          </div>
        )}
        
        {displayVal === 3 && (
          <div className="flex w-full h-full justify-between">
            <div className="self-start"><Dot /></div>
            <div className="self-center"><Dot /></div>
            <div className="self-end"><Dot /></div>
          </div>
        )}
        
        {displayVal === 4 && (
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full place-items-center">
            <Dot /><Dot /><Dot /><Dot />
          </div>
        )}
        
        {displayVal === 5 && (
          <div className="relative w-full h-full">
            <div className="absolute top-0 left-0"><Dot /></div>
            <div className="absolute top-0 right-0"><Dot /></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"><Dot /></div>
            <div className="absolute bottom-0 left-0"><Dot /></div>
            <div className="absolute bottom-0 right-0"><Dot /></div>
          </div>
        )}
        
        {displayVal === 6 && (
          <div className="grid grid-cols-2 grid-rows-3 w-full h-full place-items-center gap-y-1">
            <Dot /><Dot /><Dot /><Dot /><Dot /><Dot />
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 bg-white/60 backdrop-blur-sm p-6 rounded-[2rem] shadow-sm border border-white">
       
       {/* Wadah Dadu yang akan bergetar saat dikocok */}
       <div className={`${disabled && diceValue !== 6 ? 'animate-pulse' : ''}`}>
          {renderDiceFace(diceValue)}
       </div>

       <button 
          onClick={onRoll} 
          disabled={disabled}
          className="bg-[#39C936] text-white font-black py-4 px-8 rounded-2xl shadow-lg border-b-4 border-[#2A9D28] hover:brightness-110 disabled:opacity-50 disabled:border-[#39C936] disabled:cursor-not-allowed transition-all active:scale-95 active:border-b-0 active:translate-y-1 w-full text-center"
        >
          {disabled ? "MENUNGGU..." : "LEMPAR DADU 🎲"}
       </button>
    </div>
  );
}
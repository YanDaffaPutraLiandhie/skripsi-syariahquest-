"use client";

type DiceControlProps = {
  diceValue: number;
  disabled: boolean;
  onRoll: () => void;
};

export default function DiceControl({
  diceValue,
  disabled,
  onRoll,
}: DiceControlProps) {
  return (
    <div className="flex flex-row lg:flex-col gap-4 items-center justify-center h-auto lg:h-full w-full pb-0 lg:pb-4 order-3 lg:order-3">
      <div className="w-16 h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-[#5B5288] rounded-2xl flex items-center justify-center shadow-xl border border-white/20">
        <span className="text-white text-3xl lg:text-4xl xl:text-5xl font-black">
          {diceValue}
        </span>
      </div>
      <button
        onClick={onRoll}
        disabled={disabled}
        className={`w-auto px-6 lg:w-20 xl:w-24 py-3 bg-white font-black text-lg xl:text-xl rounded-xl shadow-xl border border-gray-100 transition-all ${
          disabled
            ? "text-gray-300 bg-gray-50 opacity-50 cursor-not-allowed"
            : "text-[#5B5288] hover:bg-gray-50 active:scale-95"
        }`}
      >
        ROLL
      </button>
    </div>
  );
}

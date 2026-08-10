export default function BoomModal() {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="text-center animate-bounce">
        <div className="text-9xl mb-2 drop-shadow-2xl">💥</div>
        <h2 className="text-6xl font-black text-white text-stroke drop-shadow-2xl animate-pulse text-red-500 italic tracking-wider uppercase">
          DUARRR!!!
        </h2>
        <p className="text-white text-2xl font-bold mt-4 drop-shadow-lg">
          Kamu Terkena Bom Jebakan!
        </p>
      </div>
    </div>
  );
}
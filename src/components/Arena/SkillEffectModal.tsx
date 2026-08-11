export type SkillEffectConfig = {
  emoji: string;
  title: string;
  subtitle: string;
  colorClass: string; // tailwind text-color class, mis. "text-yellow-400"
};

export default function SkillEffectModal({
  emoji,
  title,
  subtitle,
  colorClass,
}: SkillEffectConfig) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="text-center animate-bounce">
        <div className="text-9xl mb-2 drop-shadow-2xl">{emoji}</div>
        <h2
          className={`text-6xl font-black text-white text-stroke drop-shadow-2xl animate-pulse italic tracking-wider uppercase ${colorClass}`}
        >
          {title}
        </h2>
        <p className="text-white text-2xl font-bold mt-4 drop-shadow-lg">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

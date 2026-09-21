export type AdaptiveProgress = {
  id_modul: number;
  nilai: number | null;
  selesai: boolean;
};

export type AdaptiveModule = {
  id_modul: number;
  id_level: number;
  parameter_nilai?: number | null;
};

export type AdaptiveDecision = {
  isUnlocked: boolean;
  prerequisiteLevel: number | null;
  masteryScore: number;
  requiredScore: number;
  reason: string;
};

const DEFAULT_REQUIRED_SCORE = 70;
export const MAX_QUESTION_COUNT = 50;

function clampScore(score: number | null | undefined) {
  return Math.max(0, Math.min(100, Number(score) || 0));
}

export function shuffleQuestions<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

export function calculateMasteryScore(progress: AdaptiveProgress[]) {
  const completed = progress.filter((item) => item.selesai);
  if (completed.length === 0) return 0;

  const totalScore = completed.reduce(
    (total, item) => total + clampScore(item.nilai),
    0,
  );

  return Math.round(totalScore / completed.length);
}

export function getModuleAccess(
  module: AdaptiveModule,
  modules: AdaptiveModule[],
  progress: AdaptiveProgress[],
): AdaptiveDecision {
  const requiredScore = Math.max(
    0,
    Math.min(100, module.parameter_nilai ?? DEFAULT_REQUIRED_SCORE),
  );
  const prerequisiteLevel = module.id_level > 1 ? module.id_level - 1 : null;
  const prerequisiteModules = prerequisiteLevel
    ? modules.filter((item) => item.id_level === prerequisiteLevel)
    : [];
  const prerequisiteProgress = progress.filter((item) =>
    prerequisiteModules.some((moduleItem) => moduleItem.id_modul === item.id_modul),
  );
  const masteryScore = calculateMasteryScore(prerequisiteProgress);
  const hasPrerequisite = prerequisiteModules.length === 0 || prerequisiteProgress.some((item) => item.selesai);
  const isUnlocked = module.id_level === 1 || (hasPrerequisite && masteryScore >= requiredScore);

  return {
    isUnlocked,
    prerequisiteLevel,
    masteryScore,
    requiredScore,
    reason: isUnlocked
      ? "Modul terbuka berdasarkan penguasaan materi sebelumnya."
      : `Selesaikan modul level ${prerequisiteLevel} dengan nilai minimal ${requiredScore}%.`,
  };
}

export function selectAdaptiveQuestions<T extends { id_soal: number }>(
  questions: T[],
  masteryScore: number,
) {
  const limitedQuestions = shuffleQuestions(questions).slice(0, MAX_QUESTION_COUNT);

  if (limitedQuestions.length <= 5 || masteryScore >= 85) {
    return limitedQuestions;
  }

  const targetCount = masteryScore < 60
    ? Math.max(5, Math.ceil(limitedQuestions.length * 0.7))
    : Math.max(5, Math.ceil(limitedQuestions.length * 0.85));

  return shuffleQuestions(limitedQuestions).slice(0, Math.min(targetCount, limitedQuestions.length));
}

export function getAdaptiveFeedback(masteryScore: number) {
  if (masteryScore < 60) return "Mode penguatan: fokus pada soal inti sebelum naik level.";
  if (masteryScore < 85) return "Mode berkembang: lanjutkan latihan untuk memperkuat pemahaman.";
  return "Mode tantangan: kamu siap mengerjakan materi dengan tingkat kesulitan lebih tinggi.";
}
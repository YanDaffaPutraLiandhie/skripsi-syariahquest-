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

export type LearningObjectMastery = {
  id_sub_topik: number;
  lo_code: string | null;
  judul: string;
  urutan: number;
  masteryProbability: number;
  totalAnswers: number;
  totalCorrect: number;
  questionCount: number;
  remedialText: string | null;
};

export type AdaptiveLearningPlan = {
  engine: "bkt";
  moduleId: number;
  masteryThreshold: number;
  learningObjects: LearningObjectMastery[];
  nextLearningObject: LearningObjectMastery | null;
  difficulty: {
    key: "foundation" | "practice" | "challenge";
    label: string;
    targetQuantile: number;
  };
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

type AdaptiveQuestion = {
  id_soal: number;
  id_sub_topik?: number | null;
  lo_code?: string | null;
  difficulty_rating?: number | null;
};

export function selectQuestionsForBktPlan<T extends AdaptiveQuestion>(
  questions: T[],
  plan: AdaptiveLearningPlan | null,
): T[] {
  if (questions.length === 0) return [];

  const shuffled = shuffleQuestions(questions);
  const total = shuffled.length;
  const count =
    total <= 10
      ? total
      : Math.min(MAX_QUESTION_COUNT, Math.max(10, Math.ceil(total * 0.7)));
  const target = plan?.nextLearningObject;

  if (!target || plan.learningObjects.length === 0) {
    return shuffled.slice(0, count);
  }

  const belongsTo = (question: T, learningObject: LearningObjectMastery) =>
    question.id_sub_topik === learningObject.id_sub_topik ||
    (Boolean(learningObject.lo_code) && question.lo_code === learningObject.lo_code);

  const targetQuestions = shuffled.filter((question) => belongsTo(question, target));
  if (targetQuestions.length === 0) return shuffled.slice(0, count);

  const hasDifficultyRating = (question: T) =>
    question.difficulty_rating !== null &&
    question.difficulty_rating !== undefined &&
    Number.isFinite(Number(question.difficulty_rating));
  const ratedQuestions = targetQuestions
    .filter(hasDifficultyRating)
    .sort(
      (left, right) =>
        Number(left.difficulty_rating) - Number(right.difficulty_rating),
    );
  const difficulty = plan.difficulty;
  const targetRating =
    ratedQuestions.length > 0
      ? Number(
          ratedQuestions[
            Math.round((ratedQuestions.length - 1) * difficulty.targetQuantile)
          ].difficulty_rating,
        )
      : null;

  const ratingDistance = (question: T) =>
    targetRating === null
      ? 0
      : hasDifficultyRating(question)
        ? Math.abs(Number(question.difficulty_rating) - targetRating)
        : Number.POSITIVE_INFINITY;

  targetQuestions.sort((left, right) => ratingDistance(left) - ratingDistance(right));

  const targetCount = Math.min(targetQuestions.length, Math.ceil(count * 0.7));
  const selected = new Map<number, T>();
  for (const question of targetQuestions.slice(0, targetCount)) {
    selected.set(question.id_soal, question);
  }

  const masteryBySubTopic = new Map(
    plan.learningObjects.map((item) => [item.id_sub_topik, item.masteryProbability]),
  );
  const otherQuestions = shuffled
    .filter((question) => !selected.has(question.id_soal))
    .sort((left, right) => {
      const leftMastery = masteryBySubTopic.get(left.id_sub_topik ?? -1) ?? 0.5;
      const rightMastery = masteryBySubTopic.get(right.id_sub_topik ?? -1) ?? 0.5;
      const masteryPriority = leftMastery - rightMastery;
      return masteryPriority || ratingDistance(left) - ratingDistance(right);
    });

  for (const question of otherQuestions) {
    if (selected.size >= count) break;
    selected.set(question.id_soal, question);
  }

  return shuffleQuestions(Array.from(selected.values()));
}

export function getAdaptiveFeedback(masteryScore: number) {
  if (masteryScore < 60) return "Mode penguatan: fokus pada soal inti sebelum naik level.";
  if (masteryScore < 85) return "Mode berkembang: lanjutkan latihan untuk memperkuat pemahaman.";
  return "Mode tantangan: kamu siap mengerjakan materi dengan tingkat kesulitan lebih tinggi.";
}
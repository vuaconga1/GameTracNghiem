export type ScoreRow = {
  isCorrect: boolean;
  elapsedMs: number;
};

export type ExperienceProfile = {
  totalExp: number;
  level: number;
  tier: number;
  expInLevel: number;
  expToNextLevel: number | null;
  progressPercent: number;
};

const MAX_LEVEL = 50;
const TIME_LIMIT_MS = 30_000;
const BASE_EXP = 40;
const MAX_ACCURACY_EXP = 60;
const MAX_SPEED_EXP = 20;
const PERFECT_BONUS = 25;
const PERFECT_MIN_ANSWERS = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function speedFactor(elapsedMs: number): number {
  return clamp(1 - elapsedMs / TIME_LIMIT_MS, 0, 1);
}

export function calculateSessionExperience(rows: ScoreRow[]): number {
  if (rows.length === 0) {
    throw new Error('Score rows must not be empty');
  }

  const answeredCount = rows.length;
  const correctRows = rows.filter((row) => row.isCorrect);
  const correctCount = correctRows.length;
  const accuracy = correctCount / answeredCount;

  const averageCorrectSpeed =
    correctCount === 0
      ? 0
      : correctRows.reduce((sum, row) => sum + speedFactor(row.elapsedMs), 0) /
        correctCount;

  const perfectBonus =
    answeredCount >= PERFECT_MIN_ANSWERS && correctCount === answeredCount
      ? PERFECT_BONUS
      : 0;

  return (
    BASE_EXP +
    Math.floor(accuracy * MAX_ACCURACY_EXP) +
    Math.floor(averageCorrectSpeed * MAX_SPEED_EXP) +
    perfectBonus
  );
}

export function experienceToNextLevel(level: number): number {
  return Math.round(80 * level ** 1.35);
}

export function totalExperienceForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += experienceToNextLevel(l);
  }
  return total;
}

function normalizeTotalExp(totalExp: number): number {
  if (!Number.isFinite(totalExp) || totalExp < 0) return 0;
  return Math.min(Math.floor(totalExp), Number.MAX_SAFE_INTEGER);
}

export function profileFromTotalExp(totalExp: number): ExperienceProfile {
  const normalized = normalizeTotalExp(totalExp);

  let level = 1;
  while (level < MAX_LEVEL && normalized >= totalExperienceForLevel(level + 1)) {
    level += 1;
  }

  const levelStart = totalExperienceForLevel(level);
  const expInLevel = normalized - levelStart;
  const tier = Math.floor((level - 1) / 5) + 1;

  if (level >= MAX_LEVEL) {
    return {
      totalExp: normalized,
      level: MAX_LEVEL,
      tier,
      expInLevel,
      expToNextLevel: null,
      progressPercent: 100,
    };
  }

  const needed = experienceToNextLevel(level);
  const progressPercent = clamp(Math.round((expInLevel / needed) * 100), 0, 99);

  return {
    totalExp: normalized,
    level,
    tier,
    expInLevel,
    expToNextLevel: needed,
    progressPercent,
  };
}

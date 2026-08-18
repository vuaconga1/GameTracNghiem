import { parseGradeFromLevelName } from '@/lib/tts/getTtsSpeedByGrade';

export type SpeakingGradeBand = 'grades_1_5' | 'grades_6_9';

/** Global 1–5: 5-question pronunciation correction. Global 6–9: free conversation. */
export function speakingGradeBand(grade: number): SpeakingGradeBand {
  const g = Math.trunc(grade);
  if (g >= 1 && g <= 5) return 'grades_1_5';
  return 'grades_6_9';
}

export function resolveSpeakingGrade(input: {
  grade?: number | null;
  levelName?: string | null;
}): number {
  if (input.grade != null && Number.isFinite(input.grade)) {
    return Math.trunc(Number(input.grade));
  }
  return parseGradeFromLevelName(input.levelName) ?? 8;
}

export function isSentenceCorrectionSpeakingGrade(input: {
  grade?: number | null;
  levelName?: string | null;
}): boolean {
  return speakingGradeBand(resolveSpeakingGrade(input)) === 'grades_1_5';
}

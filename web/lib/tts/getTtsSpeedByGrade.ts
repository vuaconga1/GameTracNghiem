/**
 * OpenAI TTS `/v1/audio/speech` speed by school grade (Lớp 1–9).
 * Valid OpenAI range: 0.25 – 4.0.
 */
export function getTtsSpeedByGrade(grade: number): number {
  if (!Number.isFinite(grade)) return 1.0;
  const g = Math.trunc(grade);

  if (g >= 1 && g <= 3) return 0.75;
  if (g >= 4 && g <= 6) return 0.85;
  if (g >= 7 && g <= 9) return 0.9;
  return 1.0;
}

/** Parse "Lớp 8", "lop 8", "Grade 8", etc. → 1–9 or null. */
export function parseGradeFromLevelName(levelName: string | null | undefined): number | null {
  if (!levelName) return null;
  const match = String(levelName).match(/(\d{1,2})/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n < 1 || n > 9) return null;
  return n;
}

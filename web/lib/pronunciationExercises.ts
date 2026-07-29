/**
 * Group pronunciation questions by phoneme / exercise label.
 * Used by course detail cards and the pronunciation player.
 */
export type PronunciationExerciseGroup = {
  /** Stable URL key, e.g. AE */
  key: string;
  /** Display label, e.g. Âm /æ/ */
  label: string;
  /** Absolute question indices in the course's pronunciation list */
  indices: number[];
  questionCount: number;
};

const DEFAULT_EXERCISE = 'Phát âm';

export function normalizePronunciationExercise(value: unknown): string {
  const raw = String(value ?? '').trim();
  return raw || DEFAULT_EXERCISE;
}

/** Derive a short ASCII key from exercise label or explicit slug. */
export function pronunciationExerciseKey(
  exercise: string,
  explicitKey?: string | null,
): string {
  const fromExplicit = String(explicitKey ?? '').trim();
  if (fromExplicit) {
    return fromExplicit.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || 'X';
  }

  const ipa = /\/([^/]+)\//.exec(exercise)?.[1];
  if (ipa) {
    const map: Record<string, string> = {
      æ: 'AE',
      'ɑː': 'AA',
      ɑ: 'AA',
      e: 'E',
      aʊ: 'AW',
      'əʊ': 'OW',
      'eə': 'EA',
      h: 'H',
      r: 'R',
      l: 'L',
      m: 'M',
      j: 'J',
      w: 'W',
      fl: 'FL',
      fr: 'FR',
    };
    if (map[ipa]) return map[ipa];
    return ipa.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8) || 'X';
  }

  const slug = exercise
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 12);
  return slug || 'PRON';
}

export function groupPronunciationExercises(
  questions: Array<{ exercise?: string | null; exerciseKey?: string | null }>,
): PronunciationExerciseGroup[] {
  const order: string[] = [];
  const map = new Map<string, PronunciationExerciseGroup>();

  questions.forEach((question, index) => {
    const label = normalizePronunciationExercise(question.exercise);
    const key = pronunciationExerciseKey(label, question.exerciseKey);
    const existing = map.get(key);
    if (existing) {
      existing.indices.push(index);
      existing.questionCount += 1;
      return;
    }
    order.push(key);
    map.set(key, {
      key,
      label,
      indices: [index],
      questionCount: 1,
    });
  });

  return order.map((key) => map.get(key)!);
}

export function filterQuestionsByExerciseKey<
  T extends { exercise?: string | null; exerciseKey?: string | null },
>(questions: T[], exerciseKey: string | null | undefined): Array<{ question: T; index: number }> {
  if (!exerciseKey) {
    return questions.map((question, index) => ({ question, index }));
  }
  const wanted = pronunciationExerciseKey(exerciseKey, exerciseKey);
  return questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => {
      const label = normalizePronunciationExercise(question.exercise);
      return pronunciationExerciseKey(label, question.exerciseKey) === wanted;
    });
}

export function completedCountForIndices(
  statuses: readonly string[] | undefined,
  indices: readonly number[],
): number {
  if (!statuses?.length) return 0;
  let n = 0;
  for (const index of indices) {
    const status = statuses[index];
    if (status && status !== 'empty') n += 1;
  }
  return n;
}

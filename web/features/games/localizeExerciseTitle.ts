import {
  quizExerciseDisplayTitle,
  stripExerciseAnnotation,
} from '@/features/games/exerciseDisplay';

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

type TitleRule = {
  key: string;
  /** Match against normalized (lowercased, stripped accents) text. */
  test: (blob: string) => boolean;
};

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * English workbook-style short titles (Global Success / Reading Lop9 tone).
 * Matched against exercise key + typeLabel (VI or EN).
 */
const TITLE_RULES: TitleRule[] = [
  {
    key: 'exerciseTitles.differentSound',
    test: (b) =>
      b.includes('phat am khac') ||
      b.includes('different underlined sound') ||
      b.includes('pronounced differently') ||
      b.includes('different sound'),
  },
  {
    key: 'exerciseTitles.differentStress',
    test: (b) => b.includes('trong am khac') || b.includes('different stress') || b.includes('odd stress'),
  },
  {
    key: 'exerciseTitles.closestMeaning',
    test: (b) =>
      b.includes('tu gan nghia') ||
      b.includes('closest in meaning') ||
      b.includes('closest meaning') ||
      b.includes('synonym'),
  },
  {
    key: 'exerciseTitles.oppositeMeaning',
    test: (b) =>
      b.includes('tu trai nghia') ||
      b.includes('opposite in meaning') ||
      b.includes('opposite meaning') ||
      b.includes('antonym'),
  },
  {
    key: 'exerciseTitles.findMistake',
    test: (b) =>
      b.includes('tim loi sai') ||
      b.includes('find the mistake') ||
      b.includes('needs correcting') ||
      b.includes('underlined part'),
  },
  {
    key: 'exerciseTitles.readingGapFill',
    test: (b) =>
      b.includes('doc hieu dien khuyet') ||
      b.includes('fill in each blank') ||
      (b.includes('fill in the blank') && b.includes('passage')) ||
      b.includes('option to fill'),
  },
  {
    key: 'exerciseTitles.readingComprehension',
    test: (b) =>
      b.includes('doc hieu') ||
      (b.includes('read the') && (b.includes('choose') || b.includes('text') || b.includes('passage'))),
  },
  {
    key: 'exerciseTitles.prepositions',
    test: (b) => b.includes('gioi tu') || b.includes('preposition'),
  },
  {
    key: 'exerciseTitles.completeSentences',
    test: (b) =>
      b.includes('hoan thanh cau') ||
      b.includes('complete the sentence') ||
      b.includes('complete the sentences'),
  },
  {
    key: 'exerciseTitles.verbForm',
    test: (b) => b.includes('verb form') || b.includes('dang dung cua dong tu'),
  },
  {
    key: 'exerciseTitles.wordForm',
    test: (b) => b.includes('word form') || b.includes('tu loai') || b.includes('dang dung cua tu'),
  },
  {
    key: 'exerciseTitles.circleCorrectForm',
    test: (b) => b.includes('circle correct form') || b.includes('chon dang dung'),
  },
  {
    key: 'exerciseTitles.fillBlank',
    test: (b) => b === 'dien tu' || b.includes('fill in the blank') || b.includes('fill-in'),
  },
  {
    key: 'exerciseTitles.chooseCorrectAnswer',
    test: (b) =>
      b.includes('chon dap an dung') ||
      b === 'chon dap an' ||
      b === 'trac nghiem' ||
      b.includes('choose the correct answer') ||
      b.includes('choose the correct option'),
  },
  {
    key: 'exerciseTitles.writingPractice',
    test: (b) =>
      b.includes('bai tap viet') ||
      b.includes('writing practice') ||
      b.includes('rewrite') ||
      b.includes('viet lai'),
  },
  {
    key: 'exerciseTitles.findCorrectMistake',
    test: (b) => b.includes('tim va sua loi') || b.includes('find and correct'),
  },
  {
    key: 'exerciseTitles.reorderSentence',
    test: (b) => b.includes('sap xep') || b.includes('rearrange') || b.includes('reorder'),
  },
  {
    key: 'exerciseTitles.grammarDefault',
    test: (b) => b === 'ngu phap' || b === 'grammar',
  },
  {
    key: 'exerciseTitles.other',
    test: (b) => b === 'khac' || b === 'other',
  },
  {
    key: 'exerciseTitles.pronunciationDefault',
    test: (b) => b === 'phat am' || b === 'pronunciation',
  },
];

/** Resolve message key for a stored exercise / typeLabel string. */
export function resolveExerciseTitleKey(
  exercise?: string | null,
  typeLabel?: string | null,
): string | null {
  const code = stripExerciseAnnotation(exercise);
  const label = String(typeLabel || '').trim();
  const blob = fold(`${code} ${label}`);
  if (!blob) return null;

  // "Âm /æ/" · "Sound /æ/"
  const sound = /(?:^|\s)(?:am|sound)\s*\/([^/]+)\//.exec(blob);
  if (sound) return 'exerciseTitles.sound';

  for (const rule of TITLE_RULES) {
    if (rule.test(blob)) return rule.key;
  }
  return null;
}

/**
 * Localize exercise card / subtitle titles.
 * Leaves workbook codes like "Exercise 1" as-is when no mapping exists.
 */
export function localizeExerciseTitle(
  t: TranslateFn,
  exercise?: string | null,
  typeLabel?: string | null,
): string {
  const key = resolveExerciseTitleKey(exercise, typeLabel);
  if (key === 'exerciseTitles.sound') {
    const raw = quizExerciseDisplayTitle(exercise, typeLabel);
    const ipa =
      /\/([^/]+)\//.exec(raw)?.[1] ||
      /\/([^/]+)\//.exec(String(typeLabel || ''))?.[1] ||
      /\/([^/]+)\//.exec(String(exercise || ''))?.[1] ||
      '';
    if (ipa) return t('exerciseTitles.sound', { ipa });
  }
  if (key) {
    const translated = t(key);
    if (translated && translated !== key) return translated;
  }

  const code = stripExerciseAnnotation(exercise);
  const label = String(typeLabel || '').trim();
  // Opaque keys like "W Exercise 15" / "Exercise 3" — prefer the human label.
  if (label && /^(?:[A-Z]\s*)?Exercise\s*\d+/i.test(code)) {
    return label;
  }
  return quizExerciseDisplayTitle(exercise, typeLabel);
}

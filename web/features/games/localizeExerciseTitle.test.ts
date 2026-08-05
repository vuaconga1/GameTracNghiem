import { describe, expect, it } from 'vitest';

import { localizeExerciseTitle, resolveExerciseTitleKey } from './localizeExerciseTitle';

const en: Record<string, string> = {
  'exerciseTitles.chooseCorrectAnswer': 'Choose the correct answer',
  'exerciseTitles.differentSound': 'Choose the word with a different sound',
  'exerciseTitles.differentStress': 'Choose the word with a different stress',
  'exerciseTitles.closestMeaning': 'Choose the word closest in meaning',
  'exerciseTitles.oppositeMeaning': 'Choose the word opposite in meaning',
  'exerciseTitles.findMistake': 'Choose the underlined part that needs correcting',
  'exerciseTitles.readingComprehension': 'Read and choose the correct options',
  'exerciseTitles.readingGapFill': 'Read and fill in each blank',
  'exerciseTitles.prepositions': 'Choose the correct prepositions',
  'exerciseTitles.completeSentences': 'Complete the sentences',
  'exerciseTitles.verbForm': 'Verb form',
  'exerciseTitles.wordForm': 'Word form',
  'exerciseTitles.sound': 'Sound /{ipa}/',
  'exerciseTitles.practiceWord': 'Word practice',
};

function t(key: string, params?: Record<string, string | number>): string {
  let text = en[key] || key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

describe('localizeExerciseTitle', () => {
  it('maps common Vietnamese quiz exercise labels to workbook-style English', () => {
    expect(localizeExerciseTitle(t, 'Phát âm khác', 'Trắc nghiệm')).toBe(
      'Choose the word with a different sound',
    );
    expect(localizeExerciseTitle(t, 'Trọng âm khác', '')).toBe(
      'Choose the word with a different stress',
    );
    expect(localizeExerciseTitle(t, 'Từ gần nghĩa', '')).toBe(
      'Choose the word closest in meaning',
    );
    expect(localizeExerciseTitle(t, 'Từ trái nghĩa', '')).toBe(
      'Choose the word opposite in meaning',
    );
    expect(localizeExerciseTitle(t, 'Chọn đáp án đúng', '')).toBe('Choose the correct answer');
    expect(localizeExerciseTitle(t, 'Tìm lỗi sai', '')).toBe(
      'Choose the underlined part that needs correcting',
    );
  });

  it('localizes pronunciation sound group labels', () => {
    expect(resolveExerciseTitleKey('Âm /æ/', 'Âm /æ/')).toBe('exerciseTitles.sound');
    expect(localizeExerciseTitle(t, 'Âm /æ/', 'Âm /æ/')).toBe('Sound /æ/');
  });

  it('keeps workbook exercise codes when no type label maps', () => {
    expect(localizeExerciseTitle(t, 'U4 Ex14', '')).toBe('U4 Ex14');
  });

  it('uses typeLabel mapping when exercise is a workbook code', () => {
    expect(localizeExerciseTitle(t, 'U4 Ex14', 'Find the mistake')).toBe(
      'Choose the underlined part that needs correcting',
    );
  });
});

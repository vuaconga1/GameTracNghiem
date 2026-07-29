import { describe, expect, it } from 'vitest';

import {
  completedCountForIndices,
  filterQuestionsByExerciseKey,
  groupPronunciationExercises,
  normalizePronunciationExercise,
  pronunciationExerciseKey,
} from './pronunciationExercises';

describe('pronunciationExercises', () => {
  it('normalizes empty exercise to Phát âm', () => {
    expect(normalizePronunciationExercise('')).toBe('Phát âm');
    expect(normalizePronunciationExercise('  Âm /æ/ ')).toBe('Âm /æ/');
  });

  it('derives keys from IPA labels', () => {
    expect(pronunciationExerciseKey('Âm /æ/', 'AE')).toBe('AE');
    expect(pronunciationExerciseKey('Âm /ɑː/')).toBe('AA');
    expect(pronunciationExerciseKey('Âm /e/')).toBe('E');
  });

  it('groups questions preserving order', () => {
    const groups = groupPronunciationExercises([
      { exercise: 'Âm /æ/', exerciseKey: 'AE' },
      { exercise: 'Âm /æ/', exerciseKey: 'AE' },
      { exercise: 'Âm /ɑː/', exerciseKey: 'AA' },
      { exercise: 'Âm /e/', exerciseKey: 'E' },
    ]);
    expect(groups.map((g) => g.key)).toEqual(['AE', 'AA', 'E']);
    expect(groups[0]).toMatchObject({ label: 'Âm /æ/', questionCount: 2, indices: [0, 1] });
    expect(groups[1]?.indices).toEqual([2]);
  });

  it('filters by exercise key and keeps absolute indices', () => {
    const questions = [
      { exercise: 'Âm /æ/', exerciseKey: 'AE', targetText: 'bat' },
      { exercise: 'Âm /ɑː/', exerciseKey: 'AA', targetText: 'ask' },
      { exercise: 'Âm /æ/', exerciseKey: 'AE', targetText: 'man' },
    ];
    const filtered = filterQuestionsByExerciseKey(questions, 'AE');
    expect(filtered.map((row) => row.index)).toEqual([0, 2]);
    expect(filtered.map((row) => row.question.targetText)).toEqual(['bat', 'man']);
  });

  it('counts completed statuses for group indices', () => {
    expect(completedCountForIndices(['correct', 'empty', 'wrong'], [0, 2])).toBe(2);
    expect(completedCountForIndices(['empty', 'empty'], [0, 1])).toBe(0);
  });
});

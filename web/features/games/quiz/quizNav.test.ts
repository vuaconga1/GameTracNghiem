import { describe, expect, it } from 'vitest';

import {
  buildQuizQuery,
  filterQuizQuestions,
  normalizeQuizExercise,
  quizExercisesForSkillType,
  quizTypesForSkill,
} from './quizNav';

const sample = [
  { index: 0, type: 'multiple_choice', skill: 'vocabulary', exercise: 'Exercise 1' },
  { index: 1, type: 'multiple_choice', skill: 'vocabulary', exercise: 'Exercise 2' },
  { index: 2, type: 'fill_blank', skill: 'vocabulary', exercise: 'Exercise 1' },
  { index: 3, type: 'word_form', skill: 'reading', exercise: '' },
  { index: 4, type: 'multiple_choice', skill: 'reading', exercise: 'Exercise 2' },
];

describe('quizNav', () => {
  it('normalizes empty exercise to Khác', () => {
    expect(normalizeQuizExercise('')).toBe('Khác');
    expect(normalizeQuizExercise('  Exercise 2  ')).toBe('Exercise 2');
  });

  it('lists non-empty types for a skill with counts', () => {
    expect(quizTypesForSkill(sample, 'vocabulary')).toEqual([
      { type: 'multiple_choice', label: 'Trắc nghiệm', count: 2 },
      { type: 'fill_blank', label: 'Điền từ', count: 1 },
    ]);
    expect(quizTypesForSkill(sample, 'listening')).toEqual([]);
  });

  it('groups exercises for skill+type and hides empty', () => {
    expect(quizExercisesForSkillType(sample, 'vocabulary', 'multiple_choice')).toEqual([
      {
        exercise: 'Exercise 1',
        count: 1,
        typeLabel: '',
        displayTitle: 'Exercise 1',
      },
      {
        exercise: 'Exercise 2',
        count: 1,
        typeLabel: '',
        displayTitle: 'Exercise 2',
      },
    ]);
    expect(quizExercisesForSkillType(sample, 'reading', 'word_form')).toEqual([
      { exercise: 'Khác', count: 1, typeLabel: '', displayTitle: 'Khác' },
    ]);
  });

  it('prefers typeLabel as displayTitle when exercise is a workbook code', () => {
    const coded = [
      {
        index: 0,
        type: 'fill_blank' as const,
        skill: 'writing',
        exercise: 'U4 Ex14',
        typeLabel: 'Find the mistake',
      },
    ];
    expect(quizExercisesForSkillType(coded, 'writing', 'fill_blank')).toEqual([
      {
        exercise: 'U4 Ex14',
        count: 1,
        typeLabel: 'Find the mistake',
        displayTitle: 'Find the mistake',
      },
    ]);
  });

  it('filters by skill type exercise and builds query', () => {
    expect(
      filterQuizQuestions(sample, 'vocabulary', 'multiple_choice', 'Exercise 2').map((q) => q.index)
    ).toEqual([1]);
    expect(buildQuizQuery({ skill: 'vocabulary' })).toBe('?skill=vocabulary');
    expect(
      buildQuizQuery({ skill: 'vocabulary', type: 'fill_blank', exercise: 'Exercise 1' })
    ).toBe('?skill=vocabulary&type=fill_blank&exercise=Exercise+1');
  });
});

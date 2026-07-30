import { describe, expect, it } from 'vitest';

import {
  aggregateSkillQuestionCounts,
  countQuestionsForGameSkill,
  indicesForGameSkill,
  isSkillScopedGame,
} from './gameQuestionCounts';

describe('gameQuestionCounts', () => {
  it('marks quiz as skill-scoped and scramble as exclusive', () => {
    expect(isSkillScopedGame('quiz')).toBe(true);
    expect(isSkillScopedGame('choose_and_circle')).toBe(true);
    expect(isSkillScopedGame('scramble')).toBe(false);
  });

  it('filters quiz indices by payload skill', () => {
    const questions = [
      { skill: 'reading' },
      { skill: 'writing' },
      { skill: 'reading' },
      { skill: 'vocabulary' },
    ];
    expect(indicesForGameSkill('quiz', 'reading', questions)).toEqual([0, 2]);
    expect(
      countQuestionsForGameSkill({
        gameKey: 'quiz',
        skillId: 'reading',
        questions,
        statuses: ['correct', 'wrong', 'empty', 'correct'],
      })
    ).toEqual({
      indices: [0, 2],
      questionCount: 2,
      completedCount: 1,
    });
  });

  it('counts exclusive games with full totals', () => {
    expect(
      countQuestionsForGameSkill({
        gameKey: 'scramble',
        skillId: 'vocabulary',
        questionCount: 28,
        statuses: ['correct', 'empty', 'wrong'],
      })
    ).toEqual({
      indices: Array.from({ length: 28 }, (_, i) => i),
      questionCount: 28,
      completedCount: 2,
    });
  });

  it('aggregates skill totals without double-counting other skills quiz rows', () => {
    const stats = aggregateSkillQuestionCounts({
      skillId: 'reading',
      games: [
        {
          gameKey: 'quiz',
          questions: [
            { skill: 'reading' },
            { skill: 'writing' },
            { skill: 'reading' },
          ],
          statuses: ['correct', 'correct', 'empty'],
        },
        {
          gameKey: 'scramble',
          questionCount: 10,
          statuses: Array.from({ length: 10 }, () => 'empty'),
        },
      ],
    });
    expect(stats.totalQuestions).toBe(12);
    expect(stats.completedQuestions).toBe(1);
    expect(stats.byGame.quiz).toEqual({ questionCount: 2, completedCount: 1 });
    expect(stats.byGame.scramble).toEqual({ questionCount: 10, completedCount: 0 });
  });
});

import { describe, expect, it } from 'vitest';

import {
  buildGameSkillsFromEnabledGames,
  deriveEnabledGamesFromSkills,
  gameAssignedToSkill,
  gamesForSkillOnCourse,
  isGameVisibleForCourse,
  migrateQuizReadingToVocabulary,
  normalizeEnabledSkillsInput,
  normalizeGameSkillsInput,
  parseSkillQuery,
  resolveEnabledSkillIds,
  resolveVisibleGameKeys,
  skillsForGame,
  visibleSkillsForCourse,
  type GameSkillsMap,
} from './skillCatalog';

describe('skillCatalog', () => {
  it('defaults enabledSkills to all five when empty', () => {
    expect(resolveEnabledSkillIds([])).toEqual([
      'listening',
      'reading',
      'speaking',
      'writing',
      'vocabulary',
    ]);
    expect(resolveEnabledSkillIds(undefined)).toEqual([
      'listening',
      'reading',
      'speaking',
      'writing',
      'vocabulary',
    ]);
  });

  it('builds convention map with quiz under vocabulary', () => {
    const map = buildGameSkillsFromEnabledGames([]);
    expect(map.quiz).toBe('vocabulary');
    expect(map.pronunciation).toBe('speaking');
    expect(map.grammar).toBe('writing');
    expect(map.scramble).toBe('vocabulary');
    expect(map.look_and_write).toBeUndefined();
    expect(Object.values(map).includes('listening')).toBe(false);
  });

  it('only assigns currently enabled games when enabledGames is non-empty', () => {
    const map = buildGameSkillsFromEnabledGames(['grammar', 'quiz']);
    expect(map).toEqual({ grammar: 'writing', quiz: 'vocabulary' });
  });

  it('resolves visible games from skills + enabledSkills', () => {
    const gameSkills = {
      grammar: 'writing',
      quiz: 'vocabulary',
      pronunciation: 'speaking',
    } as const;
    expect(resolveVisibleGameKeys(gameSkills, ['vocabulary', 'writing'])).toEqual([
      'grammar',
      'quiz',
    ]);
    expect(isGameVisibleForCourse(gameSkills, ['speaking'], 'pronunciation')).toBe(true);
    expect(isGameVisibleForCourse(gameSkills, ['speaking'], 'quiz')).toBe(false);
  });

  it('allows quiz multi-skill assignment while keeping others exclusive', () => {
    const gameSkills: GameSkillsMap = {
      quiz: ['vocabulary', 'reading'],
      grammar: 'writing',
    };
    expect(skillsForGame(gameSkills.quiz)).toEqual(['reading', 'vocabulary']);
    expect(gameAssignedToSkill(gameSkills.quiz, 'reading')).toBe(true);
    expect(gameAssignedToSkill(gameSkills.quiz, 'listening')).toBe(false);
    expect(
      resolveVisibleGameKeys(gameSkills, [
        'listening',
        'reading',
        'speaking',
        'writing',
        'vocabulary',
      ])
    ).toEqual(['grammar', 'quiz']);
    expect(gamesForSkillOnCourse(gameSkills, ['reading'], 'reading').map((g) => g.key)).toEqual([
      'quiz',
    ]);
    expect(
      gamesForSkillOnCourse(gameSkills, ['vocabulary'], 'vocabulary').map((g) => g.key)
    ).toEqual(['quiz']);

    expect(
      normalizeGameSkillsInput({
        quiz: ['reading', 'vocabulary', 'nope'],
        grammar: ['writing', 'reading'],
      })
    ).toEqual({
      quiz: ['reading', 'vocabulary'],
      grammar: 'writing',
    });
  });

  it('hides skill cards when skill disabled and filters games for a skill', () => {
    expect(visibleSkillsForCourse(['reading', 'writing']).map((s) => s.id)).toEqual([
      'reading',
      'writing',
    ]);
    const games = gamesForSkillOnCourse(
      { quiz: 'vocabulary', grammar: 'writing' },
      ['vocabulary', 'writing'],
      'vocabulary'
    );
    expect(games.map((g) => g.key)).toEqual(['quiz']);
    expect(gamesForSkillOnCourse({ quiz: 'vocabulary' }, ['writing'], 'vocabulary')).toEqual([]);
  });

  it('normalizes PATCH inputs and parses skill query', () => {
    expect(normalizeEnabledSkillsInput(['reading', 'nope', 'vocabulary'])).toEqual([
      'reading',
      'vocabulary',
    ]);
    expect(normalizeGameSkillsInput({ grammar: 'writing', bad: 'reading', quiz: null })).toEqual({
      grammar: 'writing',
      quiz: null,
    });
    expect(normalizeGameSkillsInput('x')).toBeNull();
    expect(parseSkillQuery('vocabulary')).toBe('vocabulary');
    expect(parseSkillQuery('nope')).toBeNull();
  });

  it('derives legacy enabledGames from visible skill assignments', () => {
    expect(
      deriveEnabledGamesFromSkills(
        { grammar: 'writing', quiz: 'vocabulary', pronunciation: 'speaking' },
        ['writing']
      )
    ).toEqual(['grammar']);
  });

  it('migrates quiz from reading to vocabulary and enables the skill', () => {
    const result = migrateQuizReadingToVocabulary(
      { quiz: 'reading', grammar: 'writing' },
      ['listening', 'reading', 'speaking', 'writing']
    );
    expect(result.gameSkills.quiz).toBe('vocabulary');
    expect(result.enabledSkills).toContain('vocabulary');
    expect(result.enabledSkills).toHaveLength(5);
  });

  it('migrates multi-skill quiz that includes reading', () => {
    const result = migrateQuizReadingToVocabulary(
      { quiz: ['reading', 'listening'] },
      ['listening', 'reading']
    );
    expect(skillsForGame(result.gameSkills.quiz)).toEqual(['listening', 'vocabulary']);
    expect(result.enabledSkills).toContain('vocabulary');
  });
});

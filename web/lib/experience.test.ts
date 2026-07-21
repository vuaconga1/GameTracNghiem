import { describe, expect, it } from 'vitest';
import {
  calculateSessionExperience,
  experienceToNextLevel,
  profileFromTotalExp,
  totalExperienceForLevel,
} from './experience';

describe('calculateSessionExperience', () => {
  it('rejects an empty score array', () => {
    expect(() => calculateSessionExperience([])).toThrow();
  });

  it('returns 40 EXP for one all-wrong answer', () => {
    expect(calculateSessionExperience([{ isCorrect: false, elapsedMs: 5000 }])).toBe(40);
  });

  it('returns 145 EXP for five instant correct answers', () => {
    const rows = Array.from({ length: 5 }, () => ({ isCorrect: true, elapsedMs: 0 }));
    expect(calculateSessionExperience(rows)).toBe(145);
  });

  it('clamps negative and over-limit elapsed times for speed', () => {
    const negativeElapsed = calculateSessionExperience([
      { isCorrect: true, elapsedMs: -1000 },
    ]);
    const instant = calculateSessionExperience([{ isCorrect: true, elapsedMs: 0 }]);
    expect(negativeElapsed).toBe(instant);

    const overLimit = calculateSessionExperience([
      { isCorrect: true, elapsedMs: 60_000 },
    ]);
    const atLimit = calculateSessionExperience([
      { isCorrect: true, elapsedMs: 30_000 },
    ]);
    expect(overLimit).toBe(atLimit);
  });
});

describe('experienceToNextLevel', () => {
  it('uses round(80 * level^1.35) for levels 1–49', () => {
    expect(experienceToNextLevel(1)).toBe(80);
    expect(experienceToNextLevel(2)).toBe(Math.round(80 * 2 ** 1.35));
  });
});

describe('totalExperienceForLevel', () => {
  it('is cumulative EXP required to reach a level', () => {
    expect(totalExperienceForLevel(1)).toBe(0);
    expect(totalExperienceForLevel(2)).toBe(experienceToNextLevel(1));
    expect(totalExperienceForLevel(3)).toBe(
      experienceToNextLevel(1) + experienceToNextLevel(2),
    );
  });
});

describe('profileFromTotalExp', () => {
  it('gives level 1 / tier 1 for zero EXP', () => {
    expect(profileFromTotalExp(0)).toEqual({
      totalExp: 0,
      level: 1,
      tier: 1,
      expInLevel: 0,
      expToNextLevel: experienceToNextLevel(1),
      progressPercent: 0,
    });
  });

  it('changes to level 2 at the exact level-2 threshold', () => {
    const threshold = totalExperienceForLevel(2);
    expect(profileFromTotalExp(threshold)).toMatchObject({
      totalExp: threshold,
      level: 2,
      tier: 1,
      expInLevel: 0,
      expToNextLevel: experienceToNextLevel(2),
      progressPercent: 0,
    });
  });

  it('starts tier 2 at level 6', () => {
    const profile = profileFromTotalExp(totalExperienceForLevel(6));
    expect(profile.level).toBe(6);
    expect(profile.tier).toBe(2);
  });

  it('stays at level 49 with 99% progress one EXP before the level-50 threshold', () => {
    const profile = profileFromTotalExp(totalExperienceForLevel(50) - 1);
    expect(profile.level).toBe(49);
    expect(profile.progressPercent).toBe(99);
  });

  it('caps very large EXP at level 50 / tier 10 with null next and 100% progress', () => {
    const profile = profileFromTotalExp(Number.MAX_SAFE_INTEGER);
    expect(profile).toMatchObject({
      totalExp: Number.MAX_SAFE_INTEGER,
      level: 50,
      tier: 10,
      expToNextLevel: null,
      progressPercent: 100,
    });
  });

  it('normalizes negative total EXP to zero', () => {
    expect(profileFromTotalExp(-10).totalExp).toBe(0);
    expect(profileFromTotalExp(-10).level).toBe(1);
  });
});

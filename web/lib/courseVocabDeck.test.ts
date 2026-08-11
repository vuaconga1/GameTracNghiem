import { describe, expect, it } from 'vitest';

import { getPrimaryCourseVocabDeck, resolveCourseVocabDeck } from './courseVocabDeck';
import { LOGISTICS_WEEK1_COURSES } from './logisticsUnits';

describe('getPrimaryCourseVocabDeck', () => {
  it('builds Lớp 1 unit cards with IPA, meaning, and image', () => {
    const deck = getPrimaryCourseVocabDeck({
      levelName: 'Lớp 1',
      courseName: 'Unit 1: In The School Playground',
    });
    expect(deck).not.toBeNull();
    expect(deck!.length).toBeGreaterThanOrEqual(4);
    expect(deck![0]).toMatchObject({
      word: 'Bill',
      meaning: 'bạn Bill',
      ipa: '/bɪl/',
      layout: 'primary',
    });
    expect(deck![0].imageUrl).toContain('/images/games/lop1-vocab/unit-01/');
  });

  it('returns null for non-primary levels', () => {
    expect(
      getPrimaryCourseVocabDeck({
        levelName: 'Lớp 8',
        courseName: 'Unit 1: Hello',
      }),
    ).toBeNull();
  });
});

describe('resolveCourseVocabDeck', () => {
  it('prefers logistics decks by course id', () => {
    const deck = resolveCourseVocabDeck({
      id: LOGISTICS_WEEK1_COURSES[0].id,
      name: LOGISTICS_WEEK1_COURSES[0].name,
      levelName: 'English For Logictics',
    });
    expect(deck?.[0]?.layout).toBe('logistics');
    expect(deck?.some((card) => card.word === 'Documentation')).toBe(true);
  });

  it('resolves primary decks by level + unit name', () => {
    const deck = resolveCourseVocabDeck({
      id: 'any-cuid',
      name: 'Unit 2: In The Dining Room',
      levelName: 'Lớp 1',
    });
    expect(deck?.[0]?.layout).toBe('primary');
    expect(deck?.map((card) => card.word)).toEqual(
      expect.arrayContaining(['cake', 'car', 'cat', 'cup']),
    );
  });
});

import { describe, expect, it } from 'vitest';

import { parseGamePayload } from '@/lib/admin/payloadSchemas';
import {
  LOP4_WORKBOOK_UNITS,
  WORD_MATCH_PAGE_CROP_BOXES,
  getLop4WorkbookUnit,
} from '@/lib/lop4WorkbookContent';

describe('lop4WorkbookContent', () => {
  it('covers Units 1-19 in order', () => {
    expect(LOP4_WORKBOOK_UNITS.map((unit) => unit.unit)).toEqual(
      Array.from({ length: 19 }, (_, index) => index + 1),
    );
  });

  it('keeps workbook-derived counts consistent by unit range', () => {
    for (let unit = 1; unit <= 10; unit += 1) {
      const item = getLop4WorkbookUnit(unit);
      expect(item.wordMatch.items).toHaveLength(5);
      expect(item.quiz.items).toHaveLength(5);
      expect(item.readAndComplete.items).toHaveLength(5);
    }

    for (let unit = 11; unit <= 19; unit += 1) {
      const item = getLop4WorkbookUnit(unit);
      expect(item.wordMatch.items).toHaveLength(0);
      expect(item.quiz.items).toHaveLength(10);
      expect(item.readAndComplete.items).toHaveLength(5);
    }
  });

  it('uses valid payload schemas for representative rows', () => {
    const unit1 = getLop4WorkbookUnit(1);
    const unit11 = getLop4WorkbookUnit(11);

    expect(() =>
      parseGamePayload('word_match', {
        word: unit1.wordMatch.items[0].word,
        hint: unit1.wordMatch.items[0].hint,
        image: '/images/games/lop4-word-match/u01-a.png',
      }),
    ).not.toThrow();

    expect(() =>
      parseGamePayload('read_and_complete', {
        title: unit1.readAndComplete.title,
        instruction: unit1.readAndComplete.instruction,
        word_bank: unit1.readAndComplete.wordBank,
        items: unit1.readAndComplete.items.map((row, index) => ({
          order: index + 1,
          sentence: row.sentence,
          image: '',
          answer: row.answer,
        })),
      }),
    ).not.toThrow();

    expect(() =>
      parseGamePayload('quiz', {
        type: unit11.quiz.items[0].type,
        typeLabel: unit11.quiz.items[0].typeLabel,
        question: unit11.quiz.items[0].question,
        answer: unit11.quiz.items[0].answer,
        options: unit11.quiz.items[0].options,
        accept: unit11.quiz.items[0].accept ?? [],
        fillMode: unit11.quiz.items[0].fillMode,
      }),
    ).not.toThrow();
  });

  it('defines five crop boxes for word-match pages', () => {
    expect(WORD_MATCH_PAGE_CROP_BOXES).toHaveLength(5);
    for (const box of WORD_MATCH_PAGE_CROP_BOXES) {
      expect(box.width).toBeGreaterThan(50);
      expect(box.height).toBeGreaterThan(50);
    }
  });
});

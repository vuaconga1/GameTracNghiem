import { describe, expect, it } from 'vitest';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import pronunciation from './data/pronunciation-lop9-parsed.json';
import reading from './data/lop9-reading-content.json';
import vocabulary from './data/lop9-tuvung-vocab.json';
import { buildPronunciationRows } from './import-lop9-pronunciation';

const ALL_UNITS = ['1', '2', '3', '4', '5', '6'];
const NEW_UNITS = ['2', '3', '4', '5', '6'];

describe('Lớp 9 import artifacts', () => {
  it('keeps the cleaned Unit 1 pronunciation groups stable', () => {
    const unit = pronunciation['1'];

    expect(unit.sounds.map((sound) => sound.slug)).toEqual(['AE', 'AA', 'E']);
    expect(unit.sounds.map((sound) => sound.words.length)).toEqual([28, 14, 19]);

    for (const [index, sound] of unit.sounds.entries()) {
      const rows = buildPronunciationRows(sound, unit.intro, index === 0);
      expect(rows).toHaveLength(sound.words.length);
      expect(rows[0]?.theoryText).not.toMatch(
        /(?:^|\n)(?:Từ vựng|Từ loại|Phiên âm|Ý nghĩa|adj|adv|n|v)(?:\n|$)/,
      );
    }
  });

  it('contains usable pronunciation groups for Units 2-6', () => {
    expect(Object.keys(pronunciation).sort()).toEqual(ALL_UNITS);

    for (const unitNumber of NEW_UNITS) {
      const unit = pronunciation[unitNumber as keyof typeof pronunciation];
      expect(unit.sounds.length, `Unit ${unitNumber} sounds`).toBeGreaterThanOrEqual(2);

      for (const [index, sound] of unit.sounds.entries()) {
        expect(sound.words.length, `Unit ${unitNumber} ${sound.title}`).toBeGreaterThan(0);
        const rows = buildPronunciationRows(sound, unit.intro, index === 0);
        expect(rows).toHaveLength(sound.words.length);
      }
    }
  });

  it('contains valid vocabulary payloads for Units 2-6', () => {
    expect(Object.keys(vocabulary.units).sort()).toEqual(ALL_UNITS);

    for (const unitNumber of NEW_UNITS) {
      const words = vocabulary.units[unitNumber as keyof typeof vocabulary.units];
      expect(words.length, `Unit ${unitNumber} vocabulary`).toBeGreaterThan(0);
      for (const item of words) {
        expect(item.word).not.toMatch(/[\r\n]/);
        expect(item.hint.trim()).not.toBe('');
        expect(() =>
          parseGamePayload('scramble', { word: item.word, hint: item.hint, image: '' }),
        ).not.toThrow();
      }
    }
  });

  it('contains valid reading quiz payloads for Units 2-6', () => {
    expect(Object.keys(reading.units).sort()).toEqual(ALL_UNITS);

    for (const unitNumber of NEW_UNITS) {
      const items = reading.units[unitNumber as keyof typeof reading.units];
      expect(items.length, `Unit ${unitNumber} reading`).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.skill).toBe('reading');
        expect(item.options).toContain(item.answer);
        expect(() => parseGamePayload('quiz', item)).not.toThrow();
      }
    }
  });
});

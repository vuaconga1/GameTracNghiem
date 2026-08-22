import { describe, expect, it } from 'vitest';

import {
  LOGISTICS_WEEK1_COURSES,
  LOGISTICS_WEEK2_COURSES,
  LOGISTICS_WEEK3_COURSES,
} from './logisticsUnits';
import {
  getCourseVocabDeck,
  L1_SCM_VOCAB,
  L1_SUPPLY_VOCAB,
  L2_BOOKING_VOCAB,
  L2_OPS_VOCAB,
  logisticsGameWord,
  W2_CONTAINER_VOCAB,
  W2_DG_VOCAB,
  W2_PHONE_VOCAB,
  W3_FEES_VOCAB,
  W3_FREEDAYS_VOCAB,
  W3_FREIGHT_VOCAB,
  W3_INVOICE_VOCAB,
} from './logisticsVocabDeck';

describe('getCourseVocabDeck', () => {
  it('returns a deck for every Logistics week 1 unit', () => {
    expect(getCourseVocabDeck(LOGISTICS_WEEK1_COURSES[0].id)).toEqual(L1_SUPPLY_VOCAB);
    expect(getCourseVocabDeck(LOGISTICS_WEEK1_COURSES[1].id)).toEqual(L1_SCM_VOCAB);
    expect(getCourseVocabDeck(LOGISTICS_WEEK1_COURSES[2].id)).toEqual(L2_OPS_VOCAB);
    expect(getCourseVocabDeck(LOGISTICS_WEEK1_COURSES[3].id)).toEqual(L2_BOOKING_VOCAB);
  });

  it('returns a deck for every Logistics week 2 unit', () => {
    expect(getCourseVocabDeck(LOGISTICS_WEEK2_COURSES[0].id)).toEqual(W2_PHONE_VOCAB);
    expect(getCourseVocabDeck(LOGISTICS_WEEK2_COURSES[1].id)).toEqual(W2_CONTAINER_VOCAB);
    expect(getCourseVocabDeck(LOGISTICS_WEEK2_COURSES[2].id)).toEqual(W2_DG_VOCAB);
  });

  it('returns a deck for every Logistics week 3 unit', () => {
    expect(getCourseVocabDeck(LOGISTICS_WEEK3_COURSES[0].id)).toEqual(W3_FREIGHT_VOCAB);
    expect(getCourseVocabDeck(LOGISTICS_WEEK3_COURSES[1].id)).toEqual(W3_INVOICE_VOCAB);
    expect(getCourseVocabDeck(LOGISTICS_WEEK3_COURSES[2].id)).toEqual(W3_FEES_VOCAB);
    expect(getCourseVocabDeck(LOGISTICS_WEEK3_COURSES[3].id)).toEqual(W3_FREEDAYS_VOCAB);
  });

  it('returns null for unknown courses', () => {
    expect(getCourseVocabDeck('unknown')).toBeNull();
  });

  it('covers key terms from each unit theme', () => {
    expect(L1_SCM_VOCAB.map((c) => c.word)).toContain('3PL / 4PL');
    expect(L2_OPS_VOCAB.map((c) => c.word)).toContain('Carrier');
    expect(L2_BOOKING_VOCAB.map((c) => c.word)).toContain('Book Space');
    expect(W2_PHONE_VOCAB.map((c) => c.word)).toContain('Tracking number');
    expect(W2_CONTAINER_VOCAB.map((c) => c.word)).toContain('Tare Weight');
    expect(W2_CONTAINER_VOCAB.map((c) => c.word)).not.toContain('Payload');
    expect(W2_DG_VOCAB.map((c) => c.word)).toContain('MSDS (Material Safety Data Sheet)');
    expect(W2_DG_VOCAB).toHaveLength(8);
    expect(W3_FREIGHT_VOCAB.map((c) => c.word)).toContain('Ocean Freight (O/F)');
    expect(W3_INVOICE_VOCAB.map((c) => c.word)).toContain('Debit Note');
    expect(W3_FEES_VOCAB.map((c) => c.word)).toContain('Fuel Fee (BAF)');
    expect(W3_FREEDAYS_VOCAB.map((c) => c.word)).toContain('Demurrage');
  });
});

describe('logisticsGameWord', () => {
  it('strips trailing parenthetical for scramble/pronunciation', () => {
    expect(logisticsGameWord('Dangerous Goods (DG)')).toBe('Dangerous Goods');
    expect(logisticsGameWord('MSDS (Material Safety Data Sheet)')).toBe('MSDS');
    expect(logisticsGameWord("High Cube Container (40'HC)")).toBe('High Cube Container');
    expect(logisticsGameWord('SOC (Shipper-Owned)')).toBe('SOC');
  });

  it('keeps words without parenthetical suffix unchanged', () => {
    expect(logisticsGameWord('Tracking number')).toBe('Tracking number');
    expect(logisticsGameWord('Tare Weight')).toBe('Tare Weight');
  });
});

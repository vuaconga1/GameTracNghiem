import { describe, expect, it } from 'vitest';

import {
  extractVocabHotspots,
  isVocabHeadword,
  textItemToViewportBox,
  type PdfTextBox,
} from './vocabHotspots';

describe('isVocabHeadword', () => {
  it('accepts logistics headwords', () => {
    expect(isVocabHeadword('Documentation')).toBe(true);
    expect(isVocabHeadword('3PL / 4PL')).toBe(true);
    expect(isVocabHeadword('1. Book Space')).toBe(true);
    expect(isVocabHeadword('Responsible for:')).toBe(true);
  });

  it('rejects sentence fragments and section titles', () => {
    expect(isVocabHeadword('before shipping out.')).toBe(false);
    expect(isVocabHeadword('Key Vocabulary')).toBe(false);
    expect(isVocabHeadword('Lesson Overview')).toBe(false);
    expect(isVocabHeadword('Managing how products move from raw')).toBe(false);
  });
});

describe('extractVocabHotspots', () => {
  it('splits Key Vocabulary Meaning cards without example fragments', () => {
    const items: PdfTextBox[] = [
      { str: 'Key Vocabulary', x: 40, y: 20, width: 200, height: 18 },
      { str: 'Documentation', x: 50, y: 80, width: 140, height: 16 },
      { str: 'Customer Service', x: 280, y: 80, width: 150, height: 16 },
      { str: 'Responsible for', x: 510, y: 80, width: 140, height: 16 },
      { str: 'Meaning:', x: 50, y: 105, width: 60, height: 12 },
      { str: 'Shipping papers.', x: 115, y: 105, width: 120, height: 12 },
      { str: 'Meaning:', x: 280, y: 105, width: 60, height: 12 },
      { str: 'Client support.', x: 345, y: 105, width: 110, height: 12 },
      { str: 'Meaning:', x: 510, y: 105, width: 60, height: 12 },
      { str: 'Job duties.', x: 575, y: 105, width: 90, height: 12 },
      { str: 'Example:', x: 50, y: 125, width: 60, height: 12 },
      { str: 'Check export documentation', x: 115, y: 125, width: 180, height: 12 },
      { str: 'before shipping out.', x: 50, y: 145, width: 140, height: 12 },
      { str: 'delayed parcel.', x: 280, y: 145, width: 120, height: 12 },
      { str: 'warehouse inventory.', x: 510, y: 145, width: 140, height: 12 },
    ];

    expect(extractVocabHotspots(items, 700, 500).map((s) => s.word)).toEqual([
      'Documentation',
      'Customer Service',
      'Responsible for',
    ]);
  });

  it('detects three-column term cards without Meaning labels', () => {
    const items: PdfTextBox[] = [
      { str: 'Basic Supply Chain Terms', x: 40, y: 30, width: 260, height: 20 },
      { str: 'Supply Chain (SCM)', x: 50, y: 120, width: 140, height: 14 },
      { str: '3PL / 4PL', x: 260, y: 120, width: 80, height: 14 },
      { str: 'Freight Forwarding', x: 450, y: 120, width: 140, height: 14 },
      { str: 'Managing how products move from raw', x: 50, y: 145, width: 180, height: 12 },
      { str: 'Hiring outside companies to handle transport,', x: 260, y: 145, width: 200, height: 12 },
      { str: 'An agency service that organizes', x: 450, y: 145, width: 170, height: 12 },
    ];

    expect(extractVocabHotspots(items, 700, 500).map((s) => s.word)).toEqual([
      'Supply Chain (SCM)',
      '3PL / 4PL',
      'Freight Forwarding',
    ]);
  });

  it('detects single-term flashcard pages', () => {
    const items: PdfTextBox[] = [
      { str: 'Logistics', x: 40, y: 30, width: 120, height: 22 },
      { str: 'Logistics', x: 40, y: 160, width: 110, height: 20 },
      {
        str: 'The detailed organization and implementation of a',
        x: 40,
        y: 200,
        width: 320,
        height: 12,
      },
      {
        str: 'complex operation, managing the flow of things between',
        x: 40,
        y: 220,
        width: 340,
        height: 12,
      },
    ];

    expect(extractVocabHotspots(items, 600, 500).map((s) => s.word)).toEqual(['Logistics']);
  });

  it('detects numbered Meaning list terms', () => {
    const items: PdfTextBox[] = [
      { str: 'Vocabulary - Part 1', x: 40, y: 20, width: 200, height: 18 },
      { str: '1. Book Space', x: 50, y: 80, width: 120, height: 14 },
      { str: 'Meaning:', x: 50, y: 100, width: 60, height: 12 },
      { str: 'To reserve a place for your goods on a', x: 120, y: 100, width: 220, height: 12 },
      { str: '2. Urgent', x: 50, y: 150, width: 90, height: 14 },
      { str: 'Meaning:', x: 50, y: 170, width: 60, height: 12 },
      { str: 'Very important and needs action right', x: 120, y: 170, width: 220, height: 12 },
    ];

    expect(extractVocabHotspots(items, 600, 500).map((s) => s.word)).toEqual([
      'Book Space',
      'Urgent',
    ]);
  });

  it('detects stacked term/definition pairs', () => {
    const items: PdfTextBox[] = [
      { str: 'More Key Shipping Terms', x: 40, y: 20, width: 220, height: 18 },
      { str: 'Carrier', x: 50, y: 100, width: 70, height: 14 },
      { str: 'The shipping line or transport company.', x: 50, y: 120, width: 260, height: 12 },
      { str: 'Available Dates', x: 50, y: 170, width: 120, height: 14 },
      {
        str: 'The specific days a ship can carry your goods.',
        x: 50,
        y: 190,
        width: 280,
        height: 12,
      },
    ];

    expect(extractVocabHotspots(items, 600, 500).map((s) => s.word)).toEqual([
      'Carrier',
      'Available Dates',
    ]);
  });

  it('skips lesson overview cards', () => {
    const items: PdfTextBox[] = [
      { str: 'Lesson Overview', x: 40, y: 20, width: 180, height: 18 },
      { str: 'Key Vocabulary', x: 50, y: 120, width: 120, height: 14 },
      { str: 'Urgent Sentences', x: 220, y: 120, width: 130, height: 14 },
      { str: 'Roleplay Practice', x: 400, y: 120, width: 130, height: 14 },
      { str: 'Learn 6 essential terms for', x: 50, y: 145, width: 160, height: 12 },
    ];
    expect(extractVocabHotspots(items, 600, 500)).toEqual([]);
  });
});

describe('textItemToViewportBox', () => {
  it('maps identity viewport transform to a top-left box', () => {
    const box = textItemToViewportBox('Hello', [1, 0, 0, 1, 10, 50], 40, 12, [1, 0, 0, 1, 0, 0]);
    expect(box).not.toBeNull();
    expect(box!.str).toBe('Hello');
    expect(box!.x).toBeCloseTo(10);
    expect(box!.y).toBeCloseTo(50 - 12);
  });
});

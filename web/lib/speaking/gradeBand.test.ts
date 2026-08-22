import { describe, expect, it } from 'vitest';

import {
  isSentenceCorrectionSpeakingGrade,
  resolveSpeakingGrade,
  speakingGradeBand,
} from '@/lib/speaking/gradeBand';

describe('speakingGradeBand', () => {
  it('uses sentence-correction mode for Global 1–5', () => {
    expect(speakingGradeBand(1)).toBe('grades_1_5');
    expect(speakingGradeBand(5)).toBe('grades_1_5');
    expect(isSentenceCorrectionSpeakingGrade({ grade: 4 })).toBe(true);
  });

  it('uses free conversation for Global 6–9', () => {
    expect(speakingGradeBand(6)).toBe('grades_6_9');
    expect(speakingGradeBand(9)).toBe('grades_6_9');
    expect(isSentenceCorrectionSpeakingGrade({ levelName: 'Lớp 8' })).toBe(
      false,
    );
  });

  it('defaults unknown levels to grade 8 (free conversation)', () => {
    expect(resolveSpeakingGrade({})).toBe(8);
    expect(isSentenceCorrectionSpeakingGrade({ levelName: 'Logistics' })).toBe(
      false,
    );
  });
});

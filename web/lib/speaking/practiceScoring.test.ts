import { describe, expect, it } from 'vitest';

import {
  MIN_REALTIME_PARTICIPATION_MS,
  realtimeSpeakingPracticeScore,
  speakingDrillPracticeScore,
} from '@/lib/speaking/practiceScoring';

describe('Speaking practice scoring policy', () => {
  it('maps low and high drill assessments through the existing speed policy', () => {
    expect(speakingDrillPracticeScore(69, 1_500)).toEqual({
      score: 69,
      isCorrect: false,
      elapsedMs: 1_500,
      points: -23,
    });
    expect(speakingDrillPracticeScore(70, 1_500)).toEqual({
      score: 70,
      isCorrect: true,
      elapsedMs: 1_500,
      points: 193,
    });
  });

  it('requires minimum Realtime participation and awards duration points', () => {
    const startedAt = new Date('2026-08-06T04:00:00.000Z');
    expect(
      realtimeSpeakingPracticeScore(
        startedAt,
        new Date(startedAt.getTime() + MIN_REALTIME_PARTICIPATION_MS - 1),
      ),
    ).toEqual({
      eligible: false,
      elapsedMs: MIN_REALTIME_PARTICIPATION_MS - 1,
      points: 0,
    });
    expect(
      realtimeSpeakingPracticeScore(
        startedAt,
        new Date(startedAt.getTime() + 95_000),
      ),
    ).toEqual({ eligible: true, elapsedMs: 95_000, points: 30 });
  });
});

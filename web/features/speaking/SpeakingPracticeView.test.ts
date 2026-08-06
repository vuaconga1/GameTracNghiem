import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import {
  crossedRealtimeWarningThreshold,
  realtimeSecondsRemaining,
} from '@/features/speaking/SpeakingPracticeView';

describe('SpeakingPracticeView server deadline countdown', () => {
  it('derives remaining time from mustEndAt instead of restarting duration', () => {
    const mustEndAt = '2026-08-06T03:03:00.000Z';

    expect(
      realtimeSecondsRemaining(
        mustEndAt,
        new Date('2026-08-06T03:01:20.250Z').getTime(),
      ),
    ).toBe(100);
    expect(
      realtimeSecondsRemaining(
        mustEndAt,
        new Date('2026-08-06T03:03:01.000Z').getTime(),
      ),
    ).toBe(0);
  });

  it('warns once when the server deadline crosses 30 seconds', () => {
    expect(crossedRealtimeWarningThreshold(31, 30)).toBe(true);
    expect(crossedRealtimeWarningThreshold(30, 29)).toBe(false);
    expect(crossedRealtimeWarningThreshold(1, 0)).toBe(false);
  });
});

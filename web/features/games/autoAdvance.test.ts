import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AUTO_ADVANCE_MS,
  clearAutoAdvance,
  scheduleAutoAdvance,
  type AdvanceTimerRef,
} from './autoAdvance';

describe('autoAdvance', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports a 10 second default delay', () => {
    expect(AUTO_ADVANCE_MS).toBe(10_000);
  });

  it('fires onAdvance after the delay and clears the ref', () => {
    vi.useFakeTimers();
    const timerRef: AdvanceTimerRef = { current: null };
    const onAdvance = vi.fn();

    scheduleAutoAdvance(timerRef, onAdvance);
    expect(timerRef.current).not.toBeNull();

    vi.advanceTimersByTime(AUTO_ADVANCE_MS - 1);
    expect(onAdvance).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(timerRef.current).toBeNull();
  });

  it('clearAutoAdvance prevents a pending advance', () => {
    vi.useFakeTimers();
    const timerRef: AdvanceTimerRef = { current: null };
    const onAdvance = vi.fn();

    scheduleAutoAdvance(timerRef, onAdvance);
    clearAutoAdvance(timerRef);
    vi.advanceTimersByTime(AUTO_ADVANCE_MS + 100);
    expect(onAdvance).not.toHaveBeenCalled();
  });
});

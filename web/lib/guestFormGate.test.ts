import { describe, expect, it } from 'vitest';

import {
  GUEST_FORM_GATE_DELAY_MS,
  GUEST_FORM_GATE_REMIND_MS,
  GUEST_FORM_GATE_STORAGE_KEY,
  ensureGuestFormGateSchedule,
  getGuestFormGateScheduleDelayMs,
  markGuestFormGateCompleted,
  markGuestFormGateDismissed,
  readGuestFormGateState,
  shouldShowGuestFormGateNow,
} from './guestFormGate';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe('guestFormGate', () => {
  it('schedules the first popup 15 minutes after the first visit', () => {
    const storage = createMemoryStorage();
    const now = 1_000;
    const state = ensureGuestFormGateSchedule(storage, now);

    expect(state.nextShowAt).toBe(now + GUEST_FORM_GATE_DELAY_MS);
    expect(getGuestFormGateScheduleDelayMs(state, now)).toBe(GUEST_FORM_GATE_DELAY_MS);
    expect(shouldShowGuestFormGateNow(true, storage, now)).toBe(false);
    expect(shouldShowGuestFormGateNow(true, storage, now + GUEST_FORM_GATE_DELAY_MS - 1)).toBe(
      false,
    );
    expect(shouldShowGuestFormGateNow(true, storage, now + GUEST_FORM_GATE_DELAY_MS)).toBe(true);
  });

  it('does not reset the first schedule on later visits', () => {
    const storage = createMemoryStorage();
    const first = ensureGuestFormGateSchedule(storage, 1_000);
    const second = ensureGuestFormGateSchedule(storage, 60_000);

    expect(second.nextShowAt).toBe(first.nextShowAt);
  });

  it('re-schedules every 10 minutes after dismiss until completed', () => {
    const storage = createMemoryStorage();
    ensureGuestFormGateSchedule(storage, 1_000);
    const dismissedAt = 50_000;
    markGuestFormGateDismissed(storage, dismissedAt);

    const state = readGuestFormGateState(storage);
    expect(state.nextShowAt).toBe(dismissedAt + GUEST_FORM_GATE_REMIND_MS);
    expect(shouldShowGuestFormGateNow(true, storage, dismissedAt)).toBe(false);
    expect(
      shouldShowGuestFormGateNow(true, storage, dismissedAt + GUEST_FORM_GATE_REMIND_MS),
    ).toBe(true);

    markGuestFormGateCompleted(storage);
    expect(getGuestFormGateScheduleDelayMs(readGuestFormGateState(storage), dismissedAt)).toBeNull();
    expect(
      shouldShowGuestFormGateNow(true, storage, dismissedAt + GUEST_FORM_GATE_REMIND_MS),
    ).toBe(false);
  });

  it('persists nextShowAt under the v3 storage key', () => {
    const storage = createMemoryStorage();
    ensureGuestFormGateSchedule(storage, 1_000);

    const raw = JSON.parse(storage.getItem(GUEST_FORM_GATE_STORAGE_KEY) || '{}') as {
      nextShowAt?: number;
    };
    expect(raw.nextShowAt).toBe(1_000 + GUEST_FORM_GATE_DELAY_MS);
  });
});

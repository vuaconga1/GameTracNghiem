import { describe, expect, it } from 'vitest';

import {
  GUEST_FORM_GATE_DELAY_MS,
  GUEST_FORM_GATE_REMIND_MS,
  GUEST_FORM_GATE_STORAGE_KEY,
  getGuestFormGateScheduleDelayMs,
  markGuestFormGateCompleted,
  markGuestFormGateDismissed,
  markGuestFormGateStarted,
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
  it('shows the first gate after the initial delay', () => {
    const storage = createMemoryStorage();
    const startedAt = markGuestFormGateStarted(storage, 1_000);

    expect(getGuestFormGateScheduleDelayMs(readGuestFormGateState(storage), startedAt)).toBe(
      GUEST_FORM_GATE_DELAY_MS,
    );
    expect(
      shouldShowGuestFormGateNow(true, storage, startedAt + GUEST_FORM_GATE_DELAY_MS - 1),
    ).toBe(false);
    expect(shouldShowGuestFormGateNow(true, storage, startedAt + GUEST_FORM_GATE_DELAY_MS)).toBe(
      true,
    );
  });

  it('re-schedules every 10 minutes after dismiss until completed', () => {
    const storage = createMemoryStorage();
    const dismissedAt = 50_000;
    markGuestFormGateStarted(storage, 10_000);
    markGuestFormGateDismissed(storage, dismissedAt);

    expect(getGuestFormGateScheduleDelayMs(readGuestFormGateState(storage), dismissedAt)).toBe(
      GUEST_FORM_GATE_REMIND_MS,
    );
    expect(
      shouldShowGuestFormGateNow(true, storage, dismissedAt + GUEST_FORM_GATE_REMIND_MS),
    ).toBe(true);

    markGuestFormGateCompleted(storage);
    expect(getGuestFormGateScheduleDelayMs(readGuestFormGateState(storage), dismissedAt)).toBeNull();
    expect(shouldShowGuestFormGateNow(true, storage, dismissedAt + GUEST_FORM_GATE_REMIND_MS)).toBe(
      false,
    );
  });

  it('persists dismissedAt in storage', () => {
    const storage = createMemoryStorage();
    markGuestFormGateStarted(storage, 1_000);
    markGuestFormGateDismissed(storage, 5_000);

    const raw = JSON.parse(storage.getItem(GUEST_FORM_GATE_STORAGE_KEY) || '{}') as {
      dismissedAt?: number;
    };
    expect(raw.dismissedAt).toBe(5_000);
  });
});

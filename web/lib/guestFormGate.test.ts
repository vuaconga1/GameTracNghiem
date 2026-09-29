import { describe, expect, it } from 'vitest';

import {
  GUEST_FORM_GATE_DELAY_MS,
  GUEST_FORM_GATE_SESSION_KEY,
  GUEST_FORM_GATE_STORAGE_KEY,
  ensureGuestFormGateSchedule,
  getGuestFormGateScheduleDelayMs,
  markGuestFormGateCompleted,
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
  it('does not show on open and waits 20 minutes from entering the site', () => {
    const storage = createMemoryStorage();
    const session = createMemoryStorage();
    const now = 1_000;
    const state = ensureGuestFormGateSchedule(storage, now, session);

    expect(state.enteredAt).toBe(now);
    expect(getGuestFormGateScheduleDelayMs(state, now)).toBe(GUEST_FORM_GATE_DELAY_MS);
    expect(shouldShowGuestFormGateNow(true, storage, now, session)).toBe(false);
    expect(
      shouldShowGuestFormGateNow(true, storage, now + GUEST_FORM_GATE_DELAY_MS - 1, session),
    ).toBe(false);
    expect(shouldShowGuestFormGateNow(true, storage, now + GUEST_FORM_GATE_DELAY_MS, session)).toBe(
      true,
    );
  });

  it('keeps the same clock when the page reloads in this visit', () => {
    const storage = createMemoryStorage();
    const session = createMemoryStorage();
    const first = ensureGuestFormGateSchedule(storage, 1_000, session);
    const second = ensureGuestFormGateSchedule(storage, 60_000, session);

    expect(second.enteredAt).toBe(first.enteredAt);
    expect(shouldShowGuestFormGateNow(true, storage, 60_000, session)).toBe(false);
  });

  it('starts a new 20-minute wait when the guest opens the site again', () => {
    const storage = createMemoryStorage();
    const firstSession = createMemoryStorage();
    ensureGuestFormGateSchedule(storage, 1_000, firstSession);

    const nextVisit = createMemoryStorage();
    const openedAt = 1_000 + GUEST_FORM_GATE_DELAY_MS + 5_000;
    expect(shouldShowGuestFormGateNow(true, storage, openedAt, nextVisit)).toBe(false);
    expect(readGuestFormGateState(storage, nextVisit).enteredAt).toBe(openedAt);
  });

  it('never shows again after the form is submitted', () => {
    const storage = createMemoryStorage();
    const session = createMemoryStorage();
    ensureGuestFormGateSchedule(storage, 1_000, session);
    markGuestFormGateCompleted(storage);

    const dueAt = 1_000 + GUEST_FORM_GATE_DELAY_MS;
    expect(getGuestFormGateScheduleDelayMs(readGuestFormGateState(storage, session), dueAt)).toBeNull();
    expect(shouldShowGuestFormGateNow(true, storage, dueAt, session)).toBe(false);
  });

  it('persists completion separately from the visit clock', () => {
    const storage = createMemoryStorage();
    const session = createMemoryStorage();
    ensureGuestFormGateSchedule(storage, 1_000, session);

    expect(session.getItem(GUEST_FORM_GATE_SESSION_KEY)).toBe('1000');
    expect(JSON.parse(storage.getItem(GUEST_FORM_GATE_STORAGE_KEY) || 'null')).toBeNull();

    markGuestFormGateCompleted(storage);
    expect(JSON.parse(storage.getItem(GUEST_FORM_GATE_STORAGE_KEY) || '{}')).toEqual({
      completed: true,
    });
  });
});

export const GUEST_FORM_GATE_STORAGE_KEY = 'wewin:guest-form-gate:v2';

/** First show after guest lands on the site. */
export const GUEST_FORM_GATE_DELAY_MS = 15 * 60 * 1000;

/** Re-show interval after guest dismisses without submitting. */
export const GUEST_FORM_GATE_REMIND_MS = 10 * 60 * 1000;

type GuestFormGateState = {
  startedAt: number | null;
  dismissedAt: number | null;
  completed: boolean;
};

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function emptyState(): GuestFormGateState {
  return { startedAt: null, dismissedAt: null, completed: false };
}

export function readGuestFormGateState(
  storage: Storage | null = browserStorage(),
): GuestFormGateState {
  if (!storage) return emptyState();

  try {
    const raw = JSON.parse(storage.getItem(GUEST_FORM_GATE_STORAGE_KEY) || 'null') as
      | Partial<GuestFormGateState>
      | null;
    if (!raw || typeof raw !== 'object') return emptyState();

    return {
      startedAt: Number.isFinite(Number(raw.startedAt)) ? Number(raw.startedAt) : null,
      dismissedAt: Number.isFinite(Number(raw.dismissedAt)) ? Number(raw.dismissedAt) : null,
      completed: raw.completed === true,
    };
  } catch {
    return emptyState();
  }
}

function writeGuestFormGateState(
  state: GuestFormGateState,
  storage: Storage | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(GUEST_FORM_GATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

export function markGuestFormGateStarted(
  storage: Storage | null = browserStorage(),
  now = Date.now(),
): number {
  const current = readGuestFormGateState(storage);
  if (current.startedAt != null) return current.startedAt;

  writeGuestFormGateState({ ...current, startedAt: now }, storage);
  return now;
}

export function markGuestFormGateDismissed(
  storage: Storage | null = browserStorage(),
  now = Date.now(),
): void {
  const current = readGuestFormGateState(storage);
  writeGuestFormGateState(
    {
      ...current,
      startedAt: current.startedAt ?? now,
      dismissedAt: now,
    },
    storage,
  );
}

export function markGuestFormGateCompleted(
  storage: Storage | null = browserStorage(),
  now = Date.now(),
): void {
  const current = readGuestFormGateState(storage);
  writeGuestFormGateState(
    {
      startedAt: current.startedAt ?? now,
      dismissedAt: current.dismissedAt,
      completed: true,
    },
    storage,
  );
}

/** Milliseconds until the gate should appear; `0` means show now; `null` means never. */
export function getGuestFormGateScheduleDelayMs(
  state: GuestFormGateState = readGuestFormGateState(),
  now = Date.now(),
): number | null {
  if (state.completed) return null;

  if (state.dismissedAt != null) {
    return Math.max(0, GUEST_FORM_GATE_REMIND_MS - (now - state.dismissedAt));
  }

  const startedAt = state.startedAt ?? now;
  return Math.max(0, GUEST_FORM_GATE_DELAY_MS - (now - startedAt));
}

export function shouldShowGuestFormGateNow(
  isGuest: boolean,
  storage: Storage | null = browserStorage(),
  now = Date.now(),
): boolean {
  if (!isGuest) return false;
  return getGuestFormGateScheduleDelayMs(readGuestFormGateState(storage), now) === 0;
}

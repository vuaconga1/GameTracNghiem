export const GUEST_FORM_GATE_STORAGE_KEY = 'wewin:guest-form-gate:v3';

/** First popup after guest lands on the site. */
export const GUEST_FORM_GATE_DELAY_MS = 15 * 60 * 1000;

/** Re-show interval after the guest dismisses (or the due popup was closed) without submitting. */
export const GUEST_FORM_GATE_REMIND_MS = 10 * 60 * 1000;

type GuestFormGateState = {
  /** Absolute time when the popup should next appear. */
  nextShowAt: number | null;
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
  return { nextShowAt: null, completed: false };
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
      nextShowAt: Number.isFinite(Number(raw.nextShowAt)) ? Number(raw.nextShowAt) : null,
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

/** Ensure first-visit schedule exists: show after 15 minutes. */
export function ensureGuestFormGateSchedule(
  storage: Storage | null = browserStorage(),
  now = Date.now(),
): GuestFormGateState {
  const current = readGuestFormGateState(storage);
  if (current.completed || current.nextShowAt != null) return current;

  const next: GuestFormGateState = {
    nextShowAt: now + GUEST_FORM_GATE_DELAY_MS,
    completed: false,
  };
  writeGuestFormGateState(next, storage);
  return next;
}

/** After dismiss (X): show again in 10 minutes. */
export function markGuestFormGateDismissed(
  storage: Storage | null = browserStorage(),
  now = Date.now(),
): void {
  const current = readGuestFormGateState(storage);
  if (current.completed) return;

  writeGuestFormGateState(
    {
      nextShowAt: now + GUEST_FORM_GATE_REMIND_MS,
      completed: false,
    },
    storage,
  );
}

export function markGuestFormGateCompleted(
  storage: Storage | null = browserStorage(),
): void {
  const current = readGuestFormGateState(storage);
  writeGuestFormGateState(
    {
      nextShowAt: current.nextShowAt,
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
  if (state.nextShowAt == null) return GUEST_FORM_GATE_DELAY_MS;
  return Math.max(0, state.nextShowAt - now);
}

export function shouldShowGuestFormGateNow(
  isGuest: boolean,
  storage: Storage | null = browserStorage(),
  now = Date.now(),
): boolean {
  if (!isGuest) return false;
  const state = ensureGuestFormGateSchedule(storage, now);
  return getGuestFormGateScheduleDelayMs(state, now) === 0;
}

export const GUEST_FORM_GATE_STORAGE_KEY = 'wewin:guest-form-gate:v4';
export const GUEST_FORM_GATE_SESSION_KEY = 'wewin:guest-form-gate:entered-at';

/** Show only after the guest has been on the site for 20 minutes this visit. */
export const GUEST_FORM_GATE_DELAY_MS = 20 * 60 * 1000;

type GuestFormGateState = {
  /** When this browser tab session started. Null until the visit is recorded. */
  enteredAt: number | null;
  completed: boolean;
};

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function browserSession(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function readEnteredAt(session: Storage | null): number | null {
  if (!session) return null;
  const value = Number(session.getItem(GUEST_FORM_GATE_SESSION_KEY));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function readGuestFormGateState(
  storage: Storage | null = browserStorage(),
  session: Storage | null = browserSession(),
): GuestFormGateState {
  const enteredAt = readEnteredAt(session);
  if (!storage) return { enteredAt, completed: false };

  try {
    const raw = JSON.parse(storage.getItem(GUEST_FORM_GATE_STORAGE_KEY) || 'null') as
      | { completed?: unknown }
      | null;
    return {
      enteredAt,
      completed: raw?.completed === true,
    };
  } catch {
    return { enteredAt, completed: false };
  }
}

function writeCompleted(storage: Storage | null, completed: boolean): void {
  if (!storage) return;
  try {
    storage.setItem(GUEST_FORM_GATE_STORAGE_KEY, JSON.stringify({ completed }));
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

/**
 * Start the 20-minute clock when the guest enters the site.
 * A new tab session always waits the full delay, so the form never appears on open.
 */
export function ensureGuestFormGateSchedule(
  storage: Storage | null = browserStorage(),
  now = Date.now(),
  session: Storage | null = browserSession(),
): GuestFormGateState {
  const current = readGuestFormGateState(storage, session);
  if (current.completed || current.enteredAt != null) return current;

  try {
    session?.setItem(GUEST_FORM_GATE_SESSION_KEY, String(now));
  } catch {
    // Ignore quota / privacy mode failures.
  }

  return { enteredAt: now, completed: false };
}

export function markGuestFormGateCompleted(
  storage: Storage | null = browserStorage(),
): void {
  writeCompleted(storage, true);
}

/** Milliseconds until the gate should appear; `0` means show now; `null` means never. */
export function getGuestFormGateScheduleDelayMs(
  state: GuestFormGateState = readGuestFormGateState(),
  now = Date.now(),
): number | null {
  if (state.completed) return null;
  if (state.enteredAt == null) return GUEST_FORM_GATE_DELAY_MS;
  return Math.max(0, state.enteredAt + GUEST_FORM_GATE_DELAY_MS - now);
}

export function shouldShowGuestFormGateNow(
  isGuest: boolean,
  storage: Storage | null = browserStorage(),
  now = Date.now(),
  session: Storage | null = browserSession(),
): boolean {
  if (!isGuest) return false;
  const state = ensureGuestFormGateSchedule(storage, now, session);
  return getGuestFormGateScheduleDelayMs(state, now) === 0;
}

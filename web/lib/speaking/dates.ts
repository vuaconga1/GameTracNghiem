import {
  DAILY_SPEAKING_LIMIT,
  SPEAKING_TIMEZONE,
} from '@/lib/speaking/config';

const VN_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: SPEAKING_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar date string YYYY-MM-DD in Asia/Ho_Chi_Minh for an instant. */
export function usageDateString(now: Date = new Date()): string {
  return VN_DATE_FORMATTER.format(now);
}

/**
 * Midnight 00:00:00 of the given VN calendar date as a UTC Date.
 * Asia/Ho_Chi_Minh is UTC+7 year-round (no DST).
 */
export function usageDateToUtcMidnight(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+07:00`);
}

/** Start of the next VN calendar day after `now` (when a new daily slot opens). */
export function nextAvailableAt(now: Date = new Date()): Date {
  const todayMidnight = usageDateToUtcMidnight(usageDateString(now));
  return new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);
}

/** True when reservation is still holding the slot. */
export function isReservationActive(
  reservedUntil: Date | null | undefined,
  now: Date = new Date()
): boolean {
  return reservedUntil != null && reservedUntil.getTime() > now.getTime();
}

/**
 * Whether the student may create a new STUDENT_PRACTICE session for today.
 * Expired RESERVED slots are reclaimable.
 */
export function canStartNewSession(
  status: string | null | undefined,
  reservedUntil: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!status || status === 'AVAILABLE') return true;
  if (status === 'CONSUMED') return false;
  if (status === 'RESERVED') {
    return !isReservationActive(reservedUntil, now);
  }
  return true;
}

export function buildDailyUsageResponse(input: {
  status: string | null | undefined;
  reservedUntil?: Date | null;
  sessionId?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const status = input.status ?? 'AVAILABLE';
  const usedToday = status === 'CONSUMED' ? DAILY_SPEAKING_LIMIT : 0;
  const remainingToday = Math.max(0, DAILY_SPEAKING_LIMIT - usedToday);
  const reservationActive =
    status === 'RESERVED' && isReservationActive(input.reservedUntil, now);

  return {
    canStart: canStartNewSession(status, input.reservedUntil, now),
    status,
    dailyLimit: DAILY_SPEAKING_LIMIT,
    usedToday,
    remainingToday,
    timezone: SPEAKING_TIMEZONE,
    nextAvailableAt:
      status === 'CONSUMED' ? nextAvailableAt(now).toISOString() : null,
    sessionId: input.sessionId ?? null,
    reservedUntil: input.reservedUntil?.toISOString() ?? null,
    reservationActive,
  };
}

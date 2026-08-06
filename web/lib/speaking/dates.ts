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
 * UTC-midnight representation of a Vietnam calendar label for Prisma @db.Date.
 * This is a date-only storage value, not the instant when Vietnam midnight occurs.
 */
export function usageDateToUtcMidnight(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** The actual instant when a Vietnam calendar date starts (UTC+7, no DST). */
function hoChiMinhMidnight(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+07:00`);
}

/** Parse a date-only admin value as midnight in Asia/Ho_Chi_Minh. */
export function parseHoChiMinhDateBoundary(dateStr: string): Date | null {
  const normalized = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const boundary = hoChiMinhMidnight(normalized);
  return Number.isNaN(boundary.getTime()) || usageDateString(boundary) !== normalized
    ? null
    : boundary;
}

/** Start of the next VN calendar day after `now` (when a new daily slot opens). */
export function nextAvailableAt(now: Date = new Date()): Date {
  const todayMidnight = hoChiMinhMidnight(usageDateString(now));
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
  status?: string | null;
  usedCount?: number | null;
  reservedCount?: number | null;
  limitSnapshot?: number | null;
  reservedUntil?: Date | null;
  sessionId?: string | null;
  activityType?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const dailyLimit = Math.max(1, input.limitSnapshot ?? DAILY_SPEAKING_LIMIT);
  const usedToday = Math.max(
    0,
    input.usedCount ?? (input.status === 'CONSUMED' ? 1 : 0),
  );
  const reservedToday = Math.max(
    0,
    input.reservedCount ?? (input.status === 'RESERVED' ? 1 : 0),
  );
  const remainingToday = Math.max(0, dailyLimit - usedToday);
  const reservationActive =
    reservedToday > 0 && isReservationActive(input.reservedUntil, now);
  const status =
    remainingToday === 0
      ? 'CONSUMED'
      : reservationActive
        ? 'RESERVED'
        : 'AVAILABLE';

  return {
    activityType: input.activityType ?? 'REALTIME_CONVERSATION',
    canStart: remainingToday > 0 && !reservationActive,
    status,
    used: usedToday,
    reserved: reservedToday,
    limit: dailyLimit,
    remaining: remainingToday,
    dailyLimit,
    usedToday,
    reservedToday,
    remainingToday,
    timezone: SPEAKING_TIMEZONE,
    nextAvailableAt:
      remainingToday === 0 ? nextAvailableAt(now).toISOString() : null,
    sessionId: input.sessionId ?? null,
    reservedUntil: input.reservedUntil?.toISOString() ?? null,
    reservationActive,
  };
}

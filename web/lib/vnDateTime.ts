/** Vietnam timezone helpers for class homework deadlines. */
export const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Parse admin datetime input as Asia/Ho_Chi_Minh local time.
 * Accepts `YYYY-MM-DDTHH:mm`, `YYYY-MM-DD HH:mm`, optional seconds, or ISO with offset/Z.
 */
export function parseHoChiMinhDateTime(value: unknown): Date | null {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const localMatch = raw.match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/
  );
  if (localMatch) {
    const [, date, hour, minute, second = '00'] = localMatch;
    const instant = new Date(`${date}T${hour}:${minute}:${second}+07:00`);
    return Number.isNaN(instant.getTime()) ? null : instant;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Format for class progress: giờ/ngày/tháng/năm in Asia/Ho_Chi_Minh. */
export function formatVnDateTime(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: VN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';

  return `${get('hour')}:${get('minute')}/${get('day')}/${get('month')}/${get('year')}`;
}

/** Value for `<input type="datetime-local">` showing Asia/Ho_Chi_Minh wall time. */
export function toVnDateTimeLocalInput(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

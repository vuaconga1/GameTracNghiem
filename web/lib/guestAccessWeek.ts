import { gradeFromLevelName } from '@/lib/vocabImagePath';
import { VN_TIMEZONE } from '@/lib/vnDateTime';

export const GLOBAL_SUCCESS_GRADES = [6, 7, 8, 9] as const;
export type GlobalSuccessGrade = (typeof GLOBAL_SUCCESS_GRADES)[number];

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export function globalSuccessGrade(levelName: string): GlobalSuccessGrade | null {
  const grade = gradeFromLevelName(levelName);
  if (grade === 6 || grade === 7 || grade === 8 || grade === 9) return grade;
  return null;
}

type VnCalendarDate = {
  year: number;
  month: number;
  day: number;
  /** 0 = Monday … 6 = Sunday in Asia/Ho_Chi_Minh. */
  weekdayIndex: number;
};

export function vnCalendarDate(value: Date): VnCalendarDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';
  const weekdayIndex = WEEKDAY_INDEX[get('weekday')];
  if (weekdayIndex === undefined) {
    throw new Error(`Unknown weekday: ${get('weekday')}`);
  }
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekdayIndex,
  };
}

export function formatIsoDate(year: number, month: number, day: number): string {
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.toISOString().slice(0, 10);
}

export function addCalendarDays(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`Invalid date: ${isoDate}`);
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days);
  return new Date(utc).toISOString().slice(0, 10);
}

/** Monday of the Vietnam week that contains `value`, as YYYY-MM-DD. */
export function vnWeekStartDate(value = new Date()): string {
  const calendar = vnCalendarDate(value);
  const iso = formatIsoDate(calendar.year, calendar.month, calendar.day);
  return addCalendarDays(iso, -calendar.weekdayIndex);
}

/** The finished Monday–Sunday week before the Vietnam week containing `value`. */
export function previousVnWeekRange(value = new Date()): { start: string; end: string } {
  const currentStart = vnWeekStartDate(value);
  const start = addCalendarDays(currentStart, -7);
  return { start, end: addCalendarDays(start, 6) };
}

export function formatVnReportDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

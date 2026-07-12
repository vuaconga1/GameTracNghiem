export type LeaderboardPeriod = 'day' | 'week' | 'month' | 'all';

const TZ = 'Asia/Ho_Chi_Minh';

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
};

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function getZonedParts(date: Date): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '0';

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
  };
}

export function hoChiMinhLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second, millisecond));
}

export function getIsoWeekNumber(year: number, month: number, day: number): number {
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getIsoDayOfWeek(year: number, month: number, day: number): number {
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}

export function getAnchorParts(
  period: LeaderboardPeriod,
  offset = 0,
  now = new Date()
): ZonedDateParts {
  const current = getZonedParts(now);

  if (period === 'all') {
    return current;
  }

  if (period === 'day' || period === 'week') {
    const shifted = new Date(
      Date.UTC(current.year, current.month - 1, current.day + (period === 'week' ? offset * 7 : offset))
    );
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
    };
  }

  const shifted = new Date(Date.UTC(current.year, current.month - 1 + offset, current.day));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function getPeriodKey(period: LeaderboardPeriod, date: Date): string {
  if (period === 'all') {
    return 'all';
  }

  const { year, month, day } = getZonedParts(date);

  if (period === 'day') {
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  if (period === 'month') {
    return `${year}-${pad2(month)}`;
  }

  return `${year}-W${pad2(getIsoWeekNumber(year, month, day))}`;
}

export function getPeriodBounds(
  period: LeaderboardPeriod,
  offset = 0,
  now = new Date()
): { start: Date; end: Date } | null {
  if (period === 'all') {
    return null;
  }

  const anchor = getAnchorParts(period, offset, now);

  if (period === 'day') {
    return {
      start: hoChiMinhLocalToUtc(anchor.year, anchor.month, anchor.day),
      end: hoChiMinhLocalToUtc(anchor.year, anchor.month, anchor.day + 1),
    };
  }

  if (period === 'month') {
    return {
      start: hoChiMinhLocalToUtc(anchor.year, anchor.month, 1),
      end: hoChiMinhLocalToUtc(anchor.year, anchor.month + 1, 1),
    };
  }

  const isoDay = getIsoDayOfWeek(anchor.year, anchor.month, anchor.day);
  const weekStart = new Date(Date.UTC(anchor.year, anchor.month - 1, anchor.day - (isoDay - 1)));
  const weekEnd = new Date(Date.UTC(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate() + 7));

  return {
    start: hoChiMinhLocalToUtc(
      weekStart.getUTCFullYear(),
      weekStart.getUTCMonth() + 1,
      weekStart.getUTCDate()
    ),
    end: hoChiMinhLocalToUtc(
      weekEnd.getUTCFullYear(),
      weekEnd.getUTCMonth() + 1,
      weekEnd.getUTCDate()
    ),
  };
}

export function getPeriodLabel(period: LeaderboardPeriod, offset = 0, now = new Date()): string {
  if (period === 'all') {
    return 'TẤT CẢ';
  }

  const anchor = getAnchorParts(period, offset, now);

  if (period === 'day') {
    return `${pad2(anchor.day)}/${pad2(anchor.month)}/${anchor.year}`;
  }

  if (period === 'month') {
    return `THÁNG ${anchor.month}/${anchor.year}`;
  }

  return `TUẦN ${getIsoWeekNumber(anchor.year, anchor.month, anchor.day)}`;
}

export function parseLeaderboardPeriod(value: string | null | undefined): LeaderboardPeriod {
  const period = String(value || 'week').trim().toLowerCase();
  if (period === 'day' || period === 'week' || period === 'month' || period === 'all') {
    return period;
  }
  return 'week';
}

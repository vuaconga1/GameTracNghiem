import { describe, expect, it } from 'vitest';

import {
  globalSuccessGrade,
  previousVnWeekRange,
  vnWeekStartDate,
} from './guestAccessWeek';

describe('guestAccessWeek', () => {
  it('keeps only Global Success grades 6 to 9', () => {
    expect(globalSuccessGrade('Lớp 6')).toBe(6);
    expect(globalSuccessGrade('Lớp 9')).toBe(9);
    expect(globalSuccessGrade('Lớp 5')).toBeNull();
    expect(globalSuccessGrade('English For Logistics')).toBeNull();
  });

  it('uses Monday as the Vietnam week start', () => {
    // Wednesday 14 Oct 2026 09:00 ICT
    expect(vnWeekStartDate(new Date('2026-10-14T02:00:00.000Z'))).toBe('2026-10-12');
  });

  it('reports the finished Monday–Sunday week before Tuesday 9:00', () => {
    // Tuesday 13 Oct 2026 09:00 ICT
    expect(previousVnWeekRange(new Date('2026-10-13T02:00:00.000Z'))).toEqual({
      start: '2026-10-05',
      end: '2026-10-11',
    });
  });
});

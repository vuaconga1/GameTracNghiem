import { describe, expect, it } from 'vitest';

import {
  assignmentDisplayTitle,
  computeAssignmentProgress,
  homeworkPlayHref,
  pickBestGrant,
  scoreOutOf10,
} from './classHomework';
import { parseHoChiMinhDateTime, formatVnDateTime } from './vnDateTime';

describe('classHomework scoring', () => {
  it('scores out of 10 from correct/total', () => {
    expect(scoreOutOf10(38, 40)).toBe(9.5);
    expect(scoreOutOf10(32, 40)).toBe(8);
    expect(scoreOutOf10(0, 40)).toBe(0);
  });

  it('picks the highest-score attempt', () => {
    const best = pickBestGrant([
      { correctCount: 30, answeredCount: 40, createdAt: new Date('2026-09-01T10:00:00Z') },
      { correctCount: 38, answeredCount: 40, createdAt: new Date('2026-09-02T10:00:00Z') },
      { correctCount: 35, answeredCount: 40, createdAt: new Date('2026-09-03T10:00:00Z') },
    ]);
    expect(best?.correctCount).toBe(38);
  });

  it('marks on-time vs late from first submission', () => {
    const deadline = new Date('2026-09-10T17:00:00+07:00');
    const late = computeAssignmentProgress({
      grants: [
        {
          correctCount: 38,
          answeredCount: 40,
          createdAt: new Date('2026-09-10T18:00:00+07:00'),
        },
        {
          correctCount: 40,
          answeredCount: 40,
          createdAt: new Date('2026-09-11T10:00:00+07:00'),
        },
      ],
      totalQuestions: 40,
      deadlineAt: deadline,
    });
    expect(late.status).toBe('done');
    expect(late.correctDisplay).toBe('40/40');
    expect(late.scoreDisplay).toBe('10');
    expect(late.attemptCount).toBe(2);
    expect(late.isLate).toBe(true);

    const onTime = computeAssignmentProgress({
      grants: [
        {
          correctCount: 20,
          answeredCount: 40,
          createdAt: new Date('2026-09-10T16:59:00+07:00'),
        },
      ],
      totalQuestions: 40,
      deadlineAt: deadline,
    });
    expect(onTime.isLate).toBe(false);
    expect(onTime.statusLabel).toBe('Đã làm');
  });

  it('returns pending when no grants', () => {
    const row = computeAssignmentProgress({
      grants: [],
      totalQuestions: 10,
      deadlineAt: new Date(),
    });
    expect(row.status).toBe('pending');
    expect(row.correctDisplay).toBe('—');
    expect(row.submittedAtDisplay).toBe('—');
  });
});

describe('classHomework links/labels', () => {
  it('builds play href with optional skill', () => {
    expect(homeworkPlayHref({ courseId: 'c1', gameKey: 'scramble' })).toBe(
      '/games/scramble/c1'
    );
    expect(
      homeworkPlayHref({ courseId: 'c1', gameKey: 'quiz', skillId: 'reading' })
    ).toBe('/games/quiz/c1?skill=reading');
  });

  it('formats assignment titles', () => {
    expect(
      assignmentDisplayTitle({
        courseName: 'Unit 5',
        gameLabel: 'Sắp xếp từ',
        skillLabel: 'Đọc',
      })
    ).toBe('Unit 5 → Đọc · Sắp xếp từ');
  });
});

describe('vnDateTime', () => {
  it('parses Ho Chi Minh wall clock without Z', () => {
    const d = parseHoChiMinhDateTime('2026-09-10T17:30');
    expect(d?.toISOString()).toBe('2026-09-10T10:30:00.000Z');
  });

  it('formats giờ/ngày/tháng/năm', () => {
    expect(formatVnDateTime(new Date('2026-09-10T10:30:00.000Z'))).toBe(
      '17:30/10/09/2026'
    );
  });
});

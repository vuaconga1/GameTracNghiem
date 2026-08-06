import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  groupBy: vi.fn().mockResolvedValue([
    { playSessionId: 'official-session', _sum: { points: 150 } },
  ]),
}));

vi.mock('@/lib/db', () => ({
  prisma: { scoreLog: { groupBy: mocks.groupBy } },
}));

import { getBestGameSessionScore } from '@/lib/gameScore';

describe('official per-game score', () => {
  it('excludes Speaking practice rows from game records', async () => {
    await expect(
      getBestGameSessionScore({
        userId: 'student-1',
        courseName: 'Unit 1',
        levelName: 'Lớp 8',
        game: 'quiz',
      }),
    ).resolves.toBe(150);

    expect(mocks.groupBy).toHaveBeenCalledWith({
      by: ['playSessionId'],
      where: {
        userId: 'student-1',
        game: 'quiz',
        course: { in: ['Unit 1|Lớp 8', 'Unit 1'] },
        countsForCourseTotal: true,
      },
      _sum: { points: true },
    });
  });
});

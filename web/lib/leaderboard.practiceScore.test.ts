import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  groupBy: vi.fn().mockResolvedValue([
    // Database aggregate intentionally represents official + Speaking points.
    { userId: 'student-1', _sum: { points: 130 } },
  ]),
  userFindMany: vi.fn().mockResolvedValue([
    {
      id: 'student-1',
      username: 'student',
      displayName: 'Student',
    },
  ]),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    scoreLog: { groupBy: mocks.groupBy },
    user: { findMany: mocks.userFindMany },
  },
}));

import { getLeaderboard } from '@/lib/leaderboard';

describe('leaderboard practice score inclusion', () => {
  it('sums every ScoreLog without the official-course filter', async () => {
    const result = await getLeaderboard('all');

    expect(mocks.groupBy).toHaveBeenCalledWith({
      by: ['userId'],
      where: undefined,
      _sum: { points: true },
    });
    expect(result.players).toEqual([
      {
        username: 'student',
        displayName: 'Student',
        points: 130,
      },
    ]);
  });
});

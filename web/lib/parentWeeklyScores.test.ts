import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  groupBy: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findFirst: mocks.findFirst },
    scoreLog: { groupBy: mocks.groupBy },
  },
}));

import { gameDisplayName, getParentWeeklyScore } from '@/lib/parentWeeklyScores';

describe('getParentWeeklyScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unmatched empty payload when the portal SID has no game user', async () => {
    mocks.findFirst.mockResolvedValue(null);

    const result = await getParentWeeklyScore({
      studentId: 'HV-1602',
      weekYear: 2026,
      isoWeek: 17,
    });

    expect(result).toMatchObject({
      ok: true,
      matched: false,
      studentId: 'HV-1602',
      weekKey: '2026-W17',
      totalPoints: 0,
      rank: null,
      classSize: 0,
      games: [],
      rankScope: 'global',
    });
    expect(mocks.groupBy).not.toHaveBeenCalled();
  });

  it('rejects an invalid ISO week without querying scores', async () => {
    const result = await getParentWeeklyScore({
      studentId: 'HV-1602',
      weekYear: 2025,
      isoWeek: 53,
    });

    expect(result).toEqual({
      ok: false,
      message: 'Tuần không hợp lệ',
      status: 400,
    });
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it('ranks the student globally and returns per-game points for that week', async () => {
    mocks.findFirst.mockResolvedValue({
      id: 'user-2',
      username: 'HV-1602',
      archivedAt: null,
    });
    mocks.groupBy.mockImplementation(async (args: { by: string[] }) => {
      if (args.by[0] === 'userId') {
        return [
          { userId: 'user-1', _sum: { points: 2000 } },
          { userId: 'user-2', _sum: { points: 1240 } },
          { userId: 'user-3', _sum: { points: 800 } },
        ];
      }
      return [
        { game: 'grammar', _sum: { points: 380 } },
        { game: 'quiz', _sum: { points: 310 } },
        { game: 'speaking_drill', _sum: { points: 120 } },
        { game: 'scramble', _sum: { points: 0 } },
      ];
    });

    const result = await getParentWeeklyScore({
      studentId: 'hv-1602',
      weekYear: 2026,
      isoWeek: 17,
    });

    expect(result).toMatchObject({
      ok: true,
      matched: true,
      totalPoints: 1240,
      rank: 2,
      classSize: 3,
      rankScope: 'global',
      rangeLabel: '20/04 – 26/04/2026',
    });
    if (!result.ok) throw new Error('expected ok payload');
    expect(result.games.map((row) => row.key)).toEqual(['grammar', 'quiz', 'speaking_drill']);
    expect(result.games[0]).toEqual({ key: 'grammar', name: 'Ngữ pháp', points: 380 });
    expect(result.games[2]).toEqual({
      key: 'speaking_drill',
      name: 'Luyện nói',
      points: 120,
    });
  });

  it('returns an empty week when the student exists but has no ScoreLog that week', async () => {
    mocks.findFirst.mockResolvedValue({
      id: 'user-9',
      username: 'HV-9999',
      archivedAt: null,
    });
    mocks.groupBy.mockImplementation(async (args: { by: string[] }) => {
      if (args.by[0] === 'userId') {
        return [{ userId: 'someone-else', _sum: { points: 50 } }];
      }
      return [];
    });

    const result = await getParentWeeklyScore({
      studentId: 'HV-9999',
      weekYear: 2026,
      isoWeek: 16,
    });

    expect(result).toMatchObject({
      ok: true,
      matched: true,
      totalPoints: 0,
      rank: null,
      classSize: 1,
      games: [],
    });
  });
});

describe('gameDisplayName', () => {
  it('uses catalog labels and speaking fallbacks', () => {
    expect(gameDisplayName('pronunciation')).toBe('Phát âm');
    expect(gameDisplayName('speaking_realtime')).toBe('AI Speaking');
    expect(gameDisplayName('custom_mod')).toBe('custom_mod');
  });
});

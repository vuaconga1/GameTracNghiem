import { prisma } from '@/lib/db';
import {
  getPeriodBounds,
  getPeriodLabel,
  type LeaderboardPeriod,
} from '@/lib/leaderboardPeriod';

export type { LeaderboardPeriod } from '@/lib/leaderboardPeriod';
export {
  getAnchorParts,
  getPeriodBounds,
  getPeriodKey,
  getPeriodLabel,
  getIsoWeekNumber,
  hoChiMinhLocalToUtc,
  parseLeaderboardPeriod,
} from '@/lib/leaderboardPeriod';

export type LeaderboardPlayer = {
  username: string;
  displayName: string;
  points: number;
};

export type LeaderboardResult = {
  period: LeaderboardPeriod;
  label: string;
  players: LeaderboardPlayer[];
};

export async function getLeaderboard(
  period: LeaderboardPeriod,
  offset = 0
): Promise<LeaderboardResult> {
  const bounds = getPeriodBounds(period, offset);
  const label = getPeriodLabel(period, offset);

  const grouped = await prisma.scoreLog.groupBy({
    by: ['userId'],
    where: bounds
      ? {
          answeredAt: {
            gte: bounds.start,
            lt: bounds.end,
          },
        }
      : undefined,
    _sum: {
      points: true,
    },
  });

  if (grouped.length === 0) {
    return { period, label, players: [] };
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: grouped.map((row) => row.userId),
      },
    },
    select: {
      id: true,
      username: true,
      displayName: true,
    },
  });
  const userById = new Map(users.map((user) => [user.id, user]));

  const players = grouped
    .map((row) => {
      const user = userById.get(row.userId);
      return {
        username: user?.username ?? '',
        displayName: user?.displayName ?? '',
        points: row._sum.points ?? 0,
      };
    })
    .filter((player) => player.username)
    .sort((a, b) => b.points - a.points);

  return { period, label, players };
}

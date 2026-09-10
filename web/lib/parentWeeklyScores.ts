import { prisma } from '@/lib/db';
import { GAME_CATALOG } from '@/lib/gameCatalog';
import {
  formatIsoWeekRangeLabel,
  getIsoWeekBoundsFromKey,
} from '@/lib/leaderboardPeriod';

export type ParentWeeklyGameRow = {
  key: string;
  name: string;
  points: number;
};

export type ParentWeeklyScorePayload = {
  ok: true;
  studentId: string;
  matched: boolean;
  weekKey: string;
  isoWeek: number;
  weekYear: number;
  rangeLabel: string;
  totalPoints: number;
  rank: number | null;
  classSize: number;
  rankScope: 'global';
  games: ParentWeeklyGameRow[];
};

export type ParentWeeklyScoreError = {
  ok: false;
  message: string;
  status: number;
};

const EXTRA_GAME_LABELS: Record<string, string> = {
  speaking_drill: 'Luyện nói',
  speaking_realtime: 'AI Speaking',
  speaking: 'Luyện nói',
};

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function weekKeyFromParts(weekYear: number, isoWeek: number): string {
  return `${weekYear}-W${pad2(isoWeek)}`;
}

export function gameDisplayName(gameKey: string): string {
  const catalog = GAME_CATALOG.find((item) => item.key === gameKey);
  if (catalog) return catalog.label;
  return EXTRA_GAME_LABELS[gameKey] || gameKey;
}

function catalogOrder(gameKey: string): number {
  const index = GAME_CATALOG.findIndex((item) => item.key === gameKey);
  return index === -1 ? 1000 : index;
}

export async function getParentWeeklyScore(input: {
  studentId: string;
  weekYear: number;
  isoWeek: number;
}): Promise<ParentWeeklyScorePayload | ParentWeeklyScoreError> {
  const studentId = String(input.studentId || '').trim();
  if (!studentId) {
    return { ok: false, message: 'Thiếu mã học viên', status: 400 };
  }

  const bounds = getIsoWeekBoundsFromKey(input.weekYear, input.isoWeek);
  if (!bounds) {
    return { ok: false, message: 'Tuần không hợp lệ', status: 400 };
  }

  const weekKey = weekKeyFromParts(input.weekYear, input.isoWeek);
  const rangeLabel = formatIsoWeekRangeLabel(input.weekYear, input.isoWeek);
  const base = {
    ok: true as const,
    studentId,
    weekKey,
    isoWeek: input.isoWeek,
    weekYear: input.weekYear,
    rangeLabel,
    rankScope: 'global' as const,
  };

  const user = await prisma.user.findFirst({
    where: { username: { equals: studentId, mode: 'insensitive' } },
    select: { id: true, username: true, archivedAt: true },
  });

  if (!user || user.archivedAt) {
    return {
      ...base,
      matched: false,
      totalPoints: 0,
      rank: null,
      classSize: 0,
      games: [],
    };
  }

  const [grouped, gameGroups] = await Promise.all([
    prisma.scoreLog.groupBy({
      by: ['userId'],
      where: {
        answeredAt: {
          gte: bounds.start,
          lt: bounds.end,
        },
      },
      _sum: { points: true },
    }),
    prisma.scoreLog.groupBy({
      by: ['game'],
      where: {
        userId: user.id,
        answeredAt: {
          gte: bounds.start,
          lt: bounds.end,
        },
      },
      _sum: { points: true },
    }),
  ]);

  const players = grouped
    .map((row) => ({
      userId: row.userId,
      points: row._sum.points ?? 0,
    }))
    .sort((a, b) => b.points - a.points);

  const index = players.findIndex((player) => player.userId === user.id);
  const totalPoints = index >= 0 ? players[index].points : 0;
  const rank = index >= 0 ? index + 1 : null;

  const games = gameGroups
    .map((row) => ({
      key: row.game,
      name: gameDisplayName(row.game),
      points: row._sum.points ?? 0,
    }))
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points || catalogOrder(a.key) - catalogOrder(b.key));

  return {
    ...base,
    matched: true,
    totalPoints,
    rank,
    classSize: players.length,
    games,
  };
}

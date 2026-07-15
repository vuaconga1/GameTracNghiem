import 'server-only';

import { scoreLookupCourseKeys } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import {
  bestSessionScoreFromGroups,
  parseProgressCourseKey,
} from '@/lib/playSession';

export {
  bestSessionScoreFromGroups,
  normalizePlaySessionKey,
  newPlaySessionId,
  parseProgressCourseKey,
} from '@/lib/playSession';

export async function getBestGameSessionScore(params: {
  userId: string;
  courseName: string;
  levelName?: string | null;
  game: string;
}): Promise<number> {
  const courseKeys = scoreLookupCourseKeys(params.courseName, params.levelName);
  if (!courseKeys.length) return 0;

  const groups = await prisma.scoreLog.groupBy({
    by: ['playSessionId'],
    where: {
      userId: params.userId,
      game: params.game,
      course: { in: courseKeys },
    },
    _sum: {
      points: true,
    },
  });

  return bestSessionScoreFromGroups(
    groups.map((row) => ({
      playSessionId: row.playSessionId,
      points: row._sum.points ?? 0,
    }))
  );
}

export async function getBestGameSessionScoreForCourseKey(
  userId: string,
  courseKey: string,
  game: string
): Promise<number> {
  const { courseName, levelName } = parseProgressCourseKey(courseKey);
  return getBestGameSessionScore({ userId, courseName, levelName, game });
}

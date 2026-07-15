import { progressCourseKey } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import { progressStatuses, type ProgressStatus } from '@/lib/gameCatalog';
import { getBestGameSessionScore } from '@/lib/gameScore';

export type GamePlayerState = {
  statuses: ProgressStatus[];
  playSessionId: string | null;
  gameScore: number;
};

export async function loadGamePlayerState(params: {
  userId: string;
  courseName: string;
  levelName?: string | null;
  game: string;
}): Promise<GamePlayerState> {
  const courseKey = progressCourseKey(params.courseName, params.levelName);
  const [progress, gameScore] = await Promise.all([
    prisma.gameProgress.findUnique({
      where: {
        userId_courseKey_game: {
          userId: params.userId,
          courseKey,
          game: params.game,
        },
      },
      select: {
        statuses: true,
        playSessionId: true,
      },
    }),
    getBestGameSessionScore({
      userId: params.userId,
      courseName: params.courseName,
      levelName: params.levelName,
      game: params.game,
    }),
  ]);

  return {
    statuses: progressStatuses(progress?.statuses),
    playSessionId: progress?.playSessionId || null,
    gameScore,
  };
}

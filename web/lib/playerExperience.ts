import { prisma } from './db';
import {
  calculateSessionExperience,
  profileFromTotalExp,
  type ExperienceProfile,
} from './experience';

const TIME_LIMIT_MS = 30_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function speedFactor(elapsedMs: number): number {
  return clamp(1 - elapsedMs / TIME_LIMIT_MS, 0, 1);
}

function statusError(message: string, status: number): Error {
  return Object.assign(new Error(message), { status });
}

function isPrismaUniqueConflict(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: unknown }).code === 'P2002',
  );
}

type ScoreSessionRow = {
  course: string;
  game: string;
  isCorrect: boolean;
  elapsedMs: number;
};

type GrantSummary = {
  playSessionId: string;
  exp: number;
  answeredCount: number;
  correctCount: number;
};

function grantSummaryFromRow(grant: {
  playSessionId: string;
  exp: number;
  answeredCount: number;
  correctCount: number;
}): GrantSummary {
  return {
    playSessionId: grant.playSessionId,
    exp: grant.exp,
    answeredCount: grant.answeredCount,
    correctCount: grant.correctCount,
  };
}

function averageCorrectSpeed(rows: ScoreSessionRow[]): number {
  const correctRows = rows.filter((row) => row.isCorrect);
  if (correctRows.length === 0) return 0;
  return (
    correctRows.reduce((sum, row) => sum + speedFactor(row.elapsedMs), 0) /
    correctRows.length
  );
}

function assertHomogeneousSession(rows: ScoreSessionRow[]): void {
  const { course, game } = rows[0];
  for (const row of rows) {
    if (row.course !== course || row.game !== game) {
      throw statusError('Play session contains mixed course or game rows', 409);
    }
  }
}

export async function getExperienceProfile(userId: string): Promise<ExperienceProfile> {
  const row = await prisma.playerExperience.findUnique({
    where: { userId },
    select: { totalExp: true },
  });
  return profileFromTotalExp(row?.totalExp ?? 0);
}

export async function completeExperienceSession(
  userId: string,
  playSessionId: string,
): Promise<{
  alreadyGranted: boolean;
  grant: GrantSummary;
  profile: ExperienceProfile;
}> {
  const rows = await prisma.scoreLog.findMany({
    where: { userId, playSessionId },
    select: { course: true, game: true, isCorrect: true, elapsedMs: true },
  });

  if (rows.length === 0) {
    throw statusError('No score rows found for play session', 404);
  }

  assertHomogeneousSession(rows);

  const existing = await prisma.experienceGrant.findUnique({
    where: { userId_playSessionId: { userId, playSessionId } },
  });

  if (existing) {
    return {
      alreadyGranted: true,
      grant: grantSummaryFromRow(existing),
      profile: await getExperienceProfile(userId),
    };
  }

  const exp = calculateSessionExperience(rows);
  const answeredCount = rows.length;
  const correctCount = rows.filter((row) => row.isCorrect).length;
  const avgSpeed = averageCorrectSpeed(rows);
  const { course, game } = rows[0];

  try {
    const experience = await prisma.$transaction(async (tx) => {
      await tx.experienceGrant.create({
        data: {
          userId,
          playSessionId,
          course,
          game,
          exp,
          answeredCount,
          correctCount,
          averageCorrectSpeed: avgSpeed,
        },
      });

      return tx.playerExperience.upsert({
        where: { userId },
        create: { userId, totalExp: exp },
        update: { totalExp: { increment: exp } },
      });
    });

    return {
      alreadyGranted: false,
      grant: {
        playSessionId,
        exp,
        answeredCount,
        correctCount,
      },
      profile: profileFromTotalExp(experience.totalExp),
    };
  } catch (error) {
    if (!isPrismaUniqueConflict(error)) {
      throw error;
    }

    const winningGrant = await prisma.experienceGrant.findUnique({
      where: { userId_playSessionId: { userId, playSessionId } },
    });
    if (!winningGrant) {
      throw error;
    }

    return {
      alreadyGranted: true,
      grant: grantSummaryFromRow(winningGrant),
      profile: await getExperienceProfile(userId),
    };
  }
}

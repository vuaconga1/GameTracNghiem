/**
 * Smoke test: append ScoreLog via same logic as POST /api/score/submit and verify aggregate.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { calculatePoints, SCORING } from '../lib/scoring';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(connectionString),
});

async function main() {
  const user = await prisma.user.findUnique({ where: { username: 'demo' } });
  if (!user) {
    throw new Error('Demo user not found — run npm run db:seed first');
  }

  const course = 'EveryUp';
  const game = 'grammar';
  const questionIndex = 0;
  const isCorrect = true;
  const elapsedMs = 1000;

  const points = calculatePoints(isCorrect, elapsedMs);
  if (points < SCORING.CORRECT_MIN || points > SCORING.CORRECT_MAX) {
    throw new Error(`Expected points in [${SCORING.CORRECT_MIN}, ${SCORING.CORRECT_MAX}], got ${points}`);
  }

  const beforeCount = await prisma.scoreLog.count({
    where: { userId: user.id, course, game, questionIndex },
  });

  await prisma.scoreLog.create({
    data: {
      userId: user.id,
      course,
      game,
      questionIndex,
      isCorrect,
      elapsedMs,
      points,
    },
  });

  const afterCount = await prisma.scoreLog.count({
    where: { userId: user.id, course, game, questionIndex },
  });

  const aggregate = await prisma.scoreLog.aggregate({
    where: { userId: user.id, course },
    _sum: { points: true },
  });

  const courseScore = aggregate._sum.points ?? 0;
  const latest = await prisma.scoreLog.findFirst({
    where: { userId: user.id, course },
    orderBy: { answeredAt: 'desc' },
  });

  console.log('Smoke score submit OK');
  console.log('  user:', user.username);
  console.log('  points:', points);
  console.log('  courseScore:', courseScore);
  console.log('  rows for question:', `${beforeCount} -> ${afterCount}`);
  console.log('  latest row id:', latest?.id);

  if (afterCount !== beforeCount + 1) {
    throw new Error('ScoreLog row was not appended');
  }
  if (!latest || latest.points !== points) {
    throw new Error('Latest ScoreLog row does not match submitted points');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

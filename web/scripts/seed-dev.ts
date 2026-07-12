/**
 * Dev-only seed: demo user, sample course, grammar questions.
 * Password `123123` is for local development only — never use in production.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(connectionString),
});

async function main() {
  const passwordHash = await bcrypt.hash('123123', 10);

  const user = await prisma.user.upsert({
    where: { username: 'demo' },
    update: { passwordHash, displayName: 'Học sinh Demo' },
    create: {
      username: 'demo',
      passwordHash,
      displayName: 'Học sinh Demo',
    },
  });

  await prisma.classLevel.upsert({
    where: { className_levelName: { className: 'Lớp 8', levelName: 'Cấp Lớp 8' } },
    update: { active: true },
    create: { className: 'Lớp 8', levelName: 'Cấp Lớp 8', active: true },
  });

  const course = await prisma.course.upsert({
    where: { id: 'seed-course-everyup' },
    update: {
      name: 'EveryUp',
      className: 'Lớp 8',
      levelName: 'Cấp Lớp 8',
      active: true,
    },
    create: {
      id: 'seed-course-everyup',
      name: 'EveryUp',
      className: 'Lớp 8',
      levelName: 'Cấp Lớp 8',
      active: true,
    },
  });

  await prisma.question.deleteMany({ where: { courseId: course.id, game: 'grammar' } });

  await prisma.question.createMany({
    data: [
      {
        courseId: course.id,
        game: 'grammar',
        level: 'Cấp Lớp 8',
        sortOrder: 1,
        payload: {
          source: '',
          prefix: 'She',
          suffix: 'to school every day.',
          hint: 'go / goes',
          answers: ['goes'],
        },
      },
      {
        courseId: course.id,
        game: 'grammar',
        level: 'Cấp Lớp 8',
        sortOrder: 2,
        payload: {
          source: '',
          prefix: 'They',
          suffix: 'football yesterday.',
          hint: 'play / played',
          answers: ['played'],
        },
      },
    ],
  });

  console.log('Seeded user demo / 123123 and course', course.name, 'for', user.username);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

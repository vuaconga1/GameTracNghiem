import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const [courses, questions, users, classLevels, byGame] = await Promise.all([
      prisma.course.count({ where: { active: true, ...notArchived } }),
      prisma.question.count({ where: { active: true, ...notArchived } }),
      prisma.user.count({ where: notArchived }),
      prisma.classLevel.count({ where: { active: true, ...notArchived } }),
      prisma.question.groupBy({
        by: ['game'],
        where: { active: true, ...notArchived },
        _count: { _all: true },
        orderBy: { game: 'asc' },
      }),
    ]);
    return Response.json({
      success: true,
      stats: {
        courses,
        questions,
        users,
        classLevels,
        byGame: byGame.map((row) => ({ game: row.game, count: row._count._all })),
      },
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

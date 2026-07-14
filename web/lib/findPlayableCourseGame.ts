import { prisma } from '@/lib/db';
import { isGameEnabledForCourse } from '@/lib/gameCatalog';

/** Load active course and ensure the game is enabled for students. */
export async function findPlayableCourseGame(courseId: string, gameKey: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, active: true, archivedAt: null },
    select: {
      id: true,
      name: true,
      levelName: true,
      enabledGames: true,
    },
  });
  if (!course) return null;
  if (!isGameEnabledForCourse(course.enabledGames, gameKey)) return null;
  return course;
}

import { prisma } from '@/lib/db';
import { isGameVisibleForCourse } from '@/lib/skillCatalog';

/** Load active course and ensure the game is visible for students (skill-assigned). */
export async function findPlayableCourseGame(courseId: string, gameKey: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, active: true, archivedAt: null },
    select: {
      id: true,
      name: true,
      levelName: true,
      enabledGames: true,
      gameSkills: true,
      enabledSkills: true,
    },
  });
  if (!course) return null;
  if (
    !isGameVisibleForCourse(
      course.gameSkills,
      course.enabledSkills,
      gameKey,
      course.enabledGames
    )
  ) {
    return null;
  }
  return course;
}

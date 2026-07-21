import 'server-only';

import { prisma } from '@/lib/db';
import { isGameEnabledForCourse } from '@/lib/gameCatalog';

export type CourseGameLessonDescriptor = {
  ebookId: string;
  pageStart: number;
  pageEnd: number;
};

export async function loadCourseGameLesson(
  courseId: string,
  gameKey: string,
): Promise<CourseGameLessonDescriptor | null> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, active: true, archivedAt: null },
    select: {
      enabledGames: true,
      ebookFileId: true,
      gameLessons: {
        where: { gameKey },
        select: { pageStart: true, pageEnd: true },
        take: 1,
      },
    },
  });

  if (!course || !isGameEnabledForCourse(course.enabledGames, gameKey)) return null;

  const lesson = course.gameLessons[0];
  if (!course.ebookFileId || !lesson) return null;

  const ebook = await prisma.ebook.findFirst({
    where: { id: course.ebookFileId, active: true, archivedAt: null },
    select: { id: true },
  });
  if (!ebook) return null;

  return {
    ebookId: ebook.id,
    pageStart: lesson.pageStart,
    pageEnd: lesson.pageEnd,
  };
}

import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { LazyReadAndMatchGame } from '@/features/games/lazyGames';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';

export default async function ReadAndMatchGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const lesson = await loadCourseGameLesson(courseId, 'read_and_match');
  return (
    <GameLessonTabs lesson={lesson}>
      <LazyReadAndMatchGame courseId={courseId} />
    </GameLessonTabs>
  );
}

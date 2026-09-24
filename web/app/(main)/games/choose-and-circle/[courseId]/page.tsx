import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { LazyChooseAndCircleGame } from '@/features/games/lazyGames';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';

export default async function ChooseAndCircleGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const lesson = await loadCourseGameLesson(courseId, 'choose_and_circle');
  return (
    <GameLessonTabs lesson={lesson}>
      <LazyChooseAndCircleGame courseId={courseId} />
    </GameLessonTabs>
  );
}

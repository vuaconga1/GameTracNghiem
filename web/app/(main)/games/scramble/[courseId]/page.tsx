import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { LazyScrambleGame } from '@/features/games/lazyGames';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';

export default async function ScrambleGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const lesson = await loadCourseGameLesson(courseId, 'scramble');
  return (
    <GameLessonTabs lesson={lesson}>
      <LazyScrambleGame courseId={courseId} />
    </GameLessonTabs>
  );
}

import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { ReadAndCompleteGame } from '@/features/games/read-and-complete/ReadAndCompleteGame';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';

export default async function ReadAndCompleteGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const lesson = await loadCourseGameLesson(courseId, 'read_and_complete');
  return (
    <GameLessonTabs lesson={lesson}>
      <ReadAndCompleteGame courseId={courseId} />
    </GameLessonTabs>
  );
}

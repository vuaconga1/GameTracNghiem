import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { ReadAndMatchGame } from '@/features/games/read-and-match/ReadAndMatchGame';
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
      <ReadAndMatchGame courseId={courseId} />
    </GameLessonTabs>
  );
}

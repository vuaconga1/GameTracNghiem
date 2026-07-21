import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { LookAndWriteGame } from '@/features/games/look-and-write/LookAndWriteGame';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';

export default async function LookAndWriteGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const lesson = await loadCourseGameLesson(courseId, 'look_and_write');
  return (
    <GameLessonTabs lesson={lesson}>
      <LookAndWriteGame courseId={courseId} />
    </GameLessonTabs>
  );
}

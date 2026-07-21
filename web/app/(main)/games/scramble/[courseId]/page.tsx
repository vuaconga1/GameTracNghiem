import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { ScrambleGame } from '@/features/games/scramble/ScrambleGame';
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
      <ScrambleGame courseId={courseId} />
    </GameLessonTabs>
  );
}

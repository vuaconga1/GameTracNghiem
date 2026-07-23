import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { PronunciationGame } from '@/features/games/pronunciation/PronunciationGame';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';
import '@/features/games/pronunciation/pronunciation.css';

export default async function PronunciationGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const lesson = await loadCourseGameLesson(courseId, 'pronunciation');
  return (
    <GameLessonTabs lesson={lesson}>
      <PronunciationGame courseId={courseId} />
    </GameLessonTabs>
  );
}

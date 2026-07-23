import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { GrammarGame } from '@/features/games/grammar/GrammarGame';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';

export default async function GrammarGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const lesson = await loadCourseGameLesson(courseId, 'grammar');
  return (
    <GameLessonTabs lesson={lesson}>
      <GrammarGame courseId={courseId} />
    </GameLessonTabs>
  );
}

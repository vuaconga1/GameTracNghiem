import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { LazyGrammarGame } from '@/features/games/lazyGames';
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
      <LazyGrammarGame courseId={courseId} />
    </GameLessonTabs>
  );
}

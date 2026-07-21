import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { VocabularyTestGame } from '@/features/games/vocabulary-test/VocabularyTestGame';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';

export default async function VocabularyTestGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const lesson = await loadCourseGameLesson(courseId, 'vocabulary_test');
  return (
    <GameLessonTabs lesson={lesson}>
      <VocabularyTestGame courseId={courseId} />
    </GameLessonTabs>
  );
}

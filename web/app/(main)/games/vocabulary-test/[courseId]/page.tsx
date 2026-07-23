import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { VocabularyTestGame } from '@/features/games/vocabulary-test/VocabularyTestGame';
import { requireSession } from '@/lib/auth';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';
import { loadVocabularyTestGame } from '@/lib/loadVocabularyTestGame';

export default async function VocabularyTestGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await requireSession();
  const [lesson, initialData] = await Promise.all([
    loadCourseGameLesson(courseId, 'vocabulary_test'),
    loadVocabularyTestGame(courseId, session.userId),
  ]);
  return (
    <GameLessonTabs lesson={lesson}>
      <VocabularyTestGame courseId={courseId} initialData={initialData} />
    </GameLessonTabs>
  );
}

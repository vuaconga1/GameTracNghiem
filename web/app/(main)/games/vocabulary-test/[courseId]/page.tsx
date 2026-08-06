import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { VocabularyTestGame } from '@/features/games/vocabulary-test/VocabularyTestGame';
import { optionalSession } from '@/lib/auth';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';
import { loadVocabularyTestGame } from '@/lib/loadVocabularyTestGame';

export default async function VocabularyTestGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await optionalSession();
  const [lesson, initialData] = await Promise.all([
    loadCourseGameLesson(courseId, 'vocabulary_test'),
    session ? loadVocabularyTestGame(courseId, session.userId) : Promise.resolve(null),
  ]);
  return (
    <GameLessonTabs lesson={lesson}>
      <VocabularyTestGame courseId={courseId} initialData={initialData} />
    </GameLessonTabs>
  );
}

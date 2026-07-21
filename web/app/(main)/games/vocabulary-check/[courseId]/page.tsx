import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { VocabularyCheckGame } from '@/features/games/vocabulary-check/VocabularyCheckGame';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';

export default async function VocabularyCheckGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const lesson = await loadCourseGameLesson(courseId, 'vocabulary_check');
  return (
    <GameLessonTabs lesson={lesson}>
      <VocabularyCheckGame courseId={courseId} />
    </GameLessonTabs>
  );
}

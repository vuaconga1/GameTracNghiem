import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { WordMatchGame } from '@/features/games/word-match/WordMatchGame';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';

export default async function WordMatchGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const lesson = await loadCourseGameLesson(courseId, 'word_match');
  return (
    <GameLessonTabs lesson={lesson}>
      <WordMatchGame courseId={courseId} />
    </GameLessonTabs>
  );
}

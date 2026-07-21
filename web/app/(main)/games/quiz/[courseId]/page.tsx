import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { QuizGame } from '@/features/games/quiz/QuizGame';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';

export default async function QuizGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const lesson = await loadCourseGameLesson(courseId, 'quiz');
  return (
    <GameLessonTabs lesson={lesson}>
      <QuizGame courseId={courseId} />
    </GameLessonTabs>
  );
}

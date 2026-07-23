import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { WordMatchGame } from '@/features/games/word-match/WordMatchGame';
import { requireSession } from '@/lib/auth';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';
import { loadWordMatchGame } from '@/lib/loadWordMatchGame';

export default async function WordMatchGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await requireSession();
  const [lesson, initialData] = await Promise.all([
    loadCourseGameLesson(courseId, 'word_match'),
    loadWordMatchGame(courseId, session.userId),
  ]);
  return (
    <GameLessonTabs lesson={lesson}>
      <WordMatchGame courseId={courseId} initialData={initialData} />
    </GameLessonTabs>
  );
}

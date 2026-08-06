import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { WordMatchGame } from '@/features/games/word-match/WordMatchGame';
import { optionalSession } from '@/lib/auth';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';
import { loadWordMatchGame } from '@/lib/loadWordMatchGame';

export default async function WordMatchGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await optionalSession();
  const [lesson, initialData] = await Promise.all([
    loadCourseGameLesson(courseId, 'word_match'),
    session ? loadWordMatchGame(courseId, session.userId) : Promise.resolve(null),
  ]);
  return (
    <GameLessonTabs lesson={lesson}>
      <WordMatchGame courseId={courseId} initialData={initialData} />
    </GameLessonTabs>
  );
}

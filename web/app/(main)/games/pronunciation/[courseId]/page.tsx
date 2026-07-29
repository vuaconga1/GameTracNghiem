import { Suspense } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { GameLessonTabs } from '@/features/games/GameLessonTabs';
import { PronunciationGame } from '@/features/games/pronunciation/PronunciationGame';
import { loadCourseGameLesson } from '@/lib/loadCourseGameLesson';
import '@/features/games/pronunciation/pronunciation.css';

export default async function PronunciationGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const lesson = await loadCourseGameLesson(courseId, 'pronunciation');
  return (
    <GameLessonTabs lesson={lesson}>
      <Suspense
        fallback={
          <div className="pronunciation-page">
            <DataLoading />
          </div>
        }
      >
        <PronunciationGame courseId={courseId} />
      </Suspense>
    </GameLessonTabs>
  );
}

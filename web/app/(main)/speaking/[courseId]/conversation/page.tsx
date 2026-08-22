import { Suspense } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { SpeakingPracticeView } from '@/features/speaking/SpeakingPracticeView';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function SpeakingConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ topicId?: string | string[] }>;
}) {
  await requireSession();
  const { courseId } = await params;
  const query = await searchParams;
  const topicId = Array.isArray(query.topicId)
    ? query.topicId[0]
    : query.topicId;

  const course = await prisma.course.findFirst({
    where: { id: courseId, archivedAt: null },
    select: { id: true, name: true, levelName: true },
  });

  return (
    <Suspense fallback={<DataLoading />}>
      <SpeakingPracticeView
        courseId={courseId}
        courseName={course?.name}
        topicId={topicId}
        levelName={course?.levelName}
      />
    </Suspense>
  );
}

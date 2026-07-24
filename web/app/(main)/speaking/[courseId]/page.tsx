import { Suspense } from 'react';

import { DataLoading } from '@/components/DataLoading';
import { SpeakingPracticeView } from '@/features/speaking/SpeakingPracticeView';
import { prisma } from '@/lib/db';

export default async function SpeakingPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ topicId?: string }>;
}) {
  const { courseId } = await params;
  const { topicId } = await searchParams;

  const course = await prisma.course.findFirst({
    where: { id: courseId, archivedAt: null },
    select: { id: true, name: true },
  });

  return (
    <Suspense fallback={<DataLoading />}>
      <SpeakingPracticeView
        courseId={courseId}
        courseName={course?.name}
        topicId={topicId}
      />
    </Suspense>
  );
}

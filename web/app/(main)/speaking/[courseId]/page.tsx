import { redirect } from 'next/navigation';

import { SpeakingHub } from '@/features/speaking/SpeakingHub';
import { prisma } from '@/lib/db';
import {
  hasLegacySpeakingDeepLink,
  legacySpeakingConversationPath,
} from '@/lib/speaking/hubRoutes';

type SpeakingHubSearchParams = {
  topicId?: string | string[];
  previewSession?: string | string[];
  legacyRealtime?: string | string[];
};

export default async function SpeakingHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<SpeakingHubSearchParams>;
}) {
  const { courseId } = await params;
  const query = await searchParams;

  if (hasLegacySpeakingDeepLink(query)) {
    redirect(legacySpeakingConversationPath(courseId, query));
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, active: true, archivedAt: null },
    select: { id: true, name: true },
  });

  return <SpeakingHub courseId={courseId} courseName={course?.name} />;
}

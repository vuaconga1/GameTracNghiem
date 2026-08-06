import { SpeakingDrillRoute } from '@/features/speaking/SpeakingDrillRoute';

export default async function GuidedAnswerPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  return (
    <SpeakingDrillRoute courseId={courseId} activityType="GUIDED_ANSWER" />
  );
}

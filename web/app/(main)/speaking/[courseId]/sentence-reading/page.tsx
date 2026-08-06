import { SpeakingDrillRoute } from '@/features/speaking/SpeakingDrillRoute';

export default async function SentenceReadingPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  return (
    <SpeakingDrillRoute
      courseId={courseId}
      activityType="SENTENCE_READING"
    />
  );
}

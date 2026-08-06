import { SpeakingDrillRoute } from '@/features/speaking/SpeakingDrillRoute';

export default async function WordPronunciationPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  return (
    <SpeakingDrillRoute
      courseId={courseId}
      activityType="WORD_PRONUNCIATION"
    />
  );
}

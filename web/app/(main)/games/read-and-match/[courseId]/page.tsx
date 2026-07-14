import { ReadAndMatchGame } from '@/features/games/read-and-match/ReadAndMatchGame';

export default async function ReadAndMatchGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <ReadAndMatchGame courseId={courseId} />;
}

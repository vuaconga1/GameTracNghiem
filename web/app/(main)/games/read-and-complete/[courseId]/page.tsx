import { ReadAndCompleteGame } from '@/features/games/read-and-complete/ReadAndCompleteGame';

export default async function ReadAndCompleteGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <ReadAndCompleteGame courseId={courseId} />;
}

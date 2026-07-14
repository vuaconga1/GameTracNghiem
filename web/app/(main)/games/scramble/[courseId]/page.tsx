import { ScrambleGame } from '@/features/games/scramble/ScrambleGame';

export default async function ScrambleGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <ScrambleGame courseId={courseId} />;
}

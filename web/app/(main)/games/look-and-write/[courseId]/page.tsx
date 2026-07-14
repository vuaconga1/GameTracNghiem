import { LookAndWriteGame } from '@/features/games/look-and-write/LookAndWriteGame';

export default async function LookAndWriteGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <LookAndWriteGame courseId={courseId} />;
}

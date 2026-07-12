import { GrammarGame } from '@/features/games/grammar/GrammarGame';

export default async function GrammarGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <GrammarGame courseId={courseId} />;
}

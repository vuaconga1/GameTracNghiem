import { WordMatchGame } from '@/features/games/word-match/WordMatchGame';

export default async function WordMatchGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <WordMatchGame courseId={courseId} />;
}

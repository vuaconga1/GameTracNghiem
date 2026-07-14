import { VocabularyCheckGame } from '@/features/games/vocabulary-check/VocabularyCheckGame';

export default async function VocabularyCheckGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <VocabularyCheckGame courseId={courseId} />;
}

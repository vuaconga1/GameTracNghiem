import { VocabularyTestGame } from '@/features/games/vocabulary-test/VocabularyTestGame';

export default async function VocabularyTestGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <VocabularyTestGame courseId={courseId} />;
}

import { PronunciationGame } from '@/features/games/pronunciation/PronunciationGame';
import '@/features/games/pronunciation/pronunciation.css';

export default async function PronunciationGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <PronunciationGame courseId={courseId} />;
}

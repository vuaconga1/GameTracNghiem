import { QuizGame } from '@/features/games/quiz/QuizGame';

export default async function QuizGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <QuizGame courseId={courseId} />;
}

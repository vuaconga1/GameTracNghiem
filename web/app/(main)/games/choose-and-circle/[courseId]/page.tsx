import { ChooseAndCircleGame } from '@/features/games/choose-and-circle/ChooseAndCircleGame';

export default async function ChooseAndCircleGamePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <ChooseAndCircleGame courseId={courseId} />;
}

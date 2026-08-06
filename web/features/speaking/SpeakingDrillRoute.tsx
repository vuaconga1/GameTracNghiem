import { SpeakingDrillShell } from '@/features/speaking/SpeakingDrillShell';
import { requireSession } from '@/lib/auth';
import {
  evaluateSpeakingAccess,
  type SpeakingAccessReason,
} from '@/lib/speaking/access';
import type { SpeakingActivityType } from '@/lib/speaking/config';

type DrillActivityType = Exclude<
  SpeakingActivityType,
  'REALTIME_CONVERSATION'
>;

export async function SpeakingDrillRoute({
  courseId,
  activityType,
}: {
  courseId: string;
  activityType: DrillActivityType;
}) {
  const session = await requireSession();
  const access = await evaluateSpeakingAccess({
    session,
    courseId,
    activityType,
  });
  const accessReason: SpeakingAccessReason | undefined = access.allowed
    ? undefined
    : access.reason;

  return (
    <SpeakingDrillShell
      courseId={courseId}
      activityType={activityType}
      accessReason={accessReason}
    />
  );
}

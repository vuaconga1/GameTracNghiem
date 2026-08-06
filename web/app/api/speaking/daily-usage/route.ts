import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  evaluateSpeakingAccess,
  SPEAKING_ACCESS_REASON,
  SpeakingAccessError,
} from '@/lib/speaking/access';
import {
  isSpeakingActivityType,
  type SpeakingActivityType,
} from '@/lib/speaking/config';
import {
  buildDailyUsageResponse,
  usageDateString,
  usageDateToUtcMidnight,
} from '@/lib/speaking/dates';
import { speakingErrorResponse } from '@/lib/speaking/http';
import { speakingRecordingPublicUrl } from '@/lib/speaking/recordingStorage';

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);
    const courseId = url.searchParams.get('courseId')?.trim();
    const requestedActivity =
      url.searchParams.get('activityType')?.trim() || 'REALTIME_CONVERSATION';
    if (!courseId || !isSpeakingActivityType(requestedActivity)) {
      return Response.json(
        { success: false, message: 'Thiếu courseId hoặc activityType không hợp lệ' },
        { status: 400 },
      );
    }
    if (session.role !== 'admin') {
      const access = await evaluateSpeakingAccess({
        session,
        courseId,
        activityType: requestedActivity,
      });
      if (
        !access.allowed &&
        access.reason !== SPEAKING_ACCESS_REASON.DAILY_LIMIT_REACHED
      ) {
        throw new SpeakingAccessError(access);
      }
    }

    const now = new Date();
    const usageDateVN = usageDateToUtcMidnight(usageDateString(now));
    const [configs, usages] = await Promise.all([
      prisma.speakingActivityConfig.findMany({
        select: { activityType: true, dailyLimit: true },
      }),
      prisma.dailySpeakingUsage.findMany({
        where: { userId: session.userId, usageDateVN },
        include: {
          session: {
            select: {
              id: true,
              status: true,
              topicId: true,
              activityType: true,
              startedAt: true,
              mustEndAt: true,
              endedAt: true,
              recordingUrl: true,
              recordingKey: true,
              transcript: true,
              topic: {
                select: { id: true, title: true, durationSeconds: true },
              },
            },
          },
        },
      }),
    ]);
    const usageByActivity = new Map(
      usages.map((usage) => [usage.activityType, usage]),
    );
    const activities = Object.fromEntries(
      configs
        .filter((config) => isSpeakingActivityType(config.activityType))
        .map((config) => {
          const activityType = config.activityType as SpeakingActivityType;
          const usage = usageByActivity.get(activityType);
          return [
            activityType,
            buildDailyUsageResponse({
              activityType,
              usedCount: usage?.usedCount,
              reservedCount: usage?.reservedCount,
              limitSnapshot: usage?.limitSnapshot ?? config.dailyLimit,
              reservedUntil: usage?.reservedUntil,
              sessionId: usage?.sessionId,
              now,
            }),
          ];
        }),
    ) as Record<SpeakingActivityType, ReturnType<typeof buildDailyUsageResponse>>;

    const selectedUsage = usageByActivity.get(requestedActivity);
    const snapshot =
      activities[requestedActivity] ??
      buildDailyUsageResponse({
        activityType: requestedActivity,
        limitSnapshot: 1,
        now,
      });
    const speakingSession = selectedUsage?.session
      ? {
          ...selectedUsage.session,
          recordingUrl:
            selectedUsage.session.recordingUrl || selectedUsage.session.recordingKey
              ? speakingRecordingPublicUrl(selectedUsage.session.id)
              : null,
        }
      : null;

    return Response.json(
      {
        success: true,
        usageDateVN: usageDateVN.toISOString(),
        ...snapshot,
        activities,
        session: speakingSession,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { buildDailyUsageResponse, usageDateString, usageDateToUtcMidnight } from '@/lib/speaking/dates';
import { speakingErrorResponse } from '@/lib/speaking/http';
import { speakingRecordingPublicUrl } from '@/lib/speaking/recordingStorage';

export async function GET() {
  try {
    const session = await requireSession();
    const now = new Date();
    const usageDate = usageDateToUtcMidnight(usageDateString(now));

    const usage = await prisma.dailySpeakingUsage.findUnique({
      where: {
        userId_usageDate: { userId: session.userId, usageDate },
      },
      include: {
        session: {
          select: {
            id: true,
            status: true,
            topicId: true,
            startedAt: true,
            endedAt: true,
            recordingUrl: true,
            recordingKey: true,
            transcript: true,
            topic: { select: { id: true, title: true, durationSeconds: true } },
          },
        },
      },
    });

    const snapshot = buildDailyUsageResponse({
      status: usage?.status,
      reservedUntil: usage?.reservedUntil,
      sessionId: usage?.sessionId,
      now,
    });

    const speakingSession = usage?.session
      ? {
          ...usage.session,
          recordingUrl:
            usage.session.recordingUrl || usage.session.recordingKey
              ? speakingRecordingPublicUrl(usage.session.id)
              : null,
        }
      : null;

    return Response.json({
      success: true,
      ...snapshot,
      session: speakingSession,
    });
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  evaluateSpeakingAccess,
  SPEAKING_ACCESS_REASON,
  SpeakingAccessError,
} from '@/lib/speaking/access';
import { isSpeakingActivityType } from '@/lib/speaking/config';
import { speakingErrorResponse } from '@/lib/speaking/http';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const auth = await requireSession();
    const { id } = await params;

    const session = await prisma.speakingSession.findUnique({
      where: { id },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            durationSeconds: true,
            courseId: true,
            instructions: true,
          },
        },
      },
    });

    if (!session || session.userId !== auth.userId) {
      // Admin can also read via admin API; students only own sessions
      if (auth.role !== 'admin' || !session) {
        return Response.json({ success: false, message: 'Không tìm thấy phiên' }, { status: 404 });
      }
    }
    if (auth.role !== 'admin') {
      if (!isSpeakingActivityType(session.activityType)) {
        return Response.json(
          { success: false, message: 'Activity của phiên không hợp lệ' },
          { status: 400 },
        );
      }
      const access = await evaluateSpeakingAccess({
        session: auth,
        courseId: session.courseId,
        activityType: session.activityType,
      });
      if (
        !access.allowed &&
        access.reason !== SPEAKING_ACCESS_REASON.DAILY_LIMIT_REACHED
      ) {
        throw new SpeakingAccessError(access);
      }
    }

    return Response.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        kind: session.kind,
        courseId: session.courseId,
        activityType: session.activityType,
        startedAt: session.startedAt,
        mustEndAt: session.mustEndAt,
        endedAt: session.endedAt,
        transcript: session.transcript,
        recordingUrl: session.recordingUrl,
        recordingMimeType: session.recordingMimeType,
        errorMessage: session.errorMessage,
        topic: session.topic
          ? {
              id: session.topic.id,
              title: session.topic.title,
              durationSeconds: session.topic.durationSeconds,
              courseId: session.topic.courseId,
              instructions:
                auth.role === 'admin' ? session.topic.instructions : undefined,
            }
          : null,
      },
    });
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

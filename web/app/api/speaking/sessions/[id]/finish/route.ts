import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  evaluateSpeakingAccess,
  SPEAKING_ACCESS_REASON,
  SpeakingAccessError,
} from '@/lib/speaking/access';
import { trackSpeakingEvent } from '@/lib/speaking/analytics';
import {
  isSpeakingActivityType,
  SPEAKING_SESSION_KIND,
  SPEAKING_SESSION_STATUS,
} from '@/lib/speaking/config';
import { speakingErrorResponse } from '@/lib/speaking/http';
import { finishRealtimeSpeakingSession } from '@/lib/speaking/realtimeFinish';
import { assertSpeakingMutationRequest } from '@/lib/speaking/security';
import { releaseReservationOnFailure } from '@/lib/speaking/usage';

type Ctx = { params: Promise<{ id: string }> };

function usageCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count)
    ? Math.min(Math.max(Math.floor(count), 0), 10_000_000)
    : 0;
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    assertSpeakingMutationRequest(req);
    const auth = await requireSession();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      transcript?: unknown;
      failed?: boolean;
      errorMessage?: string;
      usage?: {
        inputTokens?: unknown;
        outputTokens?: unknown;
        audioInputTokens?: unknown;
        audioOutputTokens?: unknown;
      };
    };

    const session = await prisma.speakingSession.findUnique({
      where: { id },
    });
    if (!session || session.userId !== auth.userId) {
      return Response.json({ success: false, message: 'Không tìm thấy phiên' }, { status: 404 });
    }

    // Failure before AI opening audio → release reservation
    if (body.failed) {
      if (
        session.status === SPEAKING_SESSION_STATUS.RESERVED ||
        session.status === SPEAKING_SESSION_STATUS.CONNECTING
      ) {
        const result = await releaseReservationOnFailure({
          sessionId: session.id,
          userId: auth.userId,
          errorMessage: body.errorMessage || 'Kết nối thất bại trước khi bắt đầu',
        });
        return Response.json({ success: true, released: result.released, session: result.session });
      }
      // Already released / failed on server during realtime — treat as success
      if (
        session.status === SPEAKING_SESSION_STATUS.FAILED ||
        session.status === SPEAKING_SESSION_STATUS.INTERRUPTED
      ) {
        return Response.json({ success: true, released: false, session });
      }
    }

    const isAdminPreview =
      auth.role === 'admin' && session.kind === SPEAKING_SESSION_KIND.ADMIN_PREVIEW;
    if (!isAdminPreview) {
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

    const result = await finishRealtimeSpeakingSession({
      sessionId: session.id,
      userId: auth.userId,
      transcript: body.transcript,
      ...(body.usage
        ? {
            usage: {
              inputTokens: usageCount(body.usage.inputTokens),
              outputTokens: usageCount(body.usage.outputTokens),
              audioInputTokens: usageCount(body.usage.audioInputTokens),
              audioOutputTokens: usageCount(body.usage.audioOutputTokens),
            },
          }
        : {}),
    });
    trackSpeakingEvent({
      event: 'session_completed',
      actorId: auth.userId,
      sessionId: session.id,
      properties: {
        activityType: session.activityType,
        status: result.session.status,
        model: session.model,
        sessionKind: session.kind,
        inputTokens: result.session.inputTokens,
        outputTokens: result.session.outputTokens,
        audioInputTokens: result.session.audioInputTokens,
        audioOutputTokens: result.session.audioOutputTokens,
      },
    });

    return Response.json({
      success: true,
      points: result.points,
      scored: result.scored,
      session: {
        id: result.session.id,
        status: result.session.status,
        endedAt: result.session.endedAt,
      },
    });
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

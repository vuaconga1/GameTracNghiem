import { createHash } from 'crypto';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  assertSpeakingAccess,
  evaluateSpeakingAccess,
  SPEAKING_ACCESS_REASON,
  SpeakingAccessError,
} from '@/lib/speaking/access';
import { trackSpeakingEvent } from '@/lib/speaking/analytics';
import {
  SPEAKING_SESSION_KIND,
  SPEAKING_SESSION_STATUS,
} from '@/lib/speaking/config';
import { speakingErrorResponse } from '@/lib/speaking/http';
import {
  createRealtimeCall,
  createRealtimeClientSecret,
  hangupRealtimeCall,
} from '@/lib/speaking/openaiRealtime';
import { assertSessionEndSchedulerReady } from '@/lib/speaking/sessionEndScheduler';
import {
  assertSpeakingMutationRequest,
  enforceSpeakingBurstLimit,
} from '@/lib/speaking/security';
import { releaseReservationOnFailure } from '@/lib/speaking/usage';

type Ctx = { params: Promise<{ id: string }> };

function routeError(status: number, message: string) {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

/**
 * Exchange browser SDP through the backend so the OpenAI Location call ID is
 * durably associated with the session before the browser starts playback.
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    assertSpeakingMutationRequest(req);
    const auth = await requireSession();
    await enforceSpeakingBurstLimit({
      userId: auth.userId,
      action: 'REALTIME_CONNECT',
    });
    const { id } = await params;
    const requestUrl = new URL(req.url);
    const wantsLegacyClientSecret =
      requestUrl.searchParams.get('legacyClientSecret') === '1';
    const localSdp = await req.text();

    const session = await prisma.speakingSession.findUnique({
      where: { id },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            instructions: true,
            durationSeconds: true,
            active: true,
            archivedAt: true,
            course: { select: { id: true, levelName: true, name: true } },
          },
        },
      },
    });

    if (!session || session.userId !== auth.userId) {
      return Response.json({ success: false, message: 'Không tìm thấy phiên' }, { status: 404 });
    }
    if (session.activityType !== 'REALTIME_CONVERSATION' || !session.topic) {
      await releaseReservationOnFailure({
        sessionId: session.id,
        userId: auth.userId,
        errorMessage: 'Phiên Realtime thiếu topic hợp lệ',
        failureCode: 'REALTIME_TOPIC_REQUIRED',
        failureStage: 'REALTIME_CREDENTIAL',
      });
      return Response.json(
        { success: false, message: 'Phiên Realtime thiếu topic hợp lệ' },
        { status: 400 },
      );
    }
    if (
      session.reservationExpiresAt &&
      session.reservationExpiresAt.getTime() <= Date.now()
    ) {
      await releaseReservationOnFailure({
        sessionId: session.id,
        userId: auth.userId,
        errorMessage: 'Reservation hết hạn trước khi kết nối',
        failureCode: 'RESERVATION_EXPIRED',
        failureStage: 'REALTIME_CREDENTIAL',
      });
      return Response.json(
        { success: false, message: 'Lượt giữ chỗ đã hết hạn' },
        { status: 409 },
      );
    }
    const isAdminPreview =
      auth.role === 'admin' && session.kind === SPEAKING_SESSION_KIND.ADMIN_PREVIEW;
    const isReconnect = session.status === SPEAKING_SESSION_STATUS.ACTIVE;
    if (!isAdminPreview && !isReconnect) {
      try {
        await assertSpeakingAccess({
          session: auth,
          courseId: session.courseId,
          activityType: 'REALTIME_CONVERSATION',
        });
      } catch (accessError) {
        await releaseReservationOnFailure({
          sessionId: session.id,
          userId: auth.userId,
          errorMessage:
            accessError instanceof Error
              ? accessError.message
              : 'Không còn quyền bắt đầu Speaking',
          failureCode: 'ACCESS_RECHECK_FAILED',
          failureStage: 'REALTIME_CREDENTIAL',
        });
        throw accessError;
      }
    } else if (!isAdminPreview && isReconnect) {
      const access = await evaluateSpeakingAccess({
        session: auth,
        courseId: session.courseId,
        activityType: 'REALTIME_CONVERSATION',
      });
      if (
        !access.allowed &&
        access.reason !== SPEAKING_ACCESS_REASON.DAILY_LIMIT_REACHED
      ) {
        throw new SpeakingAccessError(access);
      }
    }

    if (
      session.status !== SPEAKING_SESSION_STATUS.RESERVED &&
      session.status !== SPEAKING_SESSION_STATUS.CONNECTING &&
      session.status !== SPEAKING_SESSION_STATUS.ACTIVE
    ) {
      return Response.json(
        { success: false, message: 'Phiên không ở trạng thái kết nối' },
        { status: 409 }
      );
    }
    if (
      isReconnect &&
      session.mustEndAt &&
      session.mustEndAt.getTime() <= Date.now()
    ) {
      return Response.json(
        { success: false, message: 'Phiên đã hết thời lượng cho phép' },
        { status: 409 },
      );
    }

    if (!session.topic.active || session.topic.archivedAt) {
      await releaseReservationOnFailure({
        sessionId: session.id,
        userId: auth.userId,
        errorMessage: 'Topic không còn hoạt động',
      });
      return Response.json({ success: false, message: 'Topic không còn hoạt động' }, { status: 400 });
    }

    // Fail closed before opening an OpenAI call when no durable hard-stop
    // provider is configured. Local/test fallback must be explicitly enabled.
    assertSessionEndSchedulerReady();

    if (!isReconnect) {
      await prisma.speakingSession.update({
        where: { id: session.id },
        data: { status: SPEAKING_SESSION_STATUS.CONNECTING },
      });
    }

    const safetyIdentifier = createHash('sha256')
      .update(auth.userId)
      .digest('hex')
      .slice(0, 64);

    try {
      const realtimeInput = {
        instructions: session.topic.instructions,
        safetyIdentifier,
        levelName: session.topic.course?.levelName,
        topicTitle: session.topic.title,
      };

      if (wantsLegacyClientSecret) {
        const fallbackEnabled =
          process.env.SPEAKING_REALTIME_LEGACY_CLIENT_SECRET_FALLBACK ===
          'true';
        if (!fallbackEnabled || !isAdminPreview) {
          throw routeError(
            403,
            'Legacy Realtime fallback chỉ dành cho admin preview',
          );
        }
        const secret = await createRealtimeClientSecret(realtimeInput);
        await prisma.speakingSession.update({
          where: { id: session.id },
          data: { model: secret.model },
        });
        trackSpeakingEvent({
          event: 'realtime_connect',
          actorId: auth.userId,
          sessionId: session.id,
          properties: {
            activityType: session.activityType,
            model: secret.model,
            outcome: 'connected',
            sessionKind: session.kind,
          },
        });
        return Response.json({
          success: true,
          transport: 'legacy-client-secret',
          clientSecret: secret.clientSecret,
          expiresAt: secret.expiresAt,
          model: secret.model,
          sessionId: session.id,
        });
      }

      if (!localSdp.includes('v=0') || !localSdp.includes('m=')) {
        throw routeError(400, 'SDP offer không hợp lệ');
      }

      const call = await createRealtimeCall({
        ...realtimeInput,
        sdp: localSdp,
      });
      try {
        await prisma.speakingSession.update({
          where: { id: session.id },
          data: {
            model: call.model,
            openaiCallId: call.callId,
          },
        });
      } catch (databaseError) {
        await hangupRealtimeCall(call.callId).catch(() => undefined);
        throw databaseError;
      }
      if (
        isReconnect &&
        session.openaiCallId &&
        session.openaiCallId !== call.callId
      ) {
        await hangupRealtimeCall(session.openaiCallId).catch((error) => {
          console.error('[speaking] previous Realtime call hangup failed', error);
        });
      }
      trackSpeakingEvent({
        event: 'realtime_connect',
        actorId: auth.userId,
        sessionId: session.id,
        properties: {
          activityType: session.activityType,
          model: call.model,
          outcome: 'connected',
          sessionKind: session.kind,
        },
      });

      return Response.json({
        success: true,
        transport: 'unified-webrtc',
        sdpAnswer: call.sdpAnswer,
        model: call.model,
        sessionId: session.id,
      });
    } catch (openaiErr) {
      const message =
        openaiErr instanceof Error ? openaiErr.message : 'Không tạo được Realtime call';
      await releaseReservationOnFailure({
        sessionId: session.id,
        userId: auth.userId,
        errorMessage: message,
        failureStage: 'REALTIME_SDP',
        failureCode: 'REALTIME_SDP_EXCHANGE_FAILED',
      });
      trackSpeakingEvent({
        event: 'operation_failed',
        actorId: auth.userId,
        sessionId: session.id,
        properties: {
          activityType: session.activityType,
          stage: 'REALTIME_SDP',
          reason: 'REALTIME_SDP_EXCHANGE_FAILED',
        },
      });
      throw openaiErr;
    }
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

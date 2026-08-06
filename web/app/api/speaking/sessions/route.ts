import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertSpeakingAccess } from '@/lib/speaking/access';
import { trackSpeakingEvent } from '@/lib/speaking/analytics';
import { speakingErrorResponse } from '@/lib/speaking/http';
import {
  assertSpeakingMutationRequest,
  enforceSpeakingBurstLimit,
} from '@/lib/speaking/security';
import { createPracticeSession } from '@/lib/speaking/usage';

export async function POST(req: Request) {
  try {
    assertSpeakingMutationRequest(req);
    const session = await requireSession();
    await enforceSpeakingBurstLimit({
      userId: session.userId,
      action: 'SESSION_CREATE',
    });
    const body = (await req.json().catch(() => ({}))) as { topicId?: string };
    const topicId = String(body.topicId || '').trim();
    if (!topicId) {
      return Response.json({ success: false, message: 'Thiếu topicId' }, { status: 400 });
    }

    const topic = await prisma.speakingTopic.findFirst({
      where: { id: topicId, active: true, archivedAt: null },
      select: { courseId: true },
    });
    if (!topic) {
      return Response.json(
        { success: false, message: 'Topic không hoạt động hoặc không tồn tại' },
        { status: 404 },
      );
    }
    const access = await assertSpeakingAccess({
      session,
      courseId: topic.courseId,
      activityType: 'REALTIME_CONVERSATION',
    });

    const result = await createPracticeSession({
      userId: session.userId,
      topicId,
      courseId: topic.courseId,
    });
    trackSpeakingEvent({
      event: 'session_reserved',
      actorId: session.userId,
      sessionId: result.session.id,
      properties: {
        activityType: 'REALTIME_CONVERSATION',
        sessionKind: result.session.kind,
        status: result.session.status,
        promptVersion: access.config?.promptVersion ?? null,
      },
    });

    return Response.json({
      success: true,
      session: {
        id: result.session.id,
        status: result.session.status,
        kind: result.session.kind,
        topicId: result.topic.id,
        reservedUntil: result.reservedUntil.toISOString(),
      },
      topic: {
        ...result.topic,
        durationSeconds:
          access.config?.durationSeconds || result.topic.durationSeconds,
      },
    });
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

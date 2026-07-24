import { createHash } from 'crypto';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SPEAKING_SESSION_STATUS } from '@/lib/speaking/config';
import { speakingErrorResponse } from '@/lib/speaking/http';
import { createRealtimeClientSecret } from '@/lib/speaking/openaiRealtime';
import { releaseReservationOnFailure } from '@/lib/speaking/usage';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Mint ephemeral OpenAI Realtime credentials for this speaking session.
 * Browser then POSTs its WebRTC SDP directly to OpenAI with the short-lived secret.
 */
export async function POST(_req: Request, { params }: Ctx) {
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
            instructions: true,
            durationSeconds: true,
            active: true,
            archivedAt: true,
          },
        },
      },
    });

    if (!session || session.userId !== auth.userId) {
      return Response.json({ success: false, message: 'Không tìm thấy phiên' }, { status: 404 });
    }

    if (
      session.status !== SPEAKING_SESSION_STATUS.RESERVED &&
      session.status !== SPEAKING_SESSION_STATUS.CONNECTING
    ) {
      return Response.json(
        { success: false, message: 'Phiên không ở trạng thái kết nối' },
        { status: 409 }
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

    await prisma.speakingSession.update({
      where: { id: session.id },
      data: { status: SPEAKING_SESSION_STATUS.CONNECTING },
    });

    const safetyIdentifier = createHash('sha256')
      .update(auth.userId)
      .digest('hex')
      .slice(0, 64);

    try {
      const secret = await createRealtimeClientSecret({
        instructions: session.topic.instructions,
        safetyIdentifier,
      });

      return Response.json({
        success: true,
        clientSecret: secret.clientSecret,
        expiresAt: secret.expiresAt,
        model: secret.model,
        sessionId: session.id,
      });
    } catch (openaiErr) {
      const message =
        openaiErr instanceof Error ? openaiErr.message : 'Không tạo được Realtime credential';
      await releaseReservationOnFailure({
        sessionId: session.id,
        userId: auth.userId,
        errorMessage: message,
      });
      throw openaiErr;
    }
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

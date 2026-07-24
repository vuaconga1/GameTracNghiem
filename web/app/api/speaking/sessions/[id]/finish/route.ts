import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SPEAKING_SESSION_STATUS } from '@/lib/speaking/config';
import { speakingErrorResponse } from '@/lib/speaking/http';
import { releaseReservationOnFailure } from '@/lib/speaking/usage';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const auth = await requireSession();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      transcript?: unknown;
      failed?: boolean;
      errorMessage?: string;
    };

    const session = await prisma.speakingSession.findUnique({ where: { id } });
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

    if (
      session.status !== SPEAKING_SESSION_STATUS.ACTIVE &&
      session.status !== SPEAKING_SESSION_STATUS.FINISHING &&
      session.status !== SPEAKING_SESSION_STATUS.UPLOADING &&
      session.status !== SPEAKING_SESSION_STATUS.UPLOAD_FAILED
    ) {
      return Response.json(
        { success: false, message: 'Phiên chưa Active — không thể kết thúc' },
        { status: 409 }
      );
    }

    const updated = await prisma.speakingSession.update({
      where: { id: session.id },
      data: {
        status: SPEAKING_SESSION_STATUS.FINISHING,
        transcript: body.transcript ?? session.transcript ?? undefined,
        endedAt: session.endedAt ?? new Date(),
      },
    });

    return Response.json({
      success: true,
      session: {
        id: updated.id,
        status: updated.status,
        endedAt: updated.endedAt,
      },
    });
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

    return Response.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        kind: session.kind,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        transcript: session.transcript,
        recordingUrl: session.recordingUrl,
        recordingMimeType: session.recordingMimeType,
        errorMessage: session.errorMessage,
        topic: {
          id: session.topic.id,
          title: session.topic.title,
          durationSeconds: session.topic.durationSeconds,
          courseId: session.topic.courseId,
          // Only include instructions for owner/admin during active prep (needed for UI display? hide from student UI)
          instructions:
            auth.role === 'admin' ? session.topic.instructions : undefined,
        },
      },
    });
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

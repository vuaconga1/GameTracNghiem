import { adminErrorResponse } from '@/lib/admin/http';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    await requireAdmin();
    const { id } = await params;
    const attempt = await prisma.speakingAttempt.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        course: { select: { id: true, name: true, levelName: true } },
        question: {
          select: { id: true, payload: true, sortOrder: true, active: true },
        },
        session: {
          select: {
            id: true,
            status: true,
            kind: true,
            configSnapshot: true,
            model: true,
            createdAt: true,
            startedAt: true,
            endedAt: true,
          },
        },
        scoreLog: {
          select: {
            id: true,
            points: true,
            isCorrect: true,
            elapsedMs: true,
            answeredAt: true,
          },
        },
      },
    });
    if (!attempt) {
      return Response.json(
        { success: false, message: 'Speaking attempt not found' },
        { status: 404 },
      );
    }
    return Response.json(
      { success: true, attempt },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

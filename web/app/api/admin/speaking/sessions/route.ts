import { adminErrorResponse } from '@/lib/admin/http';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId')?.trim();
    const topicId = url.searchParams.get('topicId')?.trim();
    const status = url.searchParams.get('status')?.trim();
    const current = url.searchParams.get('current') === '1';
    const take = Math.min(Number(url.searchParams.get('limit') || 50), 100);

    const sessions = await prisma.speakingSession.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(topicId ? { topicId } : {}),
        ...(status
          ? { status }
          : current
            ? {
                status: {
                  in: ['RESERVED', 'CONNECTING', 'ACTIVE', 'FINISHING', 'UPLOADING'],
                },
              }
            : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        topic: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: { select: { name: true, levelName: true } },
          },
        },
      },
    });

    const aggregates = sessions.reduce(
      (total, session) => ({
        inputTokens: total.inputTokens + (session.inputTokens ?? 0),
        outputTokens: total.outputTokens + (session.outputTokens ?? 0),
        audioInputTokens:
          total.audioInputTokens + (session.audioInputTokens ?? 0),
        audioOutputTokens:
          total.audioOutputTokens + (session.audioOutputTokens ?? 0),
        estimatedCostUsd:
          total.estimatedCostUsd + (session.estimatedCostUsd ?? 0),
      }),
      {
        inputTokens: 0,
        outputTokens: 0,
        audioInputTokens: 0,
        audioOutputTokens: 0,
        estimatedCostUsd: 0,
      },
    );
    return Response.json({ success: true, sessions, aggregates });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

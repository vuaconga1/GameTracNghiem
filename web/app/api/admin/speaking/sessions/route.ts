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
    const take = Math.min(Number(url.searchParams.get('limit') || 50), 100);

    const sessions = await prisma.speakingSession.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(topicId ? { topicId } : {}),
        ...(status ? { status } : {}),
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

    return Response.json({ success: true, sessions });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

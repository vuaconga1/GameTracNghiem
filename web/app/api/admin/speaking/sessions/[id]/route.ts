import { adminErrorResponse } from '@/lib/admin/http';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const session = await prisma.speakingSession.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        topic: {
          select: {
            id: true,
            title: true,
            instructions: true,
            durationSeconds: true,
            courseId: true,
            course: { select: { name: true, levelName: true } },
          },
        },
        dailyUsage: true,
        usageReleases: {
          orderBy: { createdAt: 'desc' },
          include: {
            admin: { select: { id: true, username: true, displayName: true } },
          },
        },
      },
    });

    if (!session) {
      return Response.json({ success: false, message: 'Không tìm thấy phiên' }, { status: 404 });
    }

    return Response.json({ success: true, session });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

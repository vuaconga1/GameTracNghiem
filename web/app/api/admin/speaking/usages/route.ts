import { adminErrorResponse } from '@/lib/admin/http';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { usageDateString, usageDateToUtcMidnight } from '@/lib/speaking/dates';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId')?.trim();
    const dateParam = url.searchParams.get('date')?.trim();
    const usageDate = dateParam
      ? usageDateToUtcMidnight(dateParam)
      : usageDateToUtcMidnight(usageDateString());

    const usages = await prisma.dailySpeakingUsage.findMany({
      where: {
        usageDate,
        ...(userId ? { userId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        session: {
          select: {
            id: true,
            status: true,
            topicId: true,
            startedAt: true,
            endedAt: true,
            errorMessage: true,
          },
        },
      },
    });

    return Response.json({ success: true, usageDate: usageDate.toISOString(), usages });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

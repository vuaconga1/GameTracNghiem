import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { prisma } from '@/lib/db';
import { TEACHER_AUDIT_ASSIGN, TEACHER_AUDIT_LOGIN } from '@/lib/teacherAuditActions';

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || '';
    const q = url.searchParams.get('q')?.trim() || '';
    const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);

    const where = {
      ...(action === TEACHER_AUDIT_LOGIN || action === TEACHER_AUDIT_ASSIGN ? { action } : {}),
      ...(q
        ? {
            OR: [
              { actorDisplayName: { contains: q, mode: 'insensitive' as const } },
              { actorUsername: { contains: q, mode: 'insensitive' as const } },
              { className: { contains: q, mode: 'insensitive' as const } },
              { courseName: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.teacherAuditLog.count({ where }),
      prisma.teacherAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: PAGE_SIZE,
      }),
    ]);

    return Response.json({
      success: true,
      total,
      hasMore: offset + items.length < total,
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        actorUserId: item.actorUserId,
        actorUsername: item.actorUsername,
        actorDisplayName: item.actorDisplayName,
        classId: item.classId,
        className: item.className,
        assignmentId: item.assignmentId,
        levelName: item.levelName,
        courseName: item.courseName,
        skillLabel: item.skillLabel,
        gameLabel: item.gameLabel,
        deadlineAt: item.deadlineAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

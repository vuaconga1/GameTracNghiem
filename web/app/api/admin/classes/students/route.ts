import { requireAdminOrTeacher } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { isStudentAccountRole, normalizeUserRole } from '@/lib/userRoles';
import { prisma } from '@/lib/db';

/** Search students by display name / username for class member picker. */
export async function GET(req: Request) {
  try {
    await requireAdminOrTeacher();
    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get('q') || '').trim();
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20) || 20));

    const users = await prisma.user.findMany({
      where: {
        ...notArchived,
        ...(q
          ? {
              OR: [
                { displayName: { contains: q, mode: 'insensitive' } },
                { username: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        displayName: true,
        username: true,
        role: true,
      },
      orderBy: { displayName: 'asc' },
      take: Math.max(limit * 3, 60),
    });

    const items = users
      .filter((u) => isStudentAccountRole(normalizeUserRole(u.role)))
      .slice(0, limit)
      .map((u) => ({
        id: u.id,
        displayName: u.displayName,
        username: u.username,
        role: normalizeUserRole(u.role),
      }));

    return Response.json({ success: true, items });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

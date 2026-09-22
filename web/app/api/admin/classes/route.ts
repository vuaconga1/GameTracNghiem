import { requireAdminOrTeacher } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { classListWhere } from '@/lib/classAccess';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await requireAdminOrTeacher();
    const items = await prisma.schoolClass.findMany({
      where: classListWhere(session),
      include: {
        createdBy: { select: { id: true, displayName: true, username: true } },
        _count: { select: { members: true, assignments: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return Response.json({
      success: true,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        createdBy: item.createdBy,
        memberCount: item._count.members,
        assignmentCount: item._count.assignments,
      })),
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdminOrTeacher();
    const body = await req.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return Response.json(
        { success: false, message: 'Vui lòng nhập tên lớp' },
        { status: 400 }
      );
    }

    const item = await prisma.schoolClass.create({
      data: {
        name,
        createdByUserId: session.userId,
      },
      include: {
        createdBy: { select: { id: true, displayName: true, username: true } },
        _count: { select: { members: true, assignments: true } },
      },
    });

    return Response.json({
      success: true,
      item: {
        id: item.id,
        name: item.name,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        createdBy: item.createdBy,
        memberCount: item._count.members,
        assignmentCount: item._count.assignments,
      },
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

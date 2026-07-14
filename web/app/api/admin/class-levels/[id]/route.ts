import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { prisma } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const levelName = body.levelName !== undefined ? String(body.levelName).trim() : undefined;
    const active = body.active !== undefined ? Boolean(body.active) : undefined;

    const existing = await prisma.classLevel.findFirst({
      where: { id, ...notArchived },
    });
    if (!existing) {
      return Response.json({ success: false, message: 'Không tìm thấy' }, { status: 404 });
    }

    const item = await prisma.classLevel.update({
      where: { id },
      data: {
        ...(levelName ? { levelName } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });

    return Response.json({ success: true, item });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const existing = await prisma.classLevel.findFirst({
      where: { id, ...notArchived },
    });
    if (!existing) {
      return Response.json({ success: false, message: 'Không tìm thấy' }, { status: 404 });
    }

    const item = await prisma.classLevel.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return Response.json({
      success: true,
      item,
      message: 'Đã ẩn cấp độ khỏi trang quản trị',
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

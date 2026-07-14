import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const levelName = String(searchParams.get('levelName') || '').trim();
    const q = String(searchParams.get('q') || '').trim();

    const items = await prisma.course.findMany({
      where: {
        ...notArchived,
        ...(levelName ? { levelName } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      include: {
        _count: {
          select: { questions: { where: { archivedAt: null } } },
        },
      },
      orderBy: [{ levelName: 'asc' }, { name: 'asc' }],
    });

    return Response.json({ success: true, items });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const name = String(body.name || '').trim();
    const levelName = String(body.levelName || '').trim();
    const active = body.active !== false;

    if (!name || !levelName) {
      return Response.json(
        { success: false, message: 'Vui lòng nhập đủ tên khóa và cấp' },
        { status: 400 }
      );
    }

    const item = await prisma.course.create({
      data: {
        name,
        levelName,
        active,
        ebookFileId: body.ebookFileId ? String(body.ebookFileId).trim() : null,
        ebookPageStart:
          body.ebookPageStart !== undefined && body.ebookPageStart !== ''
            ? Number(body.ebookPageStart)
            : null,
        ebookPageEnd:
          body.ebookPageEnd !== undefined && body.ebookPageEnd !== ''
            ? Number(body.ebookPageEnd)
            : null,
      },
    });

    await prisma.classLevel.upsert({
      where: { levelName },
      update: { active: true, archivedAt: null },
      create: { levelName, active: true },
    });

    return Response.json({ success: true, item });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

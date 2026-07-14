import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const items = await prisma.classLevel.findMany({
      where: notArchived,
      orderBy: [{ levelName: 'asc' }],
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
    const levelName = String(body.levelName || '').trim();
    const active = body.active !== false;

    if (!levelName) {
      return Response.json({ success: false, message: 'Vui lòng nhập tên cấp' }, { status: 400 });
    }

    const item = await prisma.classLevel.upsert({
      where: { levelName },
      update: { active, archivedAt: null },
      create: { levelName, active },
    });

    return Response.json({ success: true, item });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

import { adminErrorResponse } from '@/lib/admin/http';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DEFAULT_DURATION_SECONDS } from '@/lib/speaking/config';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const topic = await prisma.speakingTopic.findFirst({
      where: { id, archivedAt: null },
      include: { course: { select: { id: true, name: true, levelName: true } } },
    });
    if (!topic) {
      return Response.json({ success: false, message: 'Không tìm thấy topic' }, { status: 404 });
    }
    return Response.json({ success: true, topic });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await req.json()) as {
      title?: string;
      instructions?: string;
      durationSeconds?: number;
      active?: boolean;
      sortOrder?: number;
    };

    const existing = await prisma.speakingTopic.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) {
      return Response.json({ success: false, message: 'Không tìm thấy topic' }, { status: 404 });
    }

    const topic = await prisma.speakingTopic.update({
      where: { id },
      data: {
        ...(body.title != null ? { title: String(body.title).trim() } : {}),
        ...(body.instructions != null
          ? { instructions: String(body.instructions).trim() }
          : {}),
        ...(typeof body.durationSeconds === 'number' && body.durationSeconds > 0
          ? {
              durationSeconds: Math.min(
                Math.floor(body.durationSeconds),
                1800
              ) || DEFAULT_DURATION_SECONDS,
            }
          : {}),
        ...(typeof body.active === 'boolean' ? { active: body.active } : {}),
        ...(typeof body.sortOrder === 'number' ? { sortOrder: body.sortOrder } : {}),
      },
    });

    return Response.json({ success: true, topic });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const existing = await prisma.speakingTopic.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) {
      return Response.json({ success: false, message: 'Không tìm thấy topic' }, { status: 404 });
    }

    const topic = await prisma.speakingTopic.update({
      where: { id },
      data: { archivedAt: new Date(), active: false },
    });

    return Response.json({ success: true, topic });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

import type { Prisma } from '@prisma/client';

import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { parseGamePayload } from '@/lib/admin/payloadSchemas';
import { prisma } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const item = await prisma.question.findFirst({
      where: { id, ...notArchived },
      include: { course: true },
    });
    if (!item) {
      return Response.json({ success: false, message: 'Không tìm thấy câu hỏi' }, { status: 404 });
    }
    return Response.json({ success: true, item });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const existing = await prisma.question.findFirst({ where: { id, ...notArchived } });
    if (!existing) {
      return Response.json({ success: false, message: 'Không tìm thấy câu hỏi' }, { status: 404 });
    }

    const body = await req.json();
    let payload: Prisma.InputJsonValue = existing.payload as Prisma.InputJsonValue;
    if (body.payload !== undefined) {
      try {
        payload = parseGamePayload(existing.game, body.payload) as Prisma.InputJsonValue;
      } catch (parseErr) {
        const message =
          parseErr instanceof Error ? parseErr.message : 'Dữ liệu câu hỏi không hợp lệ';
        return Response.json({ success: false, message }, { status: 400 });
      }
    }

    const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : undefined;

    const item = await prisma.question.update({
      where: { id },
      data: {
        payload,
        ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
        ...(sortOrder !== undefined && Number.isFinite(sortOrder) ? { sortOrder } : {}),
        ...(body.level !== undefined ? { level: String(body.level || '').trim() || null } : {}),
        ...(body.externalId !== undefined
          ? { externalId: String(body.externalId || '').trim() || null }
          : {}),
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
    const existing = await prisma.question.findFirst({ where: { id, ...notArchived } });
    if (!existing) {
      return Response.json({ success: false, message: 'Không tìm thấy câu hỏi' }, { status: 404 });
    }
    const item = await prisma.question.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return Response.json({
      success: true,
      item,
      message: 'Đã ẩn câu hỏi khỏi trang quản trị',
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

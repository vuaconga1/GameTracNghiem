import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { isAdminGameKey, parseGamePayload, questionPreview } from '@/lib/admin/payloadSchemas';
import { prisma } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id: courseId } = await params;
    const game = String(new URL(req.url).searchParams.get('game') || '').trim();
    if (!isAdminGameKey(game)) {
      return Response.json({ success: false, message: 'Thiếu hoặc sai loại game' }, { status: 400 });
    }

    const course = await prisma.course.findFirst({ where: { id: courseId, ...notArchived } });
    if (!course) {
      return Response.json({ success: false, message: 'Không tìm thấy khóa học' }, { status: 404 });
    }

    const items = await prisma.question.findMany({
      where: { courseId, game, ...notArchived },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return Response.json({
      success: true,
      course,
      items: items.map((item) => ({
        ...item,
        preview: questionPreview(game, item.payload),
      })),
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id: courseId } = await params;
    const body = await req.json();
    const game = String(body.game || '').trim();
    if (!isAdminGameKey(game)) {
      return Response.json({ success: false, message: 'Loại game không hợp lệ' }, { status: 400 });
    }

    const course = await prisma.course.findFirst({ where: { id: courseId, ...notArchived } });
    if (!course) {
      return Response.json({ success: false, message: 'Không tìm thấy khóa học' }, { status: 404 });
    }

    let payload;
    try {
      payload = parseGamePayload(game, body.payload);
    } catch (parseErr) {
      const message =
        parseErr instanceof Error ? parseErr.message : 'Dữ liệu câu hỏi không hợp lệ';
      return Response.json({ success: false, message }, { status: 400 });
    }

    const sortOrder = Number(body.sortOrder);
    const item = await prisma.question.create({
      data: {
        courseId,
        game,
        level: String(body.level || course.levelName || '').trim() || null,
        payload,
        active: body.active !== false,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        externalId: body.externalId ? String(body.externalId).trim() : null,
      },
    });

    return Response.json({ success: true, item });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { prisma } from '@/lib/db';
import { GAME_CATALOG, normalizeEnabledGamesInput } from '@/lib/gameCatalog';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const course = await prisma.course.findFirst({ where: { id, ...notArchived } });
    if (!course) {
      return Response.json({ success: false, message: 'Không tìm thấy khóa học' }, { status: 404 });
    }

    const counts = await prisma.question.groupBy({
      by: ['game'],
      where: { courseId: id, ...notArchived },
      _count: { _all: true },
    });
    const countMap = Object.fromEntries(counts.map((row) => [row.game, row._count._all]));

    return Response.json({
      success: true,
      course,
      games: GAME_CATALOG.map((game) => ({
        ...game,
        questionCount: countMap[game.key] || 0,
      })),
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.course.findFirst({ where: { id, ...notArchived } });
    if (!existing) {
      return Response.json({ success: false, message: 'Không tìm thấy khóa học' }, { status: 404 });
    }

    let enabledGames: string[] | undefined;
    if (body.enabledGames !== undefined) {
      const normalized = normalizeEnabledGamesInput(body.enabledGames);
      if (normalized === null) {
        return Response.json(
          { success: false, message: 'Danh sách game không hợp lệ' },
          { status: 400 }
        );
      }
      enabledGames = normalized;
    }

    const item = await prisma.course.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.levelName !== undefined ? { levelName: String(body.levelName).trim() } : {}),
        ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
        ...(enabledGames !== undefined ? { enabledGames } : {}),
        ...(body.ebookFileId !== undefined
          ? { ebookFileId: String(body.ebookFileId || '').trim() || null }
          : {}),
        ...(body.ebookPageStart !== undefined
          ? {
              ebookPageStart:
                body.ebookPageStart === null || body.ebookPageStart === ''
                  ? null
                  : Number(body.ebookPageStart),
            }
          : {}),
        ...(body.ebookPageEnd !== undefined
          ? {
              ebookPageEnd:
                body.ebookPageEnd === null || body.ebookPageEnd === ''
                  ? null
                  : Number(body.ebookPageEnd),
            }
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
    const existing = await prisma.course.findFirst({ where: { id, ...notArchived } });
    if (!existing) {
      return Response.json({ success: false, message: 'Không tìm thấy khóa học' }, { status: 404 });
    }

    const item = await prisma.course.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return Response.json({
      success: true,
      item,
      message: 'Đã ẩn khóa học khỏi trang quản trị',
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

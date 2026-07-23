import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { notArchived } from '@/lib/admin/notArchived';
import { prisma } from '@/lib/db';
import { GAME_CATALOG, normalizeEnabledGamesInput } from '@/lib/gameCatalog';
import {
  buildGameSkillsFromEnabledGames,
  deriveEnabledGamesFromSkills,
  normalizeEnabledSkillsInput,
  normalizeGameSkillsInput,
  resolveEnabledSkillIds,
  resolveGameSkillsMap,
  SKILL_IDS,
  type GameSkillsMap,
  type SkillId,
} from '@/lib/skillCatalog';

type Ctx = { params: Promise<{ id: string }> };

function courseSkillFields(course: {
  enabledGames: string[];
  gameSkills: unknown;
  enabledSkills: string[];
}) {
  const gameSkills = resolveGameSkillsMap(course.gameSkills, course.enabledGames);
  const enabledSkills = resolveEnabledSkillIds(course.enabledSkills);
  const enabledGames = deriveEnabledGamesFromSkills(
    gameSkills,
    enabledSkills,
    course.enabledGames
  );
  return { gameSkills, enabledSkills, enabledGames };
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const course = await prisma.course.findFirst({
      where: { id, ...notArchived },
      include: {
        gameLessons: { orderBy: { gameKey: 'asc' } },
        skillLessons: { orderBy: { skillId: 'asc' } },
      },
    });
    if (!course) {
      return Response.json({ success: false, message: 'Không tìm thấy khóa học' }, { status: 404 });
    }

    const counts = await prisma.question.groupBy({
      by: ['game'],
      where: { courseId: id, ...notArchived },
      _count: { _all: true },
    });
    const countMap = Object.fromEntries(counts.map((row) => [row.game, row._count._all]));
    const skillFields = courseSkillFields(course);

    return Response.json({
      success: true,
      course: {
        ...course,
        ...skillFields,
      },
      games: GAME_CATALOG.map((game) => ({
        ...game,
        questionCount: countMap[game.key] || 0,
      })),
      skills: SKILL_IDS,
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

    let nextGameSkills: GameSkillsMap | undefined;
    let nextEnabledSkills: SkillId[] | undefined;

    if (body.gameSkills !== undefined) {
      const normalized = normalizeGameSkillsInput(body.gameSkills);
      if (normalized === null) {
        return Response.json(
          { success: false, message: 'Bản đồ kỹ năng game không hợp lệ' },
          { status: 400 }
        );
      }
      nextGameSkills = normalized;
    }

    if (body.enabledSkills !== undefined) {
      const normalized = normalizeEnabledSkillsInput(body.enabledSkills);
      if (normalized === null) {
        return Response.json(
          { success: false, message: 'Danh sách kỹ năng không hợp lệ' },
          { status: 400 }
        );
      }
      nextEnabledSkills = normalized;
    }

    // Legacy enabledGames PATCH: convert to gameSkills via convention, then derive.
    if (body.enabledGames !== undefined && nextGameSkills === undefined) {
      const normalized = normalizeEnabledGamesInput(body.enabledGames);
      if (normalized === null) {
        return Response.json(
          { success: false, message: 'Danh sách game không hợp lệ' },
          { status: 400 }
        );
      }
      nextGameSkills = buildGameSkillsFromEnabledGames(normalized);
    }

    const resolvedSkills =
      nextGameSkills ?? resolveGameSkillsMap(existing.gameSkills, existing.enabledGames);
    const resolvedEnabled =
      nextEnabledSkills ?? resolveEnabledSkillIds(existing.enabledSkills);
    const derivedEnabledGames =
      nextGameSkills !== undefined || nextEnabledSkills !== undefined
        ? deriveEnabledGamesFromSkills(resolvedSkills, resolvedEnabled)
        : undefined;

    const item = await prisma.course.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.levelName !== undefined ? { levelName: String(body.levelName).trim() } : {}),
        ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
        ...(nextGameSkills !== undefined ? { gameSkills: nextGameSkills } : {}),
        ...(nextEnabledSkills !== undefined ? { enabledSkills: nextEnabledSkills } : {}),
        ...(derivedEnabledGames !== undefined ? { enabledGames: derivedEnabledGames } : {}),
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

    const skillFields = courseSkillFields(item);
    return Response.json({ success: true, item: { ...item, ...skillFields } });
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

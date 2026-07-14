import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { notArchived } from '@/lib/admin/notArchived';
import { progressCourseKey, scoreLookupCourseKeys } from '@/lib/courseKey';
import { prisma } from '@/lib/db';
import {
  GAME_CATALOG,
  progressStatuses,
  resolveEnabledGameKeys,
} from '@/lib/gameCatalog';

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const course = await prisma.course.findFirst({
      where: { id, active: true, archivedAt: null },
      select: {
        id: true,
        name: true,
        levelName: true,
        enabledGames: true,
        ebookFileId: true,
        ebookPageStart: true,
        ebookPageEnd: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy khóa học' },
        { status: 404 }
      );
    }

    let ebook: { id: string; title: string; pageCount: number | null } | null = null;
    if (course.ebookFileId) {
      const row = await prisma.ebook.findFirst({
        where: { id: course.ebookFileId, active: true, ...notArchived },
        select: { id: true, title: true, pageCount: true },
      });
      ebook = row;
    }

    const courseKey = progressCourseKey(course.name, course.levelName);
    const enabledKeys = resolveEnabledGameKeys(course.enabledGames);
    const enabledSet = new Set(enabledKeys);
    const catalogForCourse = GAME_CATALOG.filter((game) => enabledSet.has(game.key));
    const gameKeys = catalogForCourse.map((game) => game.key);

    const [questionGroups, progressRows] = await Promise.all([
      gameKeys.length
        ? prisma.question.groupBy({
            by: ['game'],
            where: {
              courseId: course.id,
              active: true,
              archivedAt: null,
              game: { in: gameKeys },
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      gameKeys.length
        ? prisma.gameProgress.findMany({
            where: {
              userId: session.userId,
              courseKey,
              game: { in: gameKeys },
            },
            select: {
              game: true,
              statuses: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const countByGame = new Map(
      questionGroups.map((row) => [row.game, row._count._all] as const)
    );
    const progressByGame = new Map(
      progressRows.map((row) => [row.game, progressStatuses(row.statuses)] as const)
    );

    const games: Record<string, { questionCount: number; statuses: string[] }> = {};
    for (const key of gameKeys) {
      games[key] = {
        questionCount: countByGame.get(key) || 0,
        statuses: progressByGame.get(key) || [],
      };
    }

    const scoreCourseKeys = scoreLookupCourseKeys(course.name, course.levelName);
    const scoreAggregate = await prisma.scoreLog.aggregate({
      where: {
        userId: session.userId,
        course: { in: scoreCourseKeys },
      },
      _sum: {
        points: true,
      },
    });
    const totalScore = scoreAggregate._sum.points ?? 0;

    const { enabledGames: _omit, ebookFileId, ebookPageStart, ebookPageEnd, ...coursePublic } =
      course;

    const pageStart = ebookPageStart && ebookPageStart > 0 ? ebookPageStart : 1;
    const pageEnd =
      ebookPageEnd && ebookPageEnd >= pageStart
        ? ebookPageEnd
        : ebook?.pageCount && ebook.pageCount >= pageStart
          ? ebook.pageCount
          : pageStart;

    return NextResponse.json({
      success: true,
      course: {
        ...coursePublic,
        courseKey,
        enabledGames: enabledKeys,
        ebook: ebook
          ? {
              id: ebook.id,
              title: ebook.title,
              pageStart,
              pageEnd,
            }
          : null,
      },
      games,
      totalScore,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values
        .map((value) => String(value || '').trim())
        .filter((value) => value && value !== 'Tất cả')
    ),
  ].sort((a, b) => a.localeCompare(b, 'vi'));
}

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(req: Request) {
  try {
    await requireSession();

    const { searchParams } = new URL(req.url);
    const levelName = String(searchParams.get('levelName') || '').trim();

    const courseWhere = {
      active: true,
      archivedAt: null,
      ...(levelName ? { levelName } : {}),
    };

    const [courses, classLevels, activeCoursesForFilters] = await Promise.all([
      prisma.course.findMany({
        where: courseWhere,
        select: {
          id: true,
          name: true,
          levelName: true,
        },
        orderBy: [{ levelName: 'asc' }, { name: 'asc' }],
      }),
      prisma.classLevel.findMany({
        where: { active: true, archivedAt: null },
        select: { levelName: true },
        orderBy: [{ levelName: 'asc' }],
      }),
      prisma.course.findMany({
        where: { active: true, archivedAt: null },
        select: { levelName: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      courses,
      filters: {
        levels: uniqueSorted([
          ...classLevels.map((item) => item.levelName),
          ...activeCoursesForFilters.map((item) => item.levelName),
        ]),
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

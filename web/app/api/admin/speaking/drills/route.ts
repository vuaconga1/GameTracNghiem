import type { Prisma } from '@prisma/client';

import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { prisma } from '@/lib/db';
import {
  activityForDrillKind,
  isSpeakingDrillActivityType,
  parseSpeakingDrillPayload,
  SPEAKING_DRILL_GAME,
} from '@/lib/speaking/drillSchemas';
import { assertSpeakingMutationRequest } from '@/lib/speaking/security';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const courseId = url.searchParams.get('courseId')?.trim() || '';
    const requestedActivity = url.searchParams.get('activityType')?.trim();
    if (
      !courseId ||
      (requestedActivity &&
        !isSpeakingDrillActivityType(requestedActivity))
    ) {
      return Response.json(
        { success: false, message: 'Invalid courseId or activityType' },
        { status: 400 },
      );
    }
    const course = await prisma.course.findFirst({
      where: { id: courseId, archivedAt: null },
      select: { id: true, name: true, levelName: true },
    });
    if (!course) {
      return Response.json(
        { success: false, message: 'Course not found' },
        { status: 404 },
      );
    }
    const rows = await prisma.question.findMany({
      where: {
        courseId,
        game: SPEAKING_DRILL_GAME,
        archivedAt: null,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const items = rows.flatMap((row) => {
      const parsed = parseSpeakingDrillPayload(row.payload);
      if (
        requestedActivity &&
        activityForDrillKind(parsed.kind) !== requestedActivity
      ) {
        return [];
      }
      return [{ ...row, payload: parsed }];
    });
    return Response.json(
      { success: true, course, items },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    assertSpeakingMutationRequest(req);
    await requireAdmin();
    const body = (await req.json()) as Record<string, unknown>;
    const courseId = String(body.courseId || '').trim();
    if (!courseId) {
      return Response.json(
        { success: false, message: 'courseId is required' },
        { status: 400 },
      );
    }
    const course = await prisma.course.findFirst({
      where: { id: courseId, archivedAt: null },
      select: { id: true, levelName: true },
    });
    if (!course) {
      return Response.json(
        { success: false, message: 'Course not found' },
        { status: 404 },
      );
    }
    let payload;
    try {
      payload = parseSpeakingDrillPayload(body.payload);
    } catch (error) {
      return Response.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Invalid speaking drill payload',
        },
        { status: 400 },
      );
    }
    const sortOrder = Number(body.sortOrder);
    const item = await prisma.question.create({
      data: {
        courseId,
        game: SPEAKING_DRILL_GAME,
        level: String(body.level || course.levelName).trim() || null,
        payload: payload as Prisma.InputJsonValue,
        active: body.active !== false,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        externalId: body.externalId
          ? String(body.externalId).trim() || null
          : null,
      },
    });
    return Response.json({ success: true, item }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

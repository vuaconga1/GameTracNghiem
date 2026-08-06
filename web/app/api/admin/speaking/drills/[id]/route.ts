import type { Prisma } from '@prisma/client';

import { requireAdmin } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { prisma } from '@/lib/db';
import {
  parseSpeakingDrillPayload,
  SPEAKING_DRILL_GAME,
} from '@/lib/speaking/drillSchemas';
import { assertSpeakingMutationRequest } from '@/lib/speaking/security';

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
  try {
    await requireAdmin();
    const { id } = await params;
    const item = await prisma.question.findFirst({
      where: {
        id,
        game: SPEAKING_DRILL_GAME,
        archivedAt: null,
      },
      include: { course: true },
    });
    if (!item) {
      return Response.json(
        { success: false, message: 'Speaking drill not found' },
        { status: 404 },
      );
    }
    return Response.json({
      success: true,
      item: { ...item, payload: parseSpeakingDrillPayload(item.payload) },
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(req: Request, { params }: Context) {
  try {
    assertSpeakingMutationRequest(req);
    await requireAdmin();
    const { id } = await params;
    const existing = await prisma.question.findFirst({
      where: {
        id,
        game: SPEAKING_DRILL_GAME,
        archivedAt: null,
      },
    });
    if (!existing) {
      return Response.json(
        { success: false, message: 'Speaking drill not found' },
        { status: 404 },
      );
    }
    const body = (await req.json()) as Record<string, unknown>;
    let payload = existing.payload as Prisma.InputJsonValue;
    if (body.payload !== undefined) {
      try {
        payload = parseSpeakingDrillPayload(
          body.payload,
        ) as Prisma.InputJsonValue;
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
    }
    const sortOrder =
      body.sortOrder === undefined ? undefined : Number(body.sortOrder);
    const item = await prisma.question.update({
      where: { id },
      data: {
        payload,
        ...(body.active !== undefined
          ? { active: Boolean(body.active) }
          : {}),
        ...(sortOrder !== undefined && Number.isFinite(sortOrder)
          ? { sortOrder }
          : {}),
        ...(body.level !== undefined
          ? { level: String(body.level || '').trim() || null }
          : {}),
        ...(body.externalId !== undefined
          ? { externalId: String(body.externalId || '').trim() || null }
          : {}),
      },
    });
    return Response.json({ success: true, item });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(req: Request, { params }: Context) {
  try {
    assertSpeakingMutationRequest(req);
    await requireAdmin();
    const { id } = await params;
    const existing = await prisma.question.findFirst({
      where: {
        id,
        game: SPEAKING_DRILL_GAME,
        archivedAt: null,
      },
      select: { id: true },
    });
    if (!existing) {
      return Response.json(
        { success: false, message: 'Speaking drill not found' },
        { status: 404 },
      );
    }
    const item = await prisma.question.update({
      where: { id },
      data: { active: false, archivedAt: new Date() },
    });
    return Response.json({ success: true, item });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

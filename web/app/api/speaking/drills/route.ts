import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertSpeakingAccess } from '@/lib/speaking/access';
import {
  isSpeakingDrillActivityType,
  parseSpeakingDrillPayload,
  SPEAKING_DRILL_GAME,
  toStudentSpeakingDrill,
} from '@/lib/speaking/drillSchemas';
import { speakingErrorResponse } from '@/lib/speaking/http';

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);
    const courseId = url.searchParams.get('courseId')?.trim() || '';
    const requestedActivity = url.searchParams.get('activityType')?.trim();
    if (!courseId || !isSpeakingDrillActivityType(requestedActivity)) {
      return Response.json(
        {
          success: false,
          message: 'Missing courseId or invalid short-drill activityType',
        },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const access = await assertSpeakingAccess({
      session,
      courseId,
      activityType: requestedActivity,
    });
    const rows = await prisma.question.findMany({
      where: {
        courseId,
        game: SPEAKING_DRILL_GAME,
        active: true,
        archivedAt: null,
      },
      select: {
        id: true,
        payload: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const exercises = rows.flatMap((row) => {
      try {
        const payload = parseSpeakingDrillPayload(
          row.payload,
          requestedActivity,
        );
        return [toStudentSpeakingDrill(row.id, payload)];
      } catch {
        return [];
      }
    });
    return Response.json(
      {
        success: true,
        activityType: requestedActivity,
        maxDurationSeconds: access.config?.durationSeconds ?? 60,
        exercises,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return speakingErrorResponse(error);
  }
}

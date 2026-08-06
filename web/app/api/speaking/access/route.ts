import { optionalSession } from '@/lib/auth';
import {
  evaluateSpeakingAccess,
  SPEAKING_ACTIVITY_TYPES,
} from '@/lib/speaking/access';
import { isSpeakingActivityType } from '@/lib/speaking/config';
import { speakingErrorResponse } from '@/lib/speaking/http';
import { trackSpeakingEvent } from '@/lib/speaking/analytics';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const courseId = url.searchParams.get('courseId')?.trim() || '';
    const activityType = url.searchParams.get('activityType')?.trim() || '';
    if (!courseId || !isSpeakingActivityType(activityType)) {
      return Response.json(
        {
          success: false,
          message: 'Thiếu courseId hoặc activityType không hợp lệ',
          activityTypes: SPEAKING_ACTIVITY_TYPES,
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const session = await optionalSession();
    const access = await evaluateSpeakingAccess({
      session,
      courseId,
      activityType,
    });
    trackSpeakingEvent({
      event:
        access.reason === 'DAILY_LIMIT_REACHED'
          ? 'limit_reached'
          : 'access_decision',
      actorId: session?.userId,
      properties: {
        activityType,
        outcome: access.allowed ? 'allowed' : 'denied',
        reason: access.reason,
        remaining: access.quota?.remaining ?? null,
        limit: access.quota?.limit ?? null,
        promptVersion: access.config?.promptVersion ?? null,
      },
    });

    return Response.json(
      { success: true, access },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

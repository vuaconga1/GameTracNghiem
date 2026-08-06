import { requireSession } from '@/lib/auth';
import { trackSpeakingEvent } from '@/lib/speaking/analytics';
import { isSpeakingActivityType } from '@/lib/speaking/config';
import { speakingErrorResponse } from '@/lib/speaking/http';
import { assertSpeakingMutationRequest } from '@/lib/speaking/security';

export async function POST(request: Request) {
  try {
    assertSpeakingMutationRequest(request);
    const auth = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      event?: unknown;
      activityType?: unknown;
    };
    const event = String(body.event || '');
    const activityType = String(body.activityType || '');
    if (
      (event !== 'granted' && event !== 'denied') ||
      !isSpeakingActivityType(activityType)
    ) {
      return Response.json(
        { success: false, message: 'Invalid Speaking analytics event' },
        { status: 400 },
      );
    }
    trackSpeakingEvent({
      event: 'microphone_permission',
      actorId: auth.userId,
      properties: { activityType, outcome: event },
    });
    return Response.json(
      { success: true },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return speakingErrorResponse(error);
  }
}

import { requireSession } from '@/lib/auth';
import { speakingErrorResponse } from '@/lib/speaking/http';
import {
  assertSessionEndSchedulerReady,
  dispatchSessionEndJobForSession,
} from '@/lib/speaking/sessionEndScheduler';
import { assertSpeakingMutationRequest } from '@/lib/speaking/security';
import { markSessionStarted } from '@/lib/speaking/usage';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    assertSpeakingMutationRequest(req);
    const auth = await requireSession();
    const { id } = await params;
    assertSessionEndSchedulerReady();

    const result = await markSessionStarted({
      sessionId: id,
      userId: auth.userId,
      authSession: auth,
      idempotencyKey: req.headers.get('idempotency-key'),
    });
    // Outbox row is already committed. Do not fail /started if QStash publish
    // fails — client needs mustEndAt for the 3-minute countdown; cron/retry
    // will redispatch the PENDING job.
    let hardStopQueued = true;
    try {
      await dispatchSessionEndJobForSession(result.session.id);
    } catch (dispatchErr) {
      hardStopQueued = false;
      console.error('[speaking] hard-stop dispatch failed after start', {
        sessionId: result.session.id,
        error:
          dispatchErr instanceof Error
            ? dispatchErr.message
            : String(dispatchErr),
      });
    }

    return Response.json({
      success: true,
      alreadyStarted: result.alreadyStarted,
      hardStopQueued,
      session: {
        id: result.session.id,
        status: result.session.status,
        startedAt: result.session.startedAt,
        mustEndAt: result.session.mustEndAt,
        usageCountedAt: result.session.usageCountedAt,
      },
    });
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

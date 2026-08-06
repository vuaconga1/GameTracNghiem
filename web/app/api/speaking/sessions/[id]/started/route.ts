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
    // The outbox row was committed in markSessionStarted's transaction.
    await dispatchSessionEndJobForSession(result.session.id);

    return Response.json({
      success: true,
      alreadyStarted: result.alreadyStarted,
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

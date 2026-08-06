import {
  assertSessionEndSchedulerReady,
  dispatchPendingSessionEndJobs,
  isCronRequestAuthorized,
  sweepOverdueSpeakingSessions,
} from '@/lib/speaking/sessionEndScheduler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function run(req: Request) {
  if (!isCronRequestAuthorized(req)) {
    return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    assertSessionEndSchedulerReady();
    const now = new Date();
    const sweep = await sweepOverdueSpeakingSessions(now);
    const dispatch = await dispatchPendingSessionEndJobs(now);
    return Response.json({ success: true, sweep, dispatch });
  } catch (error) {
    console.error('[speaking] session-end cron failed', error);
    return Response.json(
      { success: false, message: 'Session-end cron failed' },
      { status: 500 },
    );
  }
}

export const GET = run;
export const POST = run;

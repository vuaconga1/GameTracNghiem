import { cleanupDueSpeakingRecordings } from '@/lib/speaking/recordingRetention';
import { isCronRequestAuthorized } from '@/lib/speaking/sessionEndScheduler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function run(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const cleanup = await cleanupDueSpeakingRecordings();
    return Response.json({ success: true, cleanup });
  } catch {
    return Response.json(
      { success: false, message: 'Speaking recording cleanup failed' },
      { status: 500 },
    );
  }
}

export const GET = run;
export const POST = run;

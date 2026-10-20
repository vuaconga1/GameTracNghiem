import { isCronRequestAuthorized } from '@/lib/speaking/sessionEndScheduler';
import { sendGradeAccessReport } from '@/lib/sendGradeAccessReport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function run(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const report = await sendGradeAccessReport();
    return Response.json({ success: true, report });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không gửi được báo cáo';
    return Response.json({ success: false, message }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;

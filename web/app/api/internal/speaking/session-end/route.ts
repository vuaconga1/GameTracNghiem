import {
  processSessionEndJob,
  verifySessionEndCallback,
} from '@/lib/speaking/sessionEndScheduler';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const verified = await verifySessionEndCallback({
    body: rawBody,
    signature: req.headers.get('upstash-signature'),
    authorization: req.headers.get('authorization'),
    requestUrl: req.url,
    upstashRegion: req.headers.get('upstash-region'),
    internalSignature: req.headers.get('x-wewin-internal-signature'),
  });
  if (!verified) {
    return Response.json(
      { success: false, message: 'Invalid scheduler signature' },
      { status: 401 },
    );
  }

  let body: { jobId?: string };
  try {
    body = JSON.parse(rawBody) as { jobId?: string };
  } catch {
    return Response.json(
      { success: false, message: 'Invalid callback body' },
      { status: 400 },
    );
  }
  const jobId = String(body.jobId || '').trim();
  if (!jobId) {
    return Response.json(
      { success: false, message: 'Missing jobId' },
      { status: 400 },
    );
  }

  try {
    const result = await processSessionEndJob({ jobId });
    return Response.json({ success: true, ...result });
  } catch (error) {
    const status =
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof error.status === 'number'
        ? error.status
        : 500;
    return Response.json(
      {
        success: false,
        message:
          status < 500 && error instanceof Error
            ? error.message
            : 'Session hard-stop failed',
      },
      {
        status,
        headers:
          status === 425 || status === 409
            ? { 'Retry-After': '5' }
            : undefined,
      },
    );
  }
}

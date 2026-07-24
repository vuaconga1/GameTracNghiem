import { requireSession } from '@/lib/auth';
import { speakingErrorResponse } from '@/lib/speaking/http';
import { createPracticeSession } from '@/lib/speaking/usage';

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = (await req.json().catch(() => ({}))) as { topicId?: string };
    const topicId = String(body.topicId || '').trim();
    if (!topicId) {
      return Response.json({ success: false, message: 'Thiếu topicId' }, { status: 400 });
    }

    const result = await createPracticeSession({
      userId: session.userId,
      topicId,
    });

    return Response.json({
      success: true,
      session: {
        id: result.session.id,
        status: result.session.status,
        kind: result.session.kind,
        topicId: result.topic.id,
        reservedUntil: result.reservedUntil.toISOString(),
      },
      topic: result.topic,
    });
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

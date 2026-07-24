import { requireSession } from '@/lib/auth';
import { speakingErrorResponse } from '@/lib/speaking/http';
import { markSessionStarted } from '@/lib/speaking/usage';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const auth = await requireSession();
    const { id } = await params;
    const result = await markSessionStarted({
      sessionId: id,
      userId: auth.userId,
    });

    return Response.json({
      success: true,
      alreadyStarted: result.alreadyStarted,
      session: {
        id: result.session.id,
        status: result.session.status,
        startedAt: result.session.startedAt,
      },
    });
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

import { adminErrorResponse } from '@/lib/admin/http';
import { requireAdmin } from '@/lib/auth';
import { createPreviewSession } from '@/lib/speaking/usage';

type Ctx = { params: Promise<{ id: string }> };

/** Create ADMIN_PREVIEW session for a topic (does not touch daily usage). */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const result = await createPreviewSession({
      userId: admin.userId,
      topicId: id,
    });

    return Response.json({
      success: true,
      session: {
        id: result.session.id,
        status: result.session.status,
        kind: result.session.kind,
        topicId: result.topic.id,
      },
      topic: result.topic,
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

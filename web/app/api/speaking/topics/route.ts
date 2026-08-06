import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertSpeakingAccess } from '@/lib/speaking/access';
import { speakingErrorResponse } from '@/lib/speaking/http';

/** List active speaking topics for a course (student). */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const courseId = new URL(req.url).searchParams.get('courseId')?.trim();
    if (!courseId) {
      return Response.json({ success: false, message: 'Thiếu courseId' }, { status: 400 });
    }
    if (session.role !== 'admin') {
      await assertSpeakingAccess({
        session,
        courseId,
        activityType: 'REALTIME_CONVERSATION',
      });
    }

    const topics = await prisma.speakingTopic.findMany({
      where: { courseId, active: true, archivedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        courseId: true,
        title: true,
        durationSeconds: true,
        sortOrder: true,
      },
    });

    return Response.json({ success: true, topics });
  } catch (err) {
    return speakingErrorResponse(err);
  }
}

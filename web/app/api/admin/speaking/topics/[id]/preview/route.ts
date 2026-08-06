import { adminErrorResponse } from '@/lib/admin/http';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  isSpeakingEmergencyDisabled,
  OPENAI_REALTIME_MODEL,
} from '@/lib/speaking/config';
import { buildSpeakingRealtimeInstructions } from '@/lib/speaking/prompts';
import { assertSpeakingMutationRequest } from '@/lib/speaking/security';
import { createPreviewSession } from '@/lib/speaking/usage';

type Ctx = { params: Promise<{ id: string }> };

/** Show the exact composed prompt without opening an AI session. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const [topic, config] = await Promise.all([
      prisma.speakingTopic.findFirst({
        where: { id, archivedAt: null },
        include: {
          course: { select: { id: true, name: true, levelName: true } },
        },
      }),
      prisma.speakingActivityConfig.findUnique({
        where: { activityType: 'REALTIME_CONVERSATION' },
      }),
    ]);
    if (!topic) {
      return Response.json(
        { success: false, message: 'Không tìm thấy topic' },
        { status: 404 },
      );
    }
    return Response.json({
      success: true,
      prompt: buildSpeakingRealtimeInstructions({
        topicInstructions: topic.instructions,
        topicTitle: topic.title,
        levelName: topic.course.levelName,
      }),
      promptVersion: config?.promptVersion ?? null,
      model: OPENAI_REALTIME_MODEL,
      previewState: {
        emergencyDisabled: isSpeakingEmergencyDisabled(),
        activityEnabled: config?.enabled === true,
        bypassesStudentKillSwitch: true,
      },
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

/** Create ADMIN_PREVIEW session for a topic (does not touch daily usage). */
export async function POST(req: Request, { params }: Ctx) {
  try {
    assertSpeakingMutationRequest(req);
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
      previewState: result.previewState,
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

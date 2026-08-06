import { adminErrorResponse } from '@/lib/admin/http';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  OPENAI_GUIDED_MODEL,
  OPENAI_REALTIME_MODEL,
  OPENAI_TRANSCRIPTION_MODEL,
  isSpeakingEmergencyDisabled,
  isSpeakingActivityType,
  SPEAKING_ACTIVITY_TYPES,
} from '@/lib/speaking/config';
import { assertSpeakingMutationRequest } from '@/lib/speaking/security';

export async function GET() {
  try {
    await requireAdmin();
    const configs = await prisma.speakingActivityConfig.findMany();
    const order = new Map(SPEAKING_ACTIVITY_TYPES.map((type, index) => [type, index]));
    configs.sort(
      (left, right) =>
        (order.get(left.activityType as (typeof SPEAKING_ACTIVITY_TYPES)[number]) ?? 99) -
        (order.get(right.activityType as (typeof SPEAKING_ACTIVITY_TYPES)[number]) ?? 99),
    );
    return Response.json({
      success: true,
      configs,
      emergencyDisabled: isSpeakingEmergencyDisabled(),
      models: {
        realtime: OPENAI_REALTIME_MODEL,
        transcription: OPENAI_TRANSCRIPTION_MODEL,
        guided: OPENAI_GUIDED_MODEL,
      },
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    assertSpeakingMutationRequest(req);
    await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as {
      activityType?: unknown;
      enabled?: unknown;
      dailyLimit?: unknown;
      durationSeconds?: unknown;
      reservationTtlSeconds?: unknown;
      promptVersion?: unknown;
    };
    const activityType = String(body.activityType || '').trim();
    const dailyLimit = Number(body.dailyLimit);
    const durationSeconds = Number(body.durationSeconds);
    const reservationTtlSeconds = Number(body.reservationTtlSeconds);
    const promptVersion = String(body.promptVersion || '').trim().slice(0, 80);

    if (
      !isSpeakingActivityType(activityType) ||
      typeof body.enabled !== 'boolean' ||
      !Number.isInteger(dailyLimit) ||
      dailyLimit < 1 ||
      dailyLimit > 1000 ||
      !Number.isInteger(durationSeconds) ||
      durationSeconds < 10 ||
      durationSeconds > 3600 ||
      !Number.isInteger(reservationTtlSeconds) ||
      reservationTtlSeconds < 10 ||
      reservationTtlSeconds > 3600 ||
      !promptVersion
    ) {
      return Response.json(
        { success: false, message: 'Cấu hình Speaking không hợp lệ' },
        { status: 400 },
      );
    }

    const existing = await prisma.speakingActivityConfig.findUnique({
      where: { activityType },
      select: { activityType: true },
    });
    if (!existing) {
      return Response.json(
        { success: false, message: 'Activity chưa được khai báo bởi migration' },
        { status: 404 },
      );
    }

    const config = await prisma.speakingActivityConfig.update({
      where: { activityType },
      data: {
        enabled: body.enabled,
        dailyLimit,
        durationSeconds,
        reservationTtlSeconds,
        promptVersion,
      },
    });

    return Response.json({ success: true, config });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

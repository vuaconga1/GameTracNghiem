import { requireSession } from '@/lib/auth';
import { DrillProcessingError } from '@/lib/speaking/drillErrors';
import { runSpeakingDrillPipeline } from '@/lib/speaking/drillPipeline';
import { isSpeakingDrillActivityType } from '@/lib/speaking/drillSchemas';
import { speakingErrorResponse } from '@/lib/speaking/http';
import {
  MAX_DRILL_AUDIO_BYTES,
  MAX_DRILL_AUDIO_DURATION_MS,
} from '@/lib/speaking/openaiDrills';
import {
  assertSpeakingMutationRequest,
  enforceSpeakingBurstLimit,
} from '@/lib/speaking/security';

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(req: Request) {
  try {
    // Authenticate before parsing multipart bytes.
    const session = await requireSession();
    assertSpeakingMutationRequest(req);
    await enforceSpeakingBurstLimit({
      userId: session.userId,
      action: 'DRILL_ASSESS',
    });
    const form = await req.formData();
    const courseId = field(form, 'courseId');
    const questionId = field(form, 'questionId');
    const requestedActivity = field(form, 'activityType');
    const idempotencyKey = field(form, 'idempotencyKey');
    const locale = field(form, 'locale') === 'vi' ? 'vi' : 'en';
    const clientAudioDurationMs = Number(field(form, 'audioDurationMs'));
    const audioDurationMs = Number.isFinite(clientAudioDurationMs)
      ? Math.min(Math.max(clientAudioDurationMs, 0), MAX_DRILL_AUDIO_DURATION_MS * 2)
      : 0;
    const audio = form.get('audio');

    if (
      !courseId ||
      !questionId ||
      !isSpeakingDrillActivityType(requestedActivity) ||
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 200 ||
      typeof File === 'undefined' ||
      !(audio instanceof File)
    ) {
      return Response.json(
        {
          success: false,
          message: 'Invalid short-drill submission',
          counted: false,
        },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    if (audio.size > MAX_DRILL_AUDIO_BYTES) {
      throw new DrillProcessingError(
        'INVALID_AUDIO_SIZE',
        'The recording is too large.',
        400,
      );
    }

    const result = await runSpeakingDrillPipeline({
      authSession: session,
      courseId,
      questionId,
      activityType: requestedActivity,
      idempotencyKey,
      audioBytes: new Uint8Array(await audio.arrayBuffer()),
      audioMimeType: audio.type,
      audioDurationMs,
      locale,
    });

    return Response.json(
      {
        success: true,
        idempotent: result.idempotent,
        points: result.points,
        attempt: result.attempt,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return speakingErrorResponse(error);
  }
}

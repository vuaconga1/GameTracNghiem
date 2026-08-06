import 'server-only';

import type { SessionPayload } from '@/lib/session';
import { trackSpeakingEvent } from '@/lib/speaking/analytics';
import {
  completeSpeakingDrillAttempt,
  failSpeakingDrillAttempt,
  publicSpeakingAttempt,
  reserveSpeakingDrillAttempt,
} from '@/lib/speaking/drillAttempts';
import {
  DrillAttemptError,
  DrillProcessingError,
} from '@/lib/speaking/drillErrors';
import {
  scoreDeterministicDrill,
  type DrillLocale,
} from '@/lib/speaking/drillScoring';
import type { SpeakingDrillActivityType } from '@/lib/speaking/drillSchemas';
import {
  scoreGuidedDrill,
  parseDrillAudioDurationMs,
  transcribeDrillAudio,
  validateDrillAudio,
} from '@/lib/speaking/openaiDrills';

export type PipelineDependencies = {
  reserve: typeof reserveSpeakingDrillAttempt;
  complete: typeof completeSpeakingDrillAttempt;
  fail: typeof failSpeakingDrillAttempt;
  transcribe: typeof transcribeDrillAudio;
  scoreGuided: typeof scoreGuidedDrill;
  parseDuration?: typeof parseDrillAudioDurationMs;
};

const defaultDependencies: PipelineDependencies = {
  reserve: reserveSpeakingDrillAttempt,
  complete: completeSpeakingDrillAttempt,
  fail: failSpeakingDrillAttempt,
  transcribe: transcribeDrillAudio,
  scoreGuided: scoreGuidedDrill,
  parseDuration: parseDrillAudioDurationMs,
};

function failureCode(error: unknown): string {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
    ? error.code
    : 'SHORT_DRILL_PROCESSING_FAILED';
}

export async function runSpeakingDrillPipeline(
  input: {
    authSession: SessionPayload;
    courseId: string;
    questionId: string;
    activityType: SpeakingDrillActivityType;
    idempotencyKey: string;
    audioBytes: Uint8Array;
    audioMimeType: string;
    audioDurationMs: number;
    locale: DrillLocale;
  },
  dependencies: PipelineDependencies = defaultDependencies,
) {
  let reservedAttemptId: string | null = null;
  try {
    const serverDurationMs = await (
      dependencies.parseDuration ?? parseDrillAudioDurationMs
    )({
      bytes: input.audioBytes,
      mimeType: input.audioMimeType,
    });
    const basicAudio = validateDrillAudio({
      bytes: input.audioBytes,
      mimeType: input.audioMimeType,
      durationMs: serverDurationMs,
    });
    const reservation = await dependencies.reserve({
      authSession: input.authSession,
      courseId: input.courseId,
      questionId: input.questionId,
      activityType: input.activityType,
      idempotencyKey: input.idempotencyKey,
    });
    if (reservation.kind === 'completed') {
      return {
        attempt: reservation.attempt,
        points: reservation.attempt.points,
        idempotent: true,
      };
    }
    reservedAttemptId = reservation.attemptId;
    trackSpeakingEvent({
      event: 'attempt_started',
      actorId: input.authSession.userId,
      sessionId: reservation.sessionId,
      attemptId: reservation.attemptId,
      properties: {
        activityType: input.activityType,
        promptVersion: reservation.promptVersion,
        audioBytes: input.audioBytes.byteLength,
        audioDurationMs: serverDurationMs,
        clientDurationDeltaMs: Math.round(
          input.audioDurationMs - serverDurationMs,
        ),
      },
    });

    const audio = validateDrillAudio({
      ...basicAudio,
      maxDurationMs: reservation.config.durationSeconds * 1_000,
    });
    const transcription = await dependencies.transcribe(audio);
    let score: number;
    let details: Record<string, unknown>;
    let feedback: Record<string, unknown>;
    let model = transcription.model;
    let inputTokens = transcription.usage?.inputTokens ?? 0;
    let outputTokens = transcription.usage?.outputTokens ?? 0;

    if (reservation.payload.kind === 'guided') {
      const guided = await dependencies.scoreGuided({
        payload: reservation.payload,
        transcript: transcription.transcript,
        locale: input.locale,
      });
      score = guided.assessment.score;
      details = {
        scoringMethod: 'guided_structured_v1',
        relevanceScore: guided.assessment.relevanceScore,
        completenessScore: guided.assessment.completenessScore,
        languageScore: guided.assessment.languageScore,
      };
      feedback = {
        label:
          input.locale === 'vi'
            ? 'Phản hồi luyện tập'
            : 'Practice feedback',
        praise: guided.assessment.praise,
        improvement: guided.assessment.improvement,
        disclaimer:
          input.locale === 'vi'
            ? 'Phản hồi dựa trên nội dung bản chép lời, không đánh giá âm vị hay giọng nói.'
            : 'Feedback is based on transcript content, not phonemes or accent.',
      };
      model = `${transcription.model}+${guided.model}`;
      inputTokens += guided.usage?.inputTokens ?? 0;
      outputTokens += guided.usage?.outputTokens ?? 0;
    } else {
      const deterministic = scoreDeterministicDrill({
        payload: reservation.payload,
        transcript: transcription.transcript,
        durationMs: audio.durationMs,
        locale: input.locale,
      });
      score = deterministic.score;
      details = deterministic.details;
      feedback = deterministic.feedback;
    }

    const completed = await dependencies.complete({
      attemptId: reservation.attemptId,
      userId: input.authSession.userId,
      transcript: transcription.transcript,
      score,
      details: {
        ...details,
        audioTelemetry: {
          serverDurationMs: audio.durationMs,
          clientDurationMs: Math.round(input.audioDurationMs),
          deltaMs: Math.round(input.audioDurationMs - audio.durationMs),
        },
      },
      feedback,
      audioMimeType: audio.mimeType,
      audioBytes: audio.bytes.byteLength,
      audioDurationMs: audio.durationMs,
      model,
      inputTokens,
      outputTokens,
    });
    const attempt = publicSpeakingAttempt(completed.attempt);
    trackSpeakingEvent({
      event: 'attempt_completed',
      actorId: input.authSession.userId,
      sessionId: reservation.sessionId,
      attemptId: reservation.attemptId,
      properties: {
        activityType: input.activityType,
        status: attempt.status,
        model,
        promptVersion: reservation.promptVersion,
        inputTokens,
        outputTokens,
        audioBytes: audio.bytes.byteLength,
        audioDurationMs: audio.durationMs,
        clientDurationDeltaMs: Math.round(
          input.audioDurationMs - audio.durationMs,
        ),
        idempotent: completed.idempotent,
      },
    });
    return {
      attempt,
      points: attempt.points,
      idempotent: completed.idempotent,
    };
  } catch (error) {
    if (reservedAttemptId) {
      try {
        await dependencies.fail({
          attemptId: reservedAttemptId,
          userId: input.authSession.userId,
          failureCode: failureCode(error),
        });
      } catch {
        throw new DrillProcessingError('RESERVATION_RELEASE_FAILED');
      }
      if (
        !(error instanceof DrillAttemptError) &&
        !(error instanceof DrillProcessingError)
      ) {
        throw new DrillProcessingError('SHORT_DRILL_PROCESSING_FAILED');
      }
    }
    trackSpeakingEvent({
      event: 'operation_failed',
      actorId: input.authSession.userId,
      attemptId: reservedAttemptId,
      properties: {
        activityType: input.activityType,
        stage: 'SHORT_DRILL',
        reason: failureCode(error),
      },
    });
    throw error;
  } finally {
    input.audioBytes.fill(0);
  }
}

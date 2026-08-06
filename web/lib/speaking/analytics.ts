import { createHash } from 'crypto';

export const SPEAKING_ANALYTICS_EVENTS = [
  'access_decision',
  'session_reserved',
  'realtime_connect',
  'microphone_permission',
  'attempt_started',
  'attempt_completed',
  'session_completed',
  'operation_failed',
  'limit_reached',
] as const;

export type SpeakingAnalyticsEvent =
  (typeof SPEAKING_ANALYTICS_EVENTS)[number];

const ALLOWED_PROPERTIES = new Set([
  'activityType',
  'audioBytes',
  'audioDurationMs',
  'audioInputTokens',
  'audioOutputTokens',
  'clientDurationDeltaMs',
  'estimatedCostUsd',
  'idempotent',
  'inputTokens',
  'limit',
  'model',
  'outcome',
  'outputTokens',
  'promptVersion',
  'reason',
  'remaining',
  'sessionKind',
  'stage',
  'status',
]);

type AnalyticsValue = string | number | boolean | null;

export type SpeakingAnalyticsEnvelope = {
  event: SpeakingAnalyticsEvent;
  at: string;
  actorRef?: string;
  sessionRef?: string;
  attemptRef?: string;
  properties: Record<string, AnalyticsValue>;
};

export function speakingAnalyticsRef(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return createHash('sha256').update(normalized).digest('hex').slice(0, 20);
}

/** Strict allowlist prevents names, emails, transcripts, audio, and tokens. */
export function buildSpeakingAnalyticsEnvelope(input: {
  event: SpeakingAnalyticsEvent;
  actorId?: string | null;
  sessionId?: string | null;
  attemptId?: string | null;
  properties?: Record<string, unknown>;
  now?: Date;
}): SpeakingAnalyticsEnvelope {
  const properties: Record<string, AnalyticsValue> = {};
  for (const [key, value] of Object.entries(input.properties ?? {})) {
    if (!ALLOWED_PROPERTIES.has(key)) continue;
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      properties[key] =
        typeof value === 'string' ? value.slice(0, 120) : value;
    }
  }
  return {
    event: input.event,
    at: (input.now ?? new Date()).toISOString(),
    ...(speakingAnalyticsRef(input.actorId)
      ? { actorRef: speakingAnalyticsRef(input.actorId) }
      : {}),
    ...(speakingAnalyticsRef(input.sessionId)
      ? { sessionRef: speakingAnalyticsRef(input.sessionId) }
      : {}),
    ...(speakingAnalyticsRef(input.attemptId)
      ? { attemptRef: speakingAnalyticsRef(input.attemptId) }
      : {}),
    properties,
  };
}

export function trackSpeakingEvent(
  input: Parameters<typeof buildSpeakingAnalyticsEnvelope>[0],
  sink: (envelope: SpeakingAnalyticsEnvelope) => void = (envelope) => {
    console.info(JSON.stringify({ source: 'speaking', ...envelope }));
  },
): SpeakingAnalyticsEnvelope {
  const envelope = buildSpeakingAnalyticsEnvelope(input);
  sink(envelope);
  return envelope;
}

/** Shared Speaking business constants (server + pure helpers). */

export const DAILY_SPEAKING_LIMIT = 2;
export const SPEAKING_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const RESERVATION_TTL_MS = 120 * 1000;
export const DEFAULT_DURATION_SECONDS = 180;
export const SPEAKING_RECORDING_RETENTION_DAYS = 30;

/** Emergency environment kill switch; true/1/on disables student access. */
export function isSpeakingEmergencyDisabled(): boolean {
  const value = process.env.SPEAKING_EMERGENCY_DISABLED?.trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'on';
}

export const SPEAKING_ACTIVITY_TYPES = [
  'WORD_PRONUNCIATION',
  'SENTENCE_READING',
  'GUIDED_ANSWER',
  'REALTIME_CONVERSATION',
] as const;

export type SpeakingActivityType = (typeof SPEAKING_ACTIVITY_TYPES)[number];

const SPEAKING_ACTIVITY_TYPE_SET = new Set<string>(SPEAKING_ACTIVITY_TYPES);

export function isSpeakingActivityType(value: unknown): value is SpeakingActivityType {
  return typeof value === 'string' && SPEAKING_ACTIVITY_TYPE_SET.has(value);
}

export const SPEAKING_ACCOUNT_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export const SPEAKING_ENTITLEMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  SUSPENDED: 'SUSPENDED',
  REVOKED: 'REVOKED',
} as const;

export const OPENAI_REALTIME_MODEL =
  process.env.OPENAI_REALTIME_MODEL?.trim() || 'gpt-realtime-mini';
export const OPENAI_TRANSCRIPTION_MODEL =
  process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || 'gpt-4o-mini-transcribe';
export const OPENAI_GUIDED_MODEL =
  process.env.OPENAI_GUIDED_MODEL?.trim() || 'gpt-4o-mini';

export const SPEAKING_SESSION_KIND = {
  STUDENT_PRACTICE: 'STUDENT_PRACTICE',
  ADMIN_PREVIEW: 'ADMIN_PREVIEW',
} as const;

export const SPEAKING_SESSION_STATUS = {
  RESERVED: 'RESERVED',
  CONNECTING: 'CONNECTING',
  ACTIVE: 'ACTIVE',
  FINISHING: 'FINISHING',
  UPLOADING: 'UPLOADING',
  SUBMITTED: 'SUBMITTED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  INTERRUPTED: 'INTERRUPTED',
  FAILED: 'FAILED',
} as const;

export const DAILY_USAGE_STATUS = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  CONSUMED: 'CONSUMED',
} as const;

export type SpeakingSessionKind =
  (typeof SPEAKING_SESSION_KIND)[keyof typeof SPEAKING_SESSION_KIND];
export type SpeakingSessionStatus =
  (typeof SPEAKING_SESSION_STATUS)[keyof typeof SPEAKING_SESSION_STATUS];
export type DailyUsageStatus =
  (typeof DAILY_USAGE_STATUS)[keyof typeof DAILY_USAGE_STATUS];

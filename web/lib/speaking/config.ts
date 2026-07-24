/** Shared Speaking business constants (server + pure helpers). */

export const DAILY_SPEAKING_LIMIT = 1;
export const SPEAKING_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const RESERVATION_TTL_MS = 10 * 60 * 1000;
export const DEFAULT_DURATION_SECONDS = 300;

export const OPENAI_REALTIME_MODEL =
  process.env.OPENAI_REALTIME_MODEL?.trim() || 'gpt-realtime-mini';

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

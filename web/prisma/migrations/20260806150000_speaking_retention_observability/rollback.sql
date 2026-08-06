-- MANUAL ROLLBACK ONLY. Back up the database first and roll migrations back
-- in reverse timestamp order. Disable all Speaking activity flags before use.
BEGIN;

DROP TABLE IF EXISTS "SpeakingRecordingAccessAudit";
DROP TABLE IF EXISTS "SpeakingBurstLimit";

DROP INDEX IF EXISTS "SpeakingSession_recordingDeleteAfter_recordingDeletedAt_idx";
ALTER TABLE "SpeakingSession"
  DROP COLUMN IF EXISTS "recordingDeleteAfter",
  DROP COLUMN IF EXISTS "recordingDeletedAt",
  DROP COLUMN IF EXISTS "recordingCleanupAttempts",
  DROP COLUMN IF EXISTS "recordingCleanupLastAttemptAt",
  DROP COLUMN IF EXISTS "recordingCleanupLastError",
  DROP COLUMN IF EXISTS "inputTokens",
  DROP COLUMN IF EXISTS "outputTokens",
  DROP COLUMN IF EXISTS "audioInputTokens",
  DROP COLUMN IF EXISTS "audioOutputTokens",
  DROP COLUMN IF EXISTS "estimatedCostUsd";

ALTER TABLE "SpeakingAttempt"
  DROP COLUMN IF EXISTS "inputTokens",
  DROP COLUMN IF EXISTS "outputTokens",
  DROP COLUMN IF EXISTS "audioInputTokens",
  DROP COLUMN IF EXISTS "audioOutputTokens",
  DROP COLUMN IF EXISTS "estimatedCostUsd";

COMMIT;

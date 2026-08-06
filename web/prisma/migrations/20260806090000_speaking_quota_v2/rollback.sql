-- MANUAL ROLLBACK ONLY. Run after end-job, drill, and practice-score rollback.
-- The legacy schema cannot represent per-activity rows. This script fails
-- closed until non-Realtime data has been exported and removed deliberately.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "DailySpeakingUsage"
    WHERE "activityType" <> 'REALTIME_CONVERSATION'
  ) OR EXISTS (
    SELECT 1 FROM "SpeakingSession"
    WHERE "activityType" <> 'REALTIME_CONVERSATION'
  ) THEN
    RAISE EXCEPTION
      'Quota V2 rollback requires exporting/removing non-Realtime usage and sessions first';
  END IF;

  IF EXISTS (SELECT 1 FROM "SpeakingSession" WHERE "topicId" IS NULL) THEN
    RAISE EXCEPTION
      'Quota V2 rollback requires every remaining Realtime session to have a topicId';
  END IF;
END
$$;

UPDATE "DailySpeakingUsage"
SET
  "status" = CASE
    WHEN "usedCount" > 0 THEN 'CONSUMED'
    WHEN "reservedCount" > 0 THEN 'RESERVED'
    ELSE 'AVAILABLE'
  END,
  "usageDate" = "usageDateVN";

ALTER TABLE "DailySpeakingUsageRelease"
  DROP CONSTRAINT IF EXISTS "DailySpeakingUsageRelease_usageId_fkey",
  DROP CONSTRAINT IF EXISTS "DailySpeakingUsageRelease_releasedCount_check";
DROP INDEX IF EXISTS "DailySpeakingUsageRelease_usageId_createdAt_idx";
ALTER TABLE "DailySpeakingUsageRelease"
  DROP COLUMN IF EXISTS "usageId",
  DROP COLUMN IF EXISTS "activityType",
  DROP COLUMN IF EXISTS "releasedCount",
  DROP COLUMN IF EXISTS "usedCountBefore",
  DROP COLUMN IF EXISTS "usedCountAfter";

ALTER TABLE "SpeakingSession"
  DROP CONSTRAINT IF EXISTS "SpeakingSession_quotaUsageId_fkey",
  DROP CONSTRAINT IF EXISTS "SpeakingSession_courseId_fkey",
  DROP CONSTRAINT IF EXISTS "SpeakingSession_activityType_check",
  DROP CONSTRAINT IF EXISTS "SpeakingSession_topicId_fkey";
DROP INDEX IF EXISTS "SpeakingSession_courseId_activityType_createdAt_idx";
DROP INDEX IF EXISTS "SpeakingSession_quotaUsageId_usageCountedAt_idx";
DROP INDEX IF EXISTS "SpeakingSession_userId_startIdempotencyKey_key";
ALTER TABLE "SpeakingSession" ALTER COLUMN "topicId" SET NOT NULL;
ALTER TABLE "SpeakingSession"
  ADD CONSTRAINT "SpeakingSession_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "SpeakingTopic"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpeakingSession"
  DROP COLUMN IF EXISTS "courseId",
  DROP COLUMN IF EXISTS "activityType",
  DROP COLUMN IF EXISTS "reservationExpiresAt",
  DROP COLUMN IF EXISTS "mustEndAt",
  DROP COLUMN IF EXISTS "startIdempotencyKey",
  DROP COLUMN IF EXISTS "configSnapshot",
  DROP COLUMN IF EXISTS "model",
  DROP COLUMN IF EXISTS "quotaUsageId",
  DROP COLUMN IF EXISTS "usageCountedAt",
  DROP COLUMN IF EXISTS "failureStage",
  DROP COLUMN IF EXISTS "failureCode",
  DROP COLUMN IF EXISTS "failedAt";

ALTER TABLE "DailySpeakingUsage"
  DROP CONSTRAINT IF EXISTS "DailySpeakingUsage_usedCount_check",
  DROP CONSTRAINT IF EXISTS "DailySpeakingUsage_reservedCount_check",
  DROP CONSTRAINT IF EXISTS "DailySpeakingUsage_limitSnapshot_check",
  DROP CONSTRAINT IF EXISTS "DailySpeakingUsage_activityType_check";
DROP INDEX IF EXISTS "DailySpeakingUsage_userId_usageDateVN_activityType_key";
DROP INDEX IF EXISTS "DailySpeakingUsage_userId_usageDate_idx";
DROP INDEX IF EXISTS "DailySpeakingUsage_usageDateVN_activityType_idx";
ALTER TABLE "DailySpeakingUsage"
  DROP COLUMN IF EXISTS "usageDateVN",
  DROP COLUMN IF EXISTS "activityType",
  DROP COLUMN IF EXISTS "usedCount",
  DROP COLUMN IF EXISTS "reservedCount",
  DROP COLUMN IF EXISTS "limitSnapshot";
CREATE UNIQUE INDEX "DailySpeakingUsage_userId_usageDate_key"
  ON "DailySpeakingUsage"("userId", "usageDate");

COMMIT;

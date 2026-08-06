-- Quota V2 is intentionally additive: the legacy usageDate/status/sessionId/
-- reservedUntil columns remain populated for one release so the prior app can
-- still read rows while the counter model rolls out.
ALTER TABLE "DailySpeakingUsage"
  ADD COLUMN "usageDateVN" DATE,
  ADD COLUMN "activityType" TEXT,
  ADD COLUMN "usedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reservedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "limitSnapshot" INTEGER;

UPDATE "DailySpeakingUsage" AS usage
SET
  "usageDateVN" = usage."usageDate",
  "activityType" = 'REALTIME_CONVERSATION',
  "usedCount" = CASE WHEN usage."status" = 'CONSUMED' THEN 1 ELSE 0 END,
  "reservedCount" = CASE
    WHEN usage."status" = 'RESERVED'
      AND usage."reservedUntil" IS NOT NULL
      AND usage."reservedUntil" > CURRENT_TIMESTAMP
    THEN 1
    ELSE 0
  END,
  "limitSnapshot" = COALESCE(config."dailyLimit", 2)
FROM "SpeakingActivityConfig" AS config
WHERE config."activityType" = 'REALTIME_CONVERSATION';

-- Defensive fallback if configuration was removed manually before migration.
UPDATE "DailySpeakingUsage"
SET
  "usageDateVN" = COALESCE("usageDateVN", "usageDate"),
  "activityType" = COALESCE("activityType", 'REALTIME_CONVERSATION'),
  "limitSnapshot" = COALESCE("limitSnapshot", 2)
WHERE
  "usageDateVN" IS NULL
  OR "activityType" IS NULL
  OR "limitSnapshot" IS NULL;

ALTER TABLE "DailySpeakingUsage"
  ALTER COLUMN "usageDateVN" SET NOT NULL,
  ALTER COLUMN "activityType" SET NOT NULL,
  ALTER COLUMN "activityType" SET DEFAULT 'REALTIME_CONVERSATION',
  ALTER COLUMN "limitSnapshot" SET NOT NULL;

ALTER TABLE "DailySpeakingUsage"
  ADD CONSTRAINT "DailySpeakingUsage_usedCount_check"
    CHECK ("usedCount" >= 0) NOT VALID,
  ADD CONSTRAINT "DailySpeakingUsage_reservedCount_check"
    CHECK ("reservedCount" >= 0) NOT VALID,
  ADD CONSTRAINT "DailySpeakingUsage_limitSnapshot_check"
    CHECK ("limitSnapshot" > 0) NOT VALID,
  ADD CONSTRAINT "DailySpeakingUsage_activityType_check"
    CHECK ("activityType" IN (
      'WORD_PRONUNCIATION',
      'SENTENCE_READING',
      'GUIDED_ANSWER',
      'REALTIME_CONVERSATION'
    )) NOT VALID;

ALTER TABLE "DailySpeakingUsage"
  VALIDATE CONSTRAINT "DailySpeakingUsage_usedCount_check";
ALTER TABLE "DailySpeakingUsage"
  VALIDATE CONSTRAINT "DailySpeakingUsage_reservedCount_check";
ALTER TABLE "DailySpeakingUsage"
  VALIDATE CONSTRAINT "DailySpeakingUsage_limitSnapshot_check";
ALTER TABLE "DailySpeakingUsage"
  VALIDATE CONSTRAINT "DailySpeakingUsage_activityType_check";

DROP INDEX "DailySpeakingUsage_userId_usageDate_key";
CREATE UNIQUE INDEX "DailySpeakingUsage_userId_usageDateVN_activityType_key"
  ON "DailySpeakingUsage"("userId", "usageDateVN", "activityType");
CREATE INDEX "DailySpeakingUsage_userId_usageDate_idx"
  ON "DailySpeakingUsage"("userId", "usageDate");
CREATE INDEX "DailySpeakingUsage_usageDateVN_activityType_idx"
  ON "DailySpeakingUsage"("usageDateVN", "activityType");

-- Session additions support every configured activity while preserving the
-- current topic-backed Realtime flow.
ALTER TABLE "SpeakingSession"
  ADD COLUMN "courseId" TEXT,
  ADD COLUMN "activityType" TEXT,
  ADD COLUMN "reservationExpiresAt" TIMESTAMP(3),
  ADD COLUMN "mustEndAt" TIMESTAMP(3),
  ADD COLUMN "startIdempotencyKey" TEXT,
  ADD COLUMN "configSnapshot" JSONB,
  ADD COLUMN "model" TEXT,
  ADD COLUMN "quotaUsageId" TEXT,
  ADD COLUMN "usageCountedAt" TIMESTAMP(3),
  ADD COLUMN "failureStage" TEXT,
  ADD COLUMN "failureCode" TEXT,
  ADD COLUMN "failedAt" TIMESTAMP(3);

UPDATE "SpeakingSession" AS session
SET
  "courseId" = topic."courseId",
  "activityType" = 'REALTIME_CONVERSATION'
FROM "SpeakingTopic" AS topic
WHERE topic."id" = session."topicId";

UPDATE "SpeakingSession" AS session
SET
  "quotaUsageId" = usage."id",
  "reservationExpiresAt" = CASE
    WHEN usage."status" = 'RESERVED' THEN usage."reservedUntil"
    ELSE session."reservationExpiresAt"
  END,
  "usageCountedAt" = CASE
    WHEN usage."status" = 'CONSUMED'
    THEN COALESCE(session."startedAt", usage."updatedAt")
    ELSE session."usageCountedAt"
  END
FROM "DailySpeakingUsage" AS usage
WHERE usage."sessionId" = session."id";

UPDATE "SpeakingSession" AS session
SET "configSnapshot" = jsonb_build_object(
  'dailyLimit', config."dailyLimit",
  'durationSeconds', config."durationSeconds",
  'reservationTtlSeconds', config."reservationTtlSeconds",
  'promptVersion', config."promptVersion"
)
FROM "SpeakingActivityConfig" AS config
WHERE
  config."activityType" = 'REALTIME_CONVERSATION'
  AND session."activityType" = 'REALTIME_CONVERSATION';

ALTER TABLE "SpeakingSession"
  ALTER COLUMN "courseId" SET NOT NULL,
  ALTER COLUMN "activityType" SET NOT NULL,
  ALTER COLUMN "activityType" SET DEFAULT 'REALTIME_CONVERSATION',
  ALTER COLUMN "topicId" DROP NOT NULL;

ALTER TABLE "SpeakingSession"
  ADD CONSTRAINT "SpeakingSession_activityType_check"
    CHECK ("activityType" IN (
      'WORD_PRONUNCIATION',
      'SENTENCE_READING',
      'GUIDED_ANSWER',
      'REALTIME_CONVERSATION'
    )) NOT VALID;
ALTER TABLE "SpeakingSession"
  VALIDATE CONSTRAINT "SpeakingSession_activityType_check";

ALTER TABLE "SpeakingSession"
  DROP CONSTRAINT "SpeakingSession_topicId_fkey";
ALTER TABLE "SpeakingSession"
  ADD CONSTRAINT "SpeakingSession_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "SpeakingTopic"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SpeakingSession"
  ADD CONSTRAINT "SpeakingSession_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpeakingSession"
  ADD CONSTRAINT "SpeakingSession_quotaUsageId_fkey"
  FOREIGN KEY ("quotaUsageId") REFERENCES "DailySpeakingUsage"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SpeakingSession_courseId_activityType_createdAt_idx"
  ON "SpeakingSession"("courseId", "activityType", "createdAt");
CREATE INDEX "SpeakingSession_quotaUsageId_usageCountedAt_idx"
  ON "SpeakingSession"("quotaUsageId", "usageCountedAt");
CREATE UNIQUE INDEX "SpeakingSession_userId_startIdempotencyKey_key"
  ON "SpeakingSession"("userId", "startIdempotencyKey");

-- Release rows retain the exact one-count mutation for audit/replay.
ALTER TABLE "DailySpeakingUsageRelease"
  ADD COLUMN "usageId" TEXT,
  ADD COLUMN "activityType" TEXT NOT NULL DEFAULT 'REALTIME_CONVERSATION',
  ADD COLUMN "releasedCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "usedCountBefore" INTEGER,
  ADD COLUMN "usedCountAfter" INTEGER;

UPDATE "DailySpeakingUsageRelease" AS release
SET "usageId" = usage."id"
FROM "DailySpeakingUsage" AS usage
WHERE usage."sessionId" = release."sessionId";

ALTER TABLE "DailySpeakingUsageRelease"
  ADD CONSTRAINT "DailySpeakingUsageRelease_releasedCount_check"
    CHECK ("releasedCount" = 1) NOT VALID;
ALTER TABLE "DailySpeakingUsageRelease"
  VALIDATE CONSTRAINT "DailySpeakingUsageRelease_releasedCount_check";
ALTER TABLE "DailySpeakingUsageRelease"
  ADD CONSTRAINT "DailySpeakingUsageRelease_usageId_fkey"
  FOREIGN KEY ("usageId") REFERENCES "DailySpeakingUsage"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DailySpeakingUsageRelease_usageId_createdAt_idx"
  ON "DailySpeakingUsageRelease"("usageId", "createdAt");

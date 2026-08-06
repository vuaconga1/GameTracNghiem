-- Additive Speaking account linkage fields.
ALTER TABLE "User"
  ADD COLUMN "portalLinkedAt" TIMESTAMP(3),
  ADD COLUMN "speakingAccountStatus" TEXT NOT NULL DEFAULT 'ACTIVE';

-- Explicit per-student (optionally per-course) Speaking grants.
CREATE TABLE "SpeakingEntitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdById" TEXT NOT NULL,
    "note" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revocationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingEntitlement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SpeakingEntitlement_status_check"
      CHECK ("status" IN ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED')),
    CONSTRAINT "SpeakingEntitlement_interval_check"
      CHECK ("expiresAt" > "startsAt")
);

CREATE INDEX "SpeakingEntitlement_userId_status_startsAt_expiresAt_idx"
  ON "SpeakingEntitlement"("userId", "status", "startsAt", "expiresAt");
CREATE INDEX "SpeakingEntitlement_courseId_status_idx"
  ON "SpeakingEntitlement"("courseId", "status");
CREATE INDEX "SpeakingEntitlement_createdById_createdAt_idx"
  ON "SpeakingEntitlement"("createdById", "createdAt");
CREATE INDEX "SpeakingEntitlement_revokedById_revokedAt_idx"
  ON "SpeakingEntitlement"("revokedById", "revokedAt");

ALTER TABLE "SpeakingEntitlement"
  ADD CONSTRAINT "SpeakingEntitlement_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpeakingEntitlement"
  ADD CONSTRAINT "SpeakingEntitlement_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpeakingEntitlement"
  ADD CONSTRAINT "SpeakingEntitlement_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpeakingEntitlement"
  ADD CONSTRAINT "SpeakingEntitlement_revokedById_fkey"
  FOREIGN KEY ("revokedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Configuration exists before the drill pipelines so disabled drills cannot be
-- exposed accidentally. Realtime remains the only enabled pilot activity.
CREATE TABLE "SpeakingActivityConfig" (
    "activityType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyLimit" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "reservationTtlSeconds" INTEGER NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingActivityConfig_pkey" PRIMARY KEY ("activityType"),
    CONSTRAINT "SpeakingActivityConfig_dailyLimit_check" CHECK ("dailyLimit" > 0),
    CONSTRAINT "SpeakingActivityConfig_durationSeconds_check" CHECK ("durationSeconds" > 0),
    CONSTRAINT "SpeakingActivityConfig_reservationTtlSeconds_check"
      CHECK ("reservationTtlSeconds" > 0)
);

INSERT INTO "SpeakingActivityConfig" (
  "activityType",
  "enabled",
  "dailyLimit",
  "durationSeconds",
  "reservationTtlSeconds",
  "promptVersion",
  "updatedAt"
)
VALUES
  ('WORD_PRONUNCIATION', false, 30, 60, 120, 'v1', CURRENT_TIMESTAMP),
  ('SENTENCE_READING', false, 20, 120, 120, 'v1', CURRENT_TIMESTAMP),
  ('GUIDED_ANSWER', false, 15, 180, 120, 'v1', CURRENT_TIMESTAMP),
  ('REALTIME_CONVERSATION', true, 2, 180, 120, 'v1', CURRENT_TIMESTAMP)
ON CONFLICT ("activityType") DO NOTHING;

-- Speaking recording retention, access audit, AI usage metadata, and burst limits.
ALTER TABLE "SpeakingSession"
  ADD COLUMN "recordingDeleteAfter" TIMESTAMP(3),
  ADD COLUMN "recordingDeletedAt" TIMESTAMP(3),
  ADD COLUMN "recordingCleanupAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "recordingCleanupLastAttemptAt" TIMESTAMP(3),
  ADD COLUMN "recordingCleanupLastError" TEXT,
  ADD COLUMN "inputTokens" INTEGER,
  ADD COLUMN "outputTokens" INTEGER,
  ADD COLUMN "audioInputTokens" INTEGER,
  ADD COLUMN "audioOutputTokens" INTEGER,
  ADD COLUMN "estimatedCostUsd" DOUBLE PRECISION;

ALTER TABLE "SpeakingAttempt"
  ADD COLUMN "inputTokens" INTEGER,
  ADD COLUMN "outputTokens" INTEGER,
  ADD COLUMN "audioInputTokens" INTEGER,
  ADD COLUMN "audioOutputTokens" INTEGER,
  ADD COLUMN "estimatedCostUsd" DOUBLE PRECISION;

CREATE INDEX "SpeakingSession_recordingDeleteAfter_recordingDeletedAt_idx"
  ON "SpeakingSession"("recordingDeleteAfter", "recordingDeletedAt");

CREATE TABLE "SpeakingRecordingAccessAudit" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "action" TEXT NOT NULL DEFAULT 'STREAM',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SpeakingRecordingAccessAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SpeakingRecordingAccessAudit_sessionId_createdAt_idx"
  ON "SpeakingRecordingAccessAudit"("sessionId", "createdAt");
CREATE INDEX "SpeakingRecordingAccessAudit_adminId_createdAt_idx"
  ON "SpeakingRecordingAccessAudit"("adminId", "createdAt");
ALTER TABLE "SpeakingRecordingAccessAudit"
  ADD CONSTRAINT "SpeakingRecordingAccessAudit_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "SpeakingSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpeakingRecordingAccessAudit"
  ADD CONSTRAINT "SpeakingRecordingAccessAudit_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SpeakingBurstLimit" (
  "key" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "windowStartedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpeakingBurstLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "SpeakingBurstLimit_expiresAt_idx"
  ON "SpeakingBurstLimit"("expiresAt");
CREATE INDEX "SpeakingBurstLimit_userId_action_idx"
  ON "SpeakingBurstLimit"("userId", "action");

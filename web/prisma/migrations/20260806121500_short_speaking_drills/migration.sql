-- Additive persistence for server-assessed short Speaking drills.
-- Attempt audio is processed in memory only; no URL/key columns are created.
CREATE TABLE "SpeakingAttempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "idempotencyKey" TEXT NOT NULL,
    "reservationExpiresAt" TIMESTAMP(3) NOT NULL,
    "targetSnapshot" TEXT,
    "questionSnapshot" TEXT,
    "serverTranscript" TEXT,
    "score" INTEGER,
    "details" JSONB,
    "feedback" JSONB,
    "audioMimeType" TEXT,
    "audioBytes" INTEGER,
    "audioDurationMs" INTEGER,
    "engine" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingAttempt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SpeakingAttempt_activityType_check"
      CHECK ("activityType" IN (
        'WORD_PRONUNCIATION',
        'SENTENCE_READING',
        'GUIDED_ANSWER'
      )),
    CONSTRAINT "SpeakingAttempt_status_check"
      CHECK ("status" IN ('PROCESSING', 'COMPLETED', 'FAILED')),
    CONSTRAINT "SpeakingAttempt_score_check"
      CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 100)),
    CONSTRAINT "SpeakingAttempt_audioBytes_check"
      CHECK ("audioBytes" IS NULL OR "audioBytes" >= 0),
    CONSTRAINT "SpeakingAttempt_audioDurationMs_check"
      CHECK ("audioDurationMs" IS NULL OR "audioDurationMs" >= 0)
);

CREATE UNIQUE INDEX "SpeakingAttempt_sessionId_key"
  ON "SpeakingAttempt"("sessionId");
CREATE UNIQUE INDEX "SpeakingAttempt_userId_idempotencyKey_key"
  ON "SpeakingAttempt"("userId", "idempotencyKey");
CREATE INDEX "SpeakingAttempt_userId_activityType_createdAt_idx"
  ON "SpeakingAttempt"("userId", "activityType", "createdAt");
CREATE INDEX "SpeakingAttempt_courseId_questionId_createdAt_idx"
  ON "SpeakingAttempt"("courseId", "questionId", "createdAt");
CREATE INDEX "SpeakingAttempt_status_reservationExpiresAt_idx"
  ON "SpeakingAttempt"("status", "reservationExpiresAt");

ALTER TABLE "SpeakingAttempt"
  ADD CONSTRAINT "SpeakingAttempt_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "SpeakingSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpeakingAttempt"
  ADD CONSTRAINT "SpeakingAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpeakingAttempt"
  ADD CONSTRAINT "SpeakingAttempt_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpeakingAttempt"
  ADD CONSTRAINT "SpeakingAttempt_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

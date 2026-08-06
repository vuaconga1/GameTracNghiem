-- Durable, additive outbox for Realtime hard-stop delivery.
CREATE TABLE "SpeakingSessionEndJob" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'QSTASH',
    "providerMessageId" TEXT,
    "dispatchAttempts" INTEGER NOT NULL DEFAULT 0,
    "processAttempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingSessionEndJob_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SpeakingSessionEndJob_status_check"
      CHECK ("status" IN ('PENDING', 'DISPATCHED', 'PROCESSING', 'RETRY', 'COMPLETED')),
    CONSTRAINT "SpeakingSessionEndJob_dispatchAttempts_check"
      CHECK ("dispatchAttempts" >= 0),
    CONSTRAINT "SpeakingSessionEndJob_processAttempts_check"
      CHECK ("processAttempts" >= 0)
);

CREATE UNIQUE INDEX "SpeakingSessionEndJob_sessionId_key"
  ON "SpeakingSessionEndJob"("sessionId");
CREATE INDEX "SpeakingSessionEndJob_status_nextAttemptAt_dueAt_idx"
  ON "SpeakingSessionEndJob"("status", "nextAttemptAt", "dueAt");
CREATE INDEX "SpeakingSessionEndJob_dueAt_status_idx"
  ON "SpeakingSessionEndJob"("dueAt", "status");

ALTER TABLE "SpeakingSessionEndJob"
  ADD CONSTRAINT "SpeakingSessionEndJob_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "SpeakingSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Practice scores remain visible on the leaderboard while official course
-- totals, per-game records, progress, and EXP only use counted rows.
ALTER TABLE "ScoreLog"
  ADD COLUMN "countsForCourseTotal" BOOLEAN NOT NULL DEFAULT true;

-- Explicit backfill for existing rows (the NOT NULL default already makes
-- this true on PostgreSQL, but keeping it here documents migration intent).
UPDATE "ScoreLog"
SET "countsForCourseTotal" = true
WHERE "countsForCourseTotal" IS DISTINCT FROM true;

-- Durable one-to-one links make Speaking score creation retry-safe.
ALTER TABLE "SpeakingAttempt"
  ADD COLUMN "scoreLogId" TEXT;
ALTER TABLE "SpeakingSession"
  ADD COLUMN "scoreLogId" TEXT;

CREATE UNIQUE INDEX "SpeakingAttempt_scoreLogId_key"
  ON "SpeakingAttempt"("scoreLogId");
CREATE UNIQUE INDEX "SpeakingSession_scoreLogId_key"
  ON "SpeakingSession"("scoreLogId");

ALTER TABLE "SpeakingAttempt"
  ADD CONSTRAINT "SpeakingAttempt_scoreLogId_fkey"
  FOREIGN KEY ("scoreLogId") REFERENCES "ScoreLog"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SpeakingSession"
  ADD CONSTRAINT "SpeakingSession_scoreLogId_fkey"
  FOREIGN KEY ("scoreLogId") REFERENCES "ScoreLog"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

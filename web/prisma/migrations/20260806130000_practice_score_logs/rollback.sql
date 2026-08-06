-- MANUAL ROLLBACK ONLY. Run after the retention rollback and a verified backup.
-- Practice-only ScoreLog rows are deleted so an older app cannot count them as
-- official course totals after countsForCourseTotal is removed.
BEGIN;

DELETE FROM "ScoreLog"
WHERE "game" IN ('speaking_drill', 'speaking_realtime');

ALTER TABLE "SpeakingAttempt"
  DROP CONSTRAINT IF EXISTS "SpeakingAttempt_scoreLogId_fkey";
ALTER TABLE "SpeakingSession"
  DROP CONSTRAINT IF EXISTS "SpeakingSession_scoreLogId_fkey";
DROP INDEX IF EXISTS "SpeakingAttempt_scoreLogId_key";
DROP INDEX IF EXISTS "SpeakingSession_scoreLogId_key";

ALTER TABLE "SpeakingAttempt" DROP COLUMN IF EXISTS "scoreLogId";
ALTER TABLE "SpeakingSession" DROP COLUMN IF EXISTS "scoreLogId";
ALTER TABLE "ScoreLog" DROP COLUMN IF EXISTS "countsForCourseTotal";

COMMIT;

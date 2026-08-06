-- MANUAL ROLLBACK ONLY. Run only after every 20260806 Speaking rollback.
-- Export transcripts, recording references, usage, and release audit rows first.
BEGIN;

DROP TABLE IF EXISTS "DailySpeakingUsageRelease";
DROP TABLE IF EXISTS "DailySpeakingUsage";
DROP TABLE IF EXISTS "SpeakingSession";
DROP TABLE IF EXISTS "SpeakingTopic";

COMMIT;

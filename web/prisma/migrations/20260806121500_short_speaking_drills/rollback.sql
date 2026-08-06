-- MANUAL ROLLBACK ONLY. Run after practice-score rollback.
-- This removes drill assessment metadata. Audio was never persisted by design.
BEGIN;

DROP TABLE IF EXISTS "SpeakingAttempt";

COMMIT;

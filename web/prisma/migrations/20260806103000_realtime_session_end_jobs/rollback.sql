-- MANUAL ROLLBACK ONLY. Stop the session-end cron/QStash delivery first.
BEGIN;

DROP TABLE IF EXISTS "SpeakingSessionEndJob";

COMMIT;

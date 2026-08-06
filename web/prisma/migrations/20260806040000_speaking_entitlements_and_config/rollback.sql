-- MANUAL ROLLBACK ONLY. This is the last rollback in the reverse-order chain.
-- Export entitlement/audit data first; the prior release has no equivalent.
BEGIN;

DROP TABLE IF EXISTS "SpeakingEntitlement";
DROP TABLE IF EXISTS "SpeakingActivityConfig";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "portalLinkedAt",
  DROP COLUMN IF EXISTS "speakingAccountStatus";

COMMIT;

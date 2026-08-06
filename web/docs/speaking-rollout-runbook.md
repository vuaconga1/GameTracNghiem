# AI Speaking deployment, rollout, and rollback runbook

This runbook is intentionally inside the Next.js application. It covers the
entitlement, quota V2, Realtime, short-drill, practice-score, retention, and
observability migrations. Production deployment is a separate, approved
operator action.

## 1. Non-negotiable safety rules

- Use a maintenance/change window and name one rollback owner.
- Never run integration or Playwright tests against production.
- Never expose `OPENAI_API_KEY`, QStash signing keys, Blob tokens, Drive service
  account JSON, session secrets, or Portal SSO secrets to browser code.
- CI tests must use route/module mocks. Do not provide live OpenAI or QStash
  credentials to test jobs.
- Start with every student activity disabled. Enable only explicitly imported
  pilot entitlements and one activity at a time.
- A feature-flag rollback is preferred to destructive SQL rollback.

## 2. Pre-deployment backup and restore proof

1. Record the current app revision, Prisma migration state, row counts, and
   current `SpeakingActivityConfig`.
2. Create a provider snapshot and an encrypted logical backup:

   ```powershell
   pg_dump --format=custom --no-owner --file speaking-predeploy.dump $env:DIRECT_URL
   npx prisma migrate status
   ```

3. Restore that backup into a disposable database and verify:

   ```powershell
   pg_restore --clean --if-exists --no-owner --dbname $env:RESTORE_TEST_URL speaking-predeploy.dump
   ```

4. Check that the restored user/course/score counts match the source. Do not
   continue if restore was not actually exercised.

## 3. Required environment

Validate values in the deployment platform and in the intended environment.
Blank examples in `.env.example` are not deployable values.

- Core and Portal: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`,
  `PORTAL_SSO_SECRET`.
- OpenAI: `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`,
  `OPENAI_TRANSCRIPTION_MODEL`, `OPENAI_GUIDED_MODEL`.
- Durable 180-second stop: `SPEAKING_SESSION_END_SCHEDULER=qstash`,
  `SPEAKING_PUBLIC_BASE_URL`, `QSTASH_TOKEN`,
  `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`,
  `SPEAKING_INTERNAL_CALLBACK_SECRET`.
- Scheduled jobs: `CRON_SECRET`; verify both daily crons in `vercel.json`
  (session-end backup sweep + recording retention). Hard-stop at 180s must use
  QStash — Hobby Vercel only allows once-per-day native cron expressions.
- Private recording storage: `BLOB_READ_WRITE_TOKEN`,
  `GOOGLE_DRIVE_SPEAKING_FOLDER_ID`, and exactly one of
  `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`.
- Student kill switch: start with `SPEAKING_EMERGENCY_DISABLED=true`.
- Keep `SPEAKING_REALTIME_LEGACY_CLIENT_SECRET_FALLBACK=false`. The legacy
  fallback is admin-preview-only and is not a student rollout mechanism.

Check that the Drive folder is shared only with the service account and the
minimum authorized staff. Confirm that Blob objects are private.

## 4. Pre-deploy verification

Run from this `web` directory:

```powershell
npm ci
npm test
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run lint
npm run build
npm run test:e2e:list
```

### Real PostgreSQL integration (opt-in)

Use a migrated, disposable database. The test refuses a non-local URL whose
database name does not contain `test` unless
`SPEAKING_TEST_ALLOW_REMOTE=true` is explicitly set.

```powershell
$env:SPEAKING_TEST_DATABASE_URL="postgresql://postgres:password@127.0.0.1:5432/wewin_speaking_test"
$env:DATABASE_URL=$env:SPEAKING_TEST_DATABASE_URL
npx prisma migrate deploy
npm run test:integration:speaking
```

Without `SPEAKING_TEST_DATABASE_URL`, the integration suite is deliberately
listed as skipped. It covers real PostgreSQL advisory locks and transactions:
entitlement boundaries, VN `DATE` storage, midnight transfer, two starts and
third denial, duplicate `/started`, concurrent tabs, drill success/failure and
idempotency, retention metadata, and ScoreLog atomic rollback.

### Playwright (opt-in)

If Chromium is not installed, `npm run test:e2e:list` still lists all coverage.
Install and run only against a local or disposable non-production app:

```powershell
npx playwright install chromium
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000"
$env:PLAYWRIGHT_COURSE_ID="<seeded-disposable-course-id>"
$env:PLAYWRIGHT_STUDENT_STORAGE_STATE="playwright/.auth/student.json"
$env:PLAYWRIGHT_ADMIN_STORAGE_STATE="playwright/.auth/admin.json"
$env:PLAYWRIGHT_DRILL_READY="true"
npm run test:e2e
```

Create storage-state files outside source control. `PLAYWRIGHT_DRILL_READY`
means the disposable student has an active entitlement and
`WORD_PRONUNCIATION` is enabled. Remote targets additionally require
`PLAYWRIGHT_ALLOW_REMOTE=true`.

Playwright intercepts OpenAI-facing Realtime endpoints, `/started` scheduling,
drill assessment, and admin mutations. OpenAI and QStash hosts are blocked in
the browser tests. Do not add live provider keys to CI.

## 5. Apply migrations

1. Put the app in the maintenance window and keep student flags disabled.
2. Review the migration SQL and the reverse-order `rollback.sql` files.
3. Apply with the deployment database environment:

   ```powershell
   npm run db:deploy
   npx prisma migrate status
   ```

4. Verify all expected migrations are applied and Prisma can read
   `SpeakingEntitlement`, `SpeakingActivityConfig`, `DailySpeakingUsage`,
   `SpeakingSessionEndJob`, `SpeakingAttempt`, and the retention/audit models.
5. Deploy the matching application revision. Do not run a new-schema app
   against an old schema, or an old app after removing compatibility columns.

## 6. Explicit pilot setup

1. Leave `SPEAKING_EMERGENCY_DISABLED=true` while preparing data.
2. In **Admin → AI Speaking → Cấp quyền**, import a reviewed CSV/TSV whose first
   column contains exact Parent Portal student codes.
3. Select the pilot course or deliberately choose a global entitlement. Set
   start and exclusive end dates in Vietnam time. Use a traceable source such
   as `PILOT_2026_08` and add an approval note.
4. Review missing codes and duplicate grants. A student must have completed
   Portal SSO linkage (`portalLinkedAt`) before access is allowed.
5. In **Cấu hình**, keep all activities off initially. Save and verify:
   - `REALTIME_CONVERSATION`: limit 2, duration 180, reservation TTL 120.
   - `WORD_PRONUNCIATION`: enable only after drill smoke tests.
   - `SENTENCE_READING` and `GUIDED_ANSWER`: remain off until their own pilot.
6. Set `SPEAKING_EMERGENCY_DISABLED=false`, redeploy the env change, and enable
   only the first approved activity.

Never grant access by username pattern, grade-wide implicit rule, or blanket
database update.

## 7. Smoke checks

Use separate Guest, entitled student, expired student, suspended student, and
admin accounts.

- Guest can browse/play normal games. Guest answer/progress remains local and
  creates no `GameProgress`, `ScoreLog`, or `ExperienceGrant`.
- Guest Speaking cards are locked; the login link contains an encoded internal
  `next`. `//host`, external URLs, and control-character redirects are rejected.
- Allowed student sees only enabled activities. Expired/suspended/no-course
  reasons are distinct and do not leak PII.
- Quotas are isolated by activity and the Vietnam calendar date.
- Realtime allows two 180-second starts, denies the third, and duplicate
  `/started` increments only once. Two tabs produce one active reservation.
- QStash creates one end job and closes an overdue Realtime call. Cron fallback
  can process retryable jobs.
- Short drill success consumes one reservation and creates one linked
  practice-only ScoreLog. Provider/persistence failure consumes no quota;
  retry and duplicate idempotency keys do not duplicate scores.
- Realtime/drill practice scores are visible in the leaderboard but excluded
  from official course totals, records, progress, and EXP.
- Realtime recordings are private, admin access is audited, and due objects are
  removed from Blob/local plus Drive before metadata is cleared.
- Admin can grant/revoke entitlements, edit activity flags/limits, manage drill
  content, inspect sessions/attempts, and release exactly one counted usage
  with a reason.

## 8. Gradual rollout

1. Internal admins only: prompt preview and scheduler/retention smoke tests.
2. Five staff/test students: one drill activity, then Realtime.
3. Small approved lớp 8 pilot: explicit entitlement import only.
4. Increase pilot size after two healthy VN day boundaries.
5. Enable each additional activity independently; never enable all flags as a
   single change.
6. General availability requires a separate privacy/cost review and approval.

Hold each stage if error rate, duplicate usage, scheduler lag, retention
failure, or cost per completed attempt exceeds the approved threshold.

## 9. Metrics, cost, and privacy review

Monitor by activity and prompt/model version:

- access decisions/reasons; reservations, starts, completions, failures, and
  limit denials;
- reserved/used counter drift and duplicate-idempotency events;
- QStash dispatch/process attempts, overdue active sessions, and cron retries;
- drill/realtime input/output/audio tokens and `estimatedCostUsd`;
- cost per completed attempt, per pilot student/day, and daily budget;
- recording cleanup found/deleted/failed counts and retry age;
- admin recording-access audit volume and usage-release audit records.

Do not log transcript text, raw audio, provider keys, SDP, cookies, or Portal
secrets in analytics. Short-drill audio is memory-only and zeroed after
processing. Realtime recording retention is 30 days unless an approved policy
sets a shorter period. Confirm deletion from both storage systems and preserve
only required audit metadata.

## 10. Kill switch and rollback

### Fast feature rollback (preferred)

1. Set `SPEAKING_EMERGENCY_DISABLED=true` and redeploy the env change.
2. Set every `SpeakingActivityConfig.enabled=false`.
3. Keep the one-minute session-end job running until active sessions are
   closed; then verify no overdue `ACTIVE` sessions.
4. Keep recording retention running. Disabling student access is not permission
   to stop privacy deletion.
5. Revoke only affected entitlements when required; preserve audit reasons.
6. Roll back application code only to a revision compatible with the additive
   schema. Additive tables/columns may remain safely while flags are off.

### Database rollback (last resort)

Prefer restoring the verified pre-deploy backup. If manual SQL is approved,
stop writes, export new Speaking/ScoreLog/audit data, and execute each
`rollback.sql` in this exact reverse order:

1. `20260806150000_speaking_retention_observability`
2. `20260806130000_practice_score_logs`
3. `20260806121500_short_speaking_drills`
4. `20260806103000_realtime_session_end_jobs`
5. `20260806090000_speaking_quota_v2`
6. `20260806040000_speaking_entitlements_and_config`
7. `20260724150000_add_ai_speaking`

Quota V2 rollback intentionally fails if non-Realtime rows or topic-less
sessions remain because the legacy schema cannot represent them. Practice-score
rollback deletes only the new Speaking practice ScoreLogs so an older app
cannot miscount them.

Prisma does not automatically run down migrations. After restore/manual SQL,
reconcile `_prisma_migrations` only through an approved DBA procedure and test
the result on a clone before reconnecting traffic.

## 11. Acceptance checklist

- [ ] Backup created, restored, and row counts verified.
- [ ] Environment and secret ownership reviewed; no secret is client-exposed.
- [ ] `npm test` passes with zero failures.
- [ ] Prisma validate/generate, TypeScript, ESLint, and production build pass.
- [ ] PostgreSQL integration passes, or is recorded as skipped because no
      migrated disposable PostgreSQL URL was available.
- [ ] Six Playwright scenarios are listed and pass when browser/app/auth/data
      prerequisites are available.
- [ ] OpenAI and QStash are mocked/blocked in CI; no costly live test call.
- [ ] Pilot students imported explicitly with VN start/exclusive-end dates.
- [ ] Activity flags reviewed individually; emergency rollback tested.
- [ ] Guest, entitlement, expiry, quota, idempotency, concurrency, drill,
      scheduler, ScoreLog, retention, and admin smoke checks pass.
- [ ] Metrics/cost alerts and privacy deletion monitoring have owners.
- [ ] Gradual rollout stage and stop thresholds are approved.
- [ ] Feature-flag rollback and reverse-order database rollback are rehearsed
      on a disposable clone.

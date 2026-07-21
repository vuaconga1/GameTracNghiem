# Player Experience Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and expose idempotent per-session EXP grants with derived player levels 1–50.

**Architecture:** Pure helpers calculate grants and level profiles from server-owned score data. PostgreSQL stores an immutable `ExperienceGrant` ledger plus a transactional `PlayerExperience` read model. Authenticated completion and profile routes expose the feature without changing existing score submission.

**Tech Stack:** Next.js 15 route handlers, TypeScript, Prisma 7/PostgreSQL, Vitest.

## Global Constraints

- Experience is granted only from existing `ScoreLog` rows belonging to the authenticated user.
- Existing answer scoring and leaderboard behavior must remain unchanged.
- `(userId, playSessionId)` is database-enforced idempotency.
- Level is derived from `totalExp`, capped at 50, and every five levels maps to one of ten tiers.
- This plan does not edit game clients, the header, or icon assets.

---

### Task 1: Pure EXP and Level Calculation

**Files:**
- Create: `web/lib/experience.ts`
- Create: `web/lib/experience.test.ts`

**Interfaces:**
- Consumes: score facts `{ isCorrect: boolean; elapsedMs: number }`.
- Produces: `calculateSessionExperience(rows)`, `experienceToNextLevel(level)`, and `profileFromTotalExp(totalExp)`.

- [ ] **Step 1: Write failing unit tests**

Cover empty rows rejection, all-wrong minimum reward, fast-perfect maximum reward, elapsed-time clamping, exact level thresholds, five-level tier boundaries, and level 50 behavior:

```ts
expect(calculateSessionExperience([{ isCorrect: false, elapsedMs: 99_000 }]).exp).toBe(40);
expect(calculateSessionExperience(
  Array.from({ length: 5 }, () => ({ isCorrect: true, elapsedMs: 0 }))
).exp).toBe(145);
expect(profileFromTotalExp(0)).toMatchObject({ level: 1, tier: 1, expInLevel: 0 });
expect(profileFromTotalExp(experienceToNextLevel(1))).toMatchObject({ level: 2, tier: 1 });
expect(profileFromTotalExp(totalExperienceForLevel(6))).toMatchObject({ level: 6, tier: 2 });
expect(profileFromTotalExp(Number.MAX_SAFE_INTEGER)).toMatchObject({
  level: 50,
  tier: 10,
  expToNextLevel: null,
  progressPercent: 100,
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- lib/experience.test.ts`

Expected: FAIL because `lib/experience.ts` does not exist.

- [ ] **Step 3: Implement pure helpers**

Use constants `MAX_LEVEL = 50`, `TIME_LIMIT_MS = 30_000`, `BASE_EXP = 40`, `ACCURACY_EXP_MAX = 60`, `SPEED_EXP_MAX = 20`, and `PERFECT_BONUS = 25`. Reject an empty score array. Clamp elapsed values before averaging correct-answer speed. Derive profile by consuming each level threshold until either EXP is insufficient or level 50 is reached.

The public profile type is:

```ts
export type ExperienceProfile = {
  totalExp: number;
  level: number;
  tier: number;
  expInLevel: number;
  expToNextLevel: number | null;
  progressPercent: number;
};
```

Normalize `totalExp` to a non-negative safe integer. Round `progressPercent` to an integer from 0 through 100.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- lib/experience.test.ts`

Expected: all experience helper tests pass.

- [ ] **Step 5: Commit**

```powershell
git add lib/experience.ts lib/experience.test.ts
git commit -m "feat: add player experience calculations"
```

---

### Task 2: Experience Persistence

**Files:**
- Modify: `web/prisma/schema.prisma`
- Create: `web/prisma/migrations/20260721100000_add_player_experience/migration.sql`

**Interfaces:**
- Consumes: existing `User` and `ScoreLog` models.
- Produces: `prisma.playerExperience` and `prisma.experienceGrant`.

- [ ] **Step 1: Add schema models and user relations**

Add `experience PlayerExperience?` and `experienceGrants ExperienceGrant[]` to `User`. Define:

```prisma
model PlayerExperience {
  userId    String   @id
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  totalExp  Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ExperienceGrant {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  playSessionId       String
  course              String
  game                String
  exp                  Int
  answeredCount        Int
  correctCount         Int
  averageCorrectSpeed Float
  createdAt            DateTime @default(now())

  @@unique([userId, playSessionId])
  @@index([userId, createdAt])
  @@index([playSessionId])
}
```

- [ ] **Step 2: Add matching SQL migration**

Create both tables, primary/unique/index constraints, and cascading user foreign keys. Add database checks:

```sql
ALTER TABLE "PlayerExperience"
  ADD CONSTRAINT "PlayerExperience_totalExp_check" CHECK ("totalExp" >= 0);
ALTER TABLE "ExperienceGrant"
  ADD CONSTRAINT "ExperienceGrant_exp_check" CHECK ("exp" >= 0),
  ADD CONSTRAINT "ExperienceGrant_counts_check"
    CHECK ("answeredCount" > 0 AND "correctCount" >= 0 AND "correctCount" <= "answeredCount"),
  ADD CONSTRAINT "ExperienceGrant_speed_check"
    CHECK ("averageCorrectSpeed" >= 0 AND "averageCorrectSpeed" <= 1);
```

- [ ] **Step 3: Validate and generate Prisma client**

Run:

```powershell
npx prisma format
npx prisma validate
npx prisma generate
```

Expected: all commands exit 0 and generated client exposes both models.

- [ ] **Step 4: Commit**

```powershell
git add prisma/schema.prisma prisma/migrations/20260721100000_add_player_experience/migration.sql
git commit -m "feat: persist player experience grants"
```

---

### Task 3: Transactional Experience Service

**Files:**
- Create: `web/lib/playerExperience.ts`
- Create: `web/lib/playerExperience.test.ts`

**Interfaces:**
- Consumes: `calculateSessionExperience`, `profileFromTotalExp`, Prisma score/grant/experience delegates.
- Produces:

```ts
export async function getExperienceProfile(userId: string): Promise<ExperienceProfile>;
export async function completeExperienceSession(
  userId: string,
  playSessionId: string,
): Promise<{
  alreadyGranted: boolean;
  grant: { playSessionId: string; exp: number; answeredCount: number; correctCount: number };
  profile: ExperienceProfile;
}>;
```

- [ ] **Step 1: Write failing service tests**

Mock Prisma to verify:

- a missing session throws a status-404 error;
- mixed course/game rows throw status 409;
- first completion creates a ledger row and increments total EXP in one transaction;
- an existing grant returns without increment;
- a Prisma `P2002` duplicate race reloads the existing grant/profile;
- absent profile storage maps to zero EXP.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- lib/playerExperience.test.ts`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement the service**

Query score rows with:

```ts
prisma.scoreLog.findMany({
  where: { userId, playSessionId },
  select: { course: true, game: true, isCorrect: true, elapsedMs: true },
});
```

Check all rows share the first row's course and game. Before creating a grant, read an existing `(userId, playSessionId)` grant for the normal idempotent path. For a new grant, use an interactive transaction to create the immutable grant and upsert `PlayerExperience` with `increment: exp`. Catch only Prisma unique error `P2002`; reload and return the winning grant/profile. Re-throw all other storage errors.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- lib/playerExperience.test.ts`

Expected: all transactional service tests pass.

- [ ] **Step 5: Commit**

```powershell
git add lib/playerExperience.ts lib/playerExperience.test.ts
git commit -m "feat: grant session experience transactionally"
```

---

### Task 4: Authenticated Experience APIs

**Files:**
- Create: `web/app/api/experience/profile/route.ts`
- Create: `web/app/api/experience/profile/route.test.ts`
- Create: `web/app/api/experience/sessions/complete/route.ts`
- Create: `web/app/api/experience/sessions/complete/route.test.ts`

**Interfaces:**
- Consumes: `requireSession`, `getExperienceProfile`, and `completeExperienceSession`.
- Produces: `GET /api/experience/profile` and `POST /api/experience/sessions/complete`.

- [ ] **Step 1: Write failing route tests**

Use hoisted Vitest mocks following the existing route test style. Assert:

```ts
expect(await GET(new Request('http://localhost/api/experience/profile'))).toHaveProperty(
  'status',
  200,
);
```

For completion, verify blank/missing IDs return 400 without invoking the service, valid IDs are trimmed and passed with `session.userId`, and service status errors preserve 404/409 responses. Both routes must return public API error messages for unexpected errors.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm test -- app/api/experience/profile/route.test.ts app/api/experience/sessions/complete/route.test.ts
```

Expected: FAIL because route modules do not exist.

- [ ] **Step 3: Implement route handlers**

Profile response:

```ts
const session = await requireSession();
const profile = await getExperienceProfile(session.userId);
return NextResponse.json({ success: true, profile });
```

Completion response:

```ts
const session = await requireSession();
const body = await req.json();
const playSessionId = String(body.playSessionId || '').trim();
if (!playSessionId) {
  return NextResponse.json(
    { success: false, message: 'playSessionId không hợp lệ' },
    { status: 400 },
  );
}
const result = await completeExperienceSession(session.userId, playSessionId);
return NextResponse.json({ success: true, ...result });
```

Both handlers use `publicApiErrorMessage` and an error's numeric `status`, defaulting to 500.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
npm test -- lib/experience.test.ts lib/playerExperience.test.ts app/api/experience/profile/route.test.ts app/api/experience/sessions/complete/route.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```powershell
git add app/api/experience lib/playerExperience.ts lib/playerExperience.test.ts
git commit -m "feat: expose player experience APIs"
```

---

### Task 5: Full Verification

**Files:**
- Review all files changed in Tasks 1–4.

- [ ] **Step 1: Run database and static checks**

Run:

```powershell
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run lint
```

Expected: all commands exit 0 without new errors.

- [ ] **Step 2: Run tests and production build**

Run:

```powershell
npm test
npm run build
```

Expected: all tests pass and the production build exits 0.

- [ ] **Step 3: Inspect final diff**

Run:

```powershell
git diff --check HEAD~4
git status --short
```

Confirm unrelated portal SSO work remains untouched and no `.next` artifacts are staged.

- [ ] **Step 4: Apply the migration only when a configured development database is available**

Run `npm run db:deploy:local` for the local development database, or report that deployment was not attempted when the database is unavailable. Do not deploy to Neon without explicit production/deployment authorization.

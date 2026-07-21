# Player Experience Backend Design

## Goal

Add a server-owned experience system for player levels 1–50. Experience is granted once when a game play session is completed, while the existing per-answer score and leaderboard behavior remains unchanged.

This phase covers persistence, calculation, and authenticated APIs. Header UI, progress animations, and the ten tier icon assets are separate follow-up work.

## Experience Rules

A session is eligible when it has a non-empty `playSessionId` and at least one matching `ScoreLog` owned by the authenticated user. The server derives every input from `ScoreLog`; the client cannot submit correctness, timing, or an EXP amount.

For one session:

```text
answeredCount = number of ScoreLog rows
correctCount = number of correct rows
accuracy = correctCount / answeredCount
averageCorrectSpeed = average clamp(1 - elapsedMs / 30000, 0, 1)
                      across correct rows, or 0 when none are correct

baseExp = 40
accuracyExp = floor(accuracy * 60)
speedBonus = floor(averageCorrectSpeed * 20)
perfectBonus = 25 when answeredCount >= 5 and accuracy = 1, otherwise 0

sessionExp = baseExp + accuracyExp + speedBonus + perfectBonus
```

The result is 40–145 EXP. Wrong answers never remove accumulated EXP. A session can produce at most one grant, enforced by a database unique constraint rather than client state.

## Level Curve

The player starts at level 1. For each level `L` from 1 through 49:

```text
expToNextLevel(L) = round(80 * L^1.35)
```

Level is derived from lifetime `totalExp`; it is not stored independently. At level 50, additional EXP remains recorded and `expToNextLevel` is `null`. This avoids inconsistent level and EXP columns and preserves future expansion options.

The tier is `floor((level - 1) / 5) + 1`, producing ten tiers:

- Tier 1: levels 1–5
- Tier 2: levels 6–10
- Tier 3: levels 11–15
- Tier 4: levels 16–20
- Tier 5: levels 21–25
- Tier 6: levels 26–30
- Tier 7: levels 31–35
- Tier 8: levels 36–40
- Tier 9: levels 41–45
- Tier 10: levels 46–50

## Persistence

Add two models:

### `PlayerExperience`

- `userId`: primary key and cascading relation to `User`.
- `totalExp`: non-negative lifetime total, default 0.
- `createdAt`, `updatedAt`: audit timestamps.

This is the fast read model used by the profile API.

### `ExperienceGrant`

- `id`: generated primary key.
- `userId`: cascading relation to `User`.
- `playSessionId`: source session identifier.
- `course`, `game`: copied from the matching score rows for audit.
- `exp`: awarded EXP.
- `answeredCount`, `correctCount`, `averageCorrectSpeed`: immutable calculation inputs.
- `createdAt`: grant timestamp.
- Unique constraint on `(userId, playSessionId)`.
- Indexes on `(userId, createdAt)` and `playSessionId`.

The grant ledger provides idempotency and auditability. `PlayerExperience.totalExp` is incremented in the same database transaction as grant creation.

## APIs

### `POST /api/experience/sessions/complete`

Request:

```json
{ "playSessionId": "uuid-or-existing-session-id" }
```

Behavior:

1. Require an authenticated user.
2. Reject a blank session ID with HTTP 400.
3. Load all `ScoreLog` rows matching the user and session ID.
4. Return HTTP 404 if no answers exist.
5. Reject HTTP 409 if the session rows contain more than one course or game, because a play session must identify exactly one game attempt.
6. Calculate EXP from the stored rows.
7. In one transaction, create `ExperienceGrant` and increment/upsert `PlayerExperience`.
8. If the unique grant already exists, return its original award and current profile without incrementing again.

Successful responses use HTTP 200 for both first completion and retries:

```json
{
  "success": true,
  "alreadyGranted": false,
  "grant": {
    "playSessionId": "...",
    "exp": 123,
    "answeredCount": 10,
    "correctCount": 9
  },
  "profile": {
    "totalExp": 4567,
    "level": 12,
    "tier": 3,
    "expInLevel": 234,
    "expToNextLevel": 2291,
    "progressPercent": 10
  }
}
```

`alreadyGranted` is `true` on an idempotent retry.

### `GET /api/experience/profile`

Requires authentication and returns the same `profile` shape. A user without a `PlayerExperience` row receives the level-1 zero-EXP profile; the read endpoint does not create a database row.

## Concurrency and Integrity

- The unique `(userId, playSessionId)` constraint is the source of truth for idempotency.
- Grant insertion and total increment occur in one transaction.
- A concurrent duplicate that loses the unique race reloads the existing grant and current total, returning `alreadyGranted: true`.
- All EXP calculations use immutable score rows selected by authenticated user ID.
- Session rows must agree on course and game, preventing accidental combination of unrelated games.
- Existing score submission and leaderboard APIs are not modified.

## Errors

- 400: missing or blank `playSessionId`.
- 401: unauthenticated request.
- 404: no score rows for the authenticated user/session.
- 409: mixed course/game data within one session.
- 500: unexpected storage failure, exposed through the shared public API error message.

## Testing

- Pure unit tests cover session EXP boundaries, speed clamping, level thresholds, level 50, and tier boundaries.
- Route tests cover authentication, invalid input, missing/mixed sessions, first grant, idempotent retry, and profile defaults.
- Prisma schema validation and client generation verify the data model.
- Full Vitest, TypeScript, ESLint, and production build checks run before completion.

## Out of Scope

- Calling the completion endpoint from every game UI.
- Displaying level/EXP in `AppHeader`.
- Generating or integrating the ten tier icon assets.
- Administrator EXP adjustment tools.
- Retrospective EXP backfill from legacy sessions.

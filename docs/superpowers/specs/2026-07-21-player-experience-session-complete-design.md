# Player Experience Session Completion Design

## Goal

Grant session EXP automatically when a play session finishes, without editing all eleven game components individually.

## When a Session Completes

A play session is completed on the server inside `POST /api/progress` in either case:

1. **Reset / replay:** Before replacing progress with a new `playSessionId`, complete the previous `GameProgress.playSessionId` if present.
2. **All questions graded:** After a non-reset progress save whose merged `statuses` contain no `empty` values, complete the current `playSessionId`.

Both paths call `completeExperienceSession(userId, playSessionId)`. Existing unique-grant semantics keep retries and double triggers idempotent (`alreadyGranted: true`).

## Progress Route Behavior

- Progress upsert remains the primary responsibility of the route.
- Experience completion runs best-effort relative to progress:
  - Missing score rows (`404`) are ignored so empty resets still succeed.
  - Mixed session (`409`) and unexpected errors must not roll back a successful progress write; log/ignore and return the normal progress response.
- No EXP fields are added to the progress response in this phase.
- Header badge refresh after grant remains out of scope (page navigation / later refresh).

## Client Changes

None required for the eleven games. They already persist statuses before opening the result panel and already reset through `/api/progress`.

Optional later: a client helper and header refresh — not in this phase.

## Testing

- Route tests for `/api/progress`:
  - Reset completes the previous session id before writing the new one.
  - A fully graded statuses payload completes the current session id.
  - A payload that still has `empty` does not complete.
  - Completion `404` does not fail the progress response.
  - Auth still required.
- Keep existing progress merge/reset behavior covered.
- Focused Vitest + TypeScript + lint + build.

## Out of Scope

- Editing each game's `goNext` / `setPanel('result')`.
- Refreshing `AppHeader` immediately after a grant.
- Unlock toast / animation.
- Backfilling historical sessions.

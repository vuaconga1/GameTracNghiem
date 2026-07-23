# Player Experience Session Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically complete player experience grants from the shared progress API when a session ends or is reset.

**Architecture:** Keep game clients unchanged. Extend `POST /api/progress` to call `completeExperienceSession` when resetting an old session or when saved statuses are fully graded. Treat completion failures that mean “nothing to grant” as non-fatal so progress writes stay reliable.

**Tech Stack:** Next.js route handlers, Vitest mocks, existing `playerExperience` service.

## Global Constraints

- Do not edit the eleven game feature files for this step.
- Preserve unrelated portal SSO work.
- Progress write success must not depend on EXP grant success for empty/missing score sessions.
- Use existing `completeExperienceSession`; do not duplicate grant logic.

---

### Task 1: Progress Route Experience Hooks

**Files:**
- Create: `web/app/api/progress/route.test.ts`
- Modify: `web/app/api/progress/route.ts`

**Interfaces:**
- Consumes: `requireSession`, `completeExperienceSession`, Prisma `gameProgress`
- Produces: unchanged progress JSON shape

- [ ] Write failing route tests covering reset completes previous session, fully graded statuses complete current session, remaining empty skips complete, completion 404 is ignored, auth required.
- [ ] Run `npm test -- app/api/progress/route.test.ts` and confirm RED.
- [ ] Implement helper `safeCompleteExperience(userId, playSessionId)` that no-ops on blank ids and swallows status 404.
- [ ] On reset: if existing progress has a previous `playSessionId`, call safe complete before upserting the new session.
- [ ] After non-reset upsert, if merged statuses have no `empty`, call safe complete with the returned/current `playSessionId`.
- [ ] Run focused tests GREEN.
- [ ] Commit `feat: grant experience when play sessions complete`.

### Task 2: Verification

- [ ] `npm test -- app/api/progress/route.test.ts lib/playerExperience.test.ts`
- [ ] `npm test`
- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Confirm game feature files and SSO work remain untouched.

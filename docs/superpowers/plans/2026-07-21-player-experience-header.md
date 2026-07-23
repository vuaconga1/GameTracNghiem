# Player Experience Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the player's level number and tier shield icon in the main header badge.

**Architecture:** The authenticated main layout loads `getExperienceProfile` on the server and passes `level`/`tier` through `MainShell` into `AppHeader`. The header uses `rankIconForTier` to select a public SVG and replaces the Font Awesome placeholder.

**Tech Stack:** Next.js App Router server layout, React client header, Vitest.

## Global Constraints

- Do not modify experience grant APIs, score submission, or game clients in this plan.
- Preserve unrelated portal SSO working-tree changes.
- Badge must remain usable when profile load fails (fallback level 1 / tier 1).
- Use existing `rankIcons` paths; do not invent new asset names.

---

### Task 1: Header Badge Presentation

**Files:**
- Create: `web/components/shell/AppHeader.test.tsx` (or colocated presentational helper test)
- Modify: `web/components/shell/AppHeader.tsx`
- Modify: `web/styles/legacy/game-styles.css` (and `index-shell.css` if it duplicates `.badge-rank`)

**Interfaces:**
- Consumes: `rankIconForTier(tier)`, props `{ level?: number; tier?: number }`
- Produces: badge showing SVG + numeric level

- [ ] Write failing tests for default level/tier rendering and a higher-tier icon path.
- [ ] Run focused test and confirm RED.
- [ ] Update `AppHeader` to accept `level`/`tier`, render `<img>` from `rankIconForTier`, show numeric level.
- [ ] Add CSS for `.badge-rank img` (≈14px, block, no shrink).
- [ ] Run focused tests GREEN and commit `feat: show player level shield in header`.

### Task 2: Server Profile Wiring

**Files:**
- Modify: `web/app/(main)/layout.tsx`
- Modify: `web/components/shell/MainShell.tsx`

**Interfaces:**
- Consumes: `getExperienceProfile(userId)`
- Produces: `level` and `tier` props on `MainShell`/`AppHeader`

- [ ] Write/extend a small test or layout helper covering fallback when profile loading throws.
- [ ] Wire layout to load profile after session; on failure use level 1 / tier 1.
- [ ] Forward props through `MainShell`.
- [ ] Run focused tests + `npx tsc --noEmit`.
- [ ] Commit `feat: load experience profile into main shell`.

### Task 3: Verification

- [ ] `npm test -- components/shell/AppHeader.test.tsx lib/rankIcons.test.ts`
- [ ] `npm test`
- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Confirm SSO files remain unstaged and no `.next` artifacts are staged.

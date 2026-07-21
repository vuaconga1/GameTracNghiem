# Rank Tier Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ten flat SVG rank shields and a tested helper that maps tiers and player levels to their public paths.

**Architecture:** Static assets live under Next.js `public` and are addressed by stable root-relative URLs. A pure client-safe TypeScript module owns clamping, level-to-tier conversion, and path lookup; Vitest verifies both mapping behavior and asset presence.

**Tech Stack:** SVG, TypeScript, Next.js public assets, Vitest.

## Global Constraints

- Use exactly ten assets named `tier-01.svg` through `tier-10.svg`.
- Every icon uses `viewBox="0 0 24 24"`, flat vector shapes, and no external resources.
- Every five player levels advance one tier; level and tier values clamp to supported bounds.
- Do not modify `AppHeader`, experience APIs, game clients, or unrelated portal SSO work.

---

### Task 1: Mapping Contract and Asset Validation Tests

**Files:**
- Create: `web/lib/rankIcons.test.ts`

**Interfaces:**
- Consumes the public API defined in the design.
- Produces failing tests that define mapping and asset requirements.

- [ ] Write tests for all ten exact paths, invalid/decimal tier normalization, level boundaries, level overflow, and every SVG file's existence/viewBox.
- [ ] Run `npm test -- lib/rankIcons.test.ts`.
- [ ] Confirm RED because `lib/rankIcons.ts` does not exist.

### Task 2: Ten SVG Assets

**Files:**
- Create: `web/public/icons/rank/tier-01.svg`
- Create: `web/public/icons/rank/tier-02.svg`
- Create: `web/public/icons/rank/tier-03.svg`
- Create: `web/public/icons/rank/tier-04.svg`
- Create: `web/public/icons/rank/tier-05.svg`
- Create: `web/public/icons/rank/tier-06.svg`
- Create: `web/public/icons/rank/tier-07.svg`
- Create: `web/public/icons/rank/tier-08.svg`
- Create: `web/public/icons/rank/tier-09.svg`
- Create: `web/public/icons/rank/tier-10.svg`

**Interfaces:**
- Produces `/icons/rank/tier-01.svg` through `/icons/rank/tier-10.svg`.

- [ ] Draw the shared split shield silhouette in every file.
- [ ] Add the tier-specific palette and symbol from the design.
- [ ] Ensure each file has an English `<title>`, required viewBox, and no scripts, filters, gradients, fonts, or external references.

### Task 3: Mapping Helper

**Files:**
- Create: `web/lib/rankIcons.ts`

**Interfaces:**
- Produces `RankTier`, `RANK_TIER_COUNT`, `RANK_TIER_ICONS`, `normalizeRankTier`, `rankTierForLevel`, `rankIconForTier`, and `rankIconForLevel`.

- [ ] Implement the minimal pure helper using a readonly record of ten paths.
- [ ] Run `npm test -- lib/rankIcons.test.ts`.
- [ ] Confirm GREEN.
- [ ] Run `npx tsc --noEmit`.
- [ ] Commit test, helper, and ten SVG files with `feat: add player rank tier icons`.

### Task 4: Verification

**Files:**
- Review all files from Tasks 1–3.

- [ ] Run `npm test -- lib/rankIcons.test.ts`.
- [ ] Run `npm test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Confirm unrelated portal SSO changes remain untouched and no generated artifacts are staged.

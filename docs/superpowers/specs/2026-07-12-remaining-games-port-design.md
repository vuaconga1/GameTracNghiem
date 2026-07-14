# Design: Port Remaining Games GAS → Next.js

**Date:** 2026-07-12  
**Status:** Implemented — verified (`npm test` 74 pass, `npm run build` OK)  
**Branch / worktree:** `feature/nextjs-migration` → `.worktrees/nextjs-migration`  
**Depends on:** Next.js MVP + Legacy UI Parity Scope A (grammar live)

## 1. Goal

Port all 10 remaining games from GAS HTML/JS into Next.js React features with **~100% legacy UI** (same class names / DOM structure / CSS), full play logic, progress, and ScoreLog scoring.

## 2. Decisions (locked)

| Topic | Choice |
|-------|--------|
| Order | **Core first**, then Starters |
| UI approach | React port per game (copy grammar pattern); legacy CSS from each HTML |
| Starters scoring | Add `POST /api/score/submit` when porting (GAS lacked it) |
| Pronunciation | Keep Web Speech API + legacy UI |
| Schema | Reuse `Question.payload` JSONB + `GameProgress` + `ScoreLog`; no new models |
| GAS | Do not modify legacy HTML / Code.gs |

## 3. Batches

### Core
`quiz`, `pronunciation`, `scramble` (`word-scramble`), `word_match`, `look_and_write`

### Starters
`choose_and_circle`, `read_and_complete`, `read_and_match`, `vocabulary_test`, `vocabulary_check`

## 4. Per-game pattern (same as grammar)

```
app/(main)/games/<slug>/[courseId]/page.tsx
app/api/games/<slug>/[courseId]/route.ts   # GET questions + progress
features/games/<slug>/<Name>Game.tsx         # UI + flow
features/games/<slug>/gradeAnswer.ts         # client grade
styles/legacy/<slug>-extras.css              # only if GameStyles insufficient
```

Flow: load → list/play/result → grade client-side → `submitAnswerScore` + progress save → leaderboard via ScoreLog.

Loading UI: `.data-loading-state` + `fa-gear fa-spin` + `đang tải dữ liệu`.

## 5. Course detail

Replace “Sắp có” with live `Link` to `/games/<slug>/[courseId]` as each game ships. API `GET /api/courses/[id]` returns progress summary per available game.

## 6. Game keys (API / ScoreLog / progress)

| Key | Route slug | Legacy file |
|-----|------------|-------------|
| quiz | quiz | multiplechoice.html |
| pronunciation | pronunciation | pronunciation.html |
| scramble | scramble | word-scramble.html |
| word_match | word-match | word-match.html |
| look_and_write | look-and-write | look-and-write.html |
| choose_and_circle | choose-and-circle | choose-and-circle.html |
| read_and_complete | read-and-complete | read-and-complete.html |
| read_and_match | read-and-match | read-and-match.html |
| vocabulary_test | vocabulary-test | vocabulary-test.html |
| vocabulary_check | vocabulary-check | vocabulary-check.html |

## 7. Success criteria

- Each game playable end-to-end on Postgres seed/import data
- Answer → ScoreLog row → leaderboard reflects points
- Progress statuses persist like grammar
- Visual parity with legacy class structure
- Starters submit scores (new vs GAS)

## 8. Out of scope

- Rewriting scoring constants
- Cloudinary / new media pipeline (keep URLs in payload)
- Full PDF ebook
- Parallel long-term GAS runtime

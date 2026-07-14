# Remaining Games Port (Core + Starters) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port all remaining GAS games into Next.js with legacy UI parity, progress, and ScoreLog scoring (Core first, then Starters).

**Architecture:** Copy the grammar feature pattern per game: App Router page + GET questions API + client React game + `submitAnswerScore` + progress. Legacy CSS from `GameStyles` / per-game HTML extras. Work only under `.worktrees/nextjs-migration/web/`.

**Tech Stack:** Next.js 15, React, Prisma, existing `lib/scoring`, `features/scoring/submitScore`, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-12-remaining-games-port-design.md`

**Reference implementation:** `web/features/games/grammar/*`, `web/app/api/games/grammar/[courseId]/route.ts`, `web/app/(main)/games/grammar/[courseId]/page.tsx`

**Legacy sources (workspace root or worktree copy):** `multiplechoice.html`, `pronunciation.html`, `word-scramble.html`, `word-match.html`, `look-and-write.html`, starters HTML + `starters-common.html`

---

## File map (per game — repeat pattern)

| Path | Responsibility |
|------|----------------|
| `features/games/<slug>/<Name>Game.tsx` | Full play UI (legacy classes) |
| `features/games/<slug>/gradeAnswer.ts` | Pure grading helpers |
| `features/games/<slug>/*.test.ts(x)` | Grade + smoke UI tests |
| `app/api/games/<slug>/[courseId]/route.ts` | Load questions + progress |
| `app/(main)/games/<slug>/[courseId]/page.tsx` | Page shell |
| `styles/legacy/<slug>-extras.css` | Only if needed; import from layout |
| `features/courses/CourseDetailView.tsx` | Wire live link + progress |
| `app/api/courses/[id]/route.ts` | Include game progress summaries |
| `scripts/seed-dev.ts` | Sample questions per game |

---

### Task 1: Shared helpers + course detail wiring scaffold

**Files:**
- Create: `web/lib/gameProgress.ts` (normalize statuses helper if not duplicated)
- Modify: `web/features/courses/CourseDetailView.tsx`
- Modify: `web/app/api/courses/[id]/route.ts`

- [ ] **Step 1:** Extract/reuse progress status normalization used by grammar API into a small shared helper if duplication would exceed ~15 lines per game.
- [ ] **Step 2:** Extend course detail API to return `{ questionCount, statuses }` for each game key that has questions (or empty when none).
- [ ] **Step 3:** Change `COMING_SOON_ACTIVITIES` into a config that supports `href` when implemented; keep disabled until each game task enables it.
- [ ] **Step 4:** Commit: `feat(games): scaffold multi-game progress on course detail`

---

### Task 2: Port quiz (multiplechoice)

**Legacy:** `multiplechoice.html`  
**Game key:** `quiz`  
**Route:** `/games/quiz/[courseId]`

- [ ] **Step 1:** Write `gradeAnswer.test.ts` for quiz option selection / correct index.
- [ ] **Step 2:** Implement `gradeAnswer.ts` to pass.
- [ ] **Step 3:** Implement GET `/api/games/quiz/[courseId]` mapping `Question.payload` to quiz shape (mirror GAS `getQuizQuestions` fields).
- [ ] **Step 4:** Port `QuizGame.tsx` UI from `multiplechoice.html` (list → question → result), call `submitAnswerScore('quiz', ...)`, save progress.
- [ ] **Step 5:** Page route + seed sample quiz questions + enable course detail link.
- [ ] **Step 6:** Port CSS extras if missing from `game-styles.css`.
- [ ] **Step 7:** `npm test` + smoke; commit: `feat(games): port quiz with legacy UI and scoring`

---

### Task 3: Port pronunciation

**Legacy:** `pronunciation.html`  
**Game key:** `pronunciation`  
**Route:** `/games/pronunciation/[courseId]`

- [ ] **Step 1:** Grade/helpers tests for speech result matching (port GAS normalize/compare).
- [ ] **Step 2:** API GET + payload mapping (`mode`, target text, audio URL, etc.).
- [ ] **Step 3:** `PronunciationGame.tsx` with Web Speech recognition + TTS/playback + legacy chrome; scoring + progress.
- [ ] **Step 4:** Seed + course detail link + CSS extras.
- [ ] **Step 5:** Tests + commit: `feat(games): port pronunciation with Web Speech and scoring`

---

### Task 4: Port scramble (word-scramble)

**Legacy:** `word-scramble.html`  
**Game key:** `scramble`  
**Route:** `/games/scramble/[courseId]`

- [ ] Same pattern: grade tests → API → Game UI → seed → course link → CSS → commit `feat(games): port scramble with legacy UI and scoring`

---

### Task 5: Port word_match

**Legacy:** `word-match.html`  
**Game key:** `word_match`  
**Route:** `/games/word-match/[courseId]`

- [ ] Same pattern; commit `feat(games): port word_match with legacy UI and scoring`

---

### Task 6: Port look_and_write

**Legacy:** `look-and-write.html`  
**Game key:** `look_and_write`  
**Route:** `/games/look-and-write/[courseId]`

- [ ] Same pattern; commit `feat(games): port look_and_write with legacy UI and scoring`

---

### Task 7: Port starters (batch)

For each of: `choose_and_circle`, `read_and_complete`, `read_and_match`, `vocabulary_test`, `vocabulary_check`:

- [ ] Port UI from legacy + `starters-common.html` shared helpers as needed
- [ ] Add `submitAnswerScore` with correct game key and unique `questionIndex`
- [ ] API + page + seed + course detail link
- [ ] Commits per game or one commit per 1–2 games if tightly coupled

---

### Task 8: Verification gate

- [ ] `npm test`, `npm run lint`, `npm run build` in `web/`
- [ ] Grep: every new game calls `submitAnswerScore` / score API
- [ ] Grep: loading states use `fa-gear` + `đang tải dữ liệu`
- [ ] Manual smoke: open each route, answer one question, confirm ScoreLog/leaderboard path
- [ ] Mark design/plan status verified in docs

---

## Notes for implementers

- Prefer absolute paths under worktree: `e:/Wewin/Game Trắc Nghiệm/.worktrees/nextjs-migration/web/`
- Do not edit root GAS `*.html` / `Code.gs` for product changes
- Media: keep Drive/image URLs inside `payload`
- `questionIndex`: integer unique per course+game (use question list index; for multi-item within one card use `index * 100 + subIndex`)
- Match Vietnamese copy and button labels from legacy HTML

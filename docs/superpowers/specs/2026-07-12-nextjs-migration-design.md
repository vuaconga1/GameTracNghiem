# Design: Migrate WeWIN Game Trắc Nghiệm → Next.js + PostgreSQL

**Date:** 2026-07-12  
**Status:** Approved — implementation plan: `docs/superpowers/plans/2026-07-12-nextjs-migration-mvp.md`  
**Approach:** Monorepo-style Next.js app (Approach 1)

## 1. Goal

Convert the Google Apps Script + HTML/JS + Google Sheets quiz platform into a standard Next.js application with PostgreSQL, clear folder structure, and phased delivery — without changing the product rules for scoring, progress, or WeWIN UI loading states.

## 2. Decisions (locked)

| Topic | Choice |
|-------|--------|
| Framework | Next.js App Router + TypeScript + React |
| Database | PostgreSQL (local + cloud e.g. Neon/Supabase; Vercel-ready) |
| ORM | Prisma |
| Auth | Username + password (same UX as sheet `User`), bcrypt + httpOnly session cookie |
| Migration style | Phased (foundation → scoring → grammar template → other games) |
| Game UI | Full port to React (not wrapped vanilla HTML) |
| Sheets role | One-shot / batch import only — not runtime source of truth |
| App location | `web/` folder in workspace; legacy GAS HTML kept for reference/import |

**Out of scope for initial phases:** Cloudinary/S3 media pipeline, Google OAuth, running GAS in parallel long-term, tRPC.

## 3. Architecture

```
Browser → Next.js (RSC / Route Handlers / Server Actions)
       → Prisma → PostgreSQL
```

- Shared UI in `components/`
- Domain logic in `features/` (auth, courses, scoring, games/*)
- Infra helpers in `lib/` (`db`, `auth`, `scoring`, `utils`)
- Schema + migrations in `prisma/`
- Import tooling in `scripts/import-from-sheets.ts`

### Target folder tree

```
web/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (main)/page.tsx
│   ├── (main)/courses/[id]/page.tsx
│   ├── (main)/leaderboard/page.tsx
│   ├── (main)/games/
│   │   ├── grammar/[courseId]/page.tsx
│   │   └── …                    # one route per game
│   ├── api/
│   │   ├── auth/login|logout|me/
│   │   ├── courses/
│   │   ├── games/[game]/
│   │   ├── progress/
│   │   ├── score/submit/
│   │   └── leaderboard/
│   ├── layout.tsx
│   └── globals.css
├── components/
├── features/
│   ├── auth/
│   ├── courses/
│   ├── leaderboard/
│   ├── scoring/
│   └── games/
│       ├── grammar/
│       └── …
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   ├── scoring.ts
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/
│   └── import-from-sheets.ts
├── public/
├── .env.local                   # never commit secrets
└── package.json
```

## 4. Data model

| Model | Purpose | Notes |
|-------|---------|-------|
| `User` | Accounts | `username` unique, `passwordHash`, `displayName` |
| `ClassLevel` | Class ↔ Cambridge level filters | From `Class_Level` |
| `Course` | Course catalog | From `Courses`; optional ebook metadata |
| `Question` | All game content | `courseId`, `game` enum/string, optional `level`, `payload` JSONB, `active`, `sortOrder` |
| `GameProgress` | Per-user statuses | `userId`, `courseKey`, `game`, `statuses` JSONB |
| `ScoreLog` | Answer score events | Source of truth for leaderboard; **append each attempt** (no unique constraint in v1 — same as GAS `appendRow`) |

**Leaderboard:** Aggregate from `ScoreLog` by period (day/week/month/all). No separate writable Leaderboard table required in v1 (matches current GAS preference for ScoreLog).

**Scoring constants** (port from `CONFIG.SCORING`):

- `TIME_LIMIT_MS = 30000`
- Correct: 50–200; Wrong: 20–80

**Passwords:** Never store plaintext. Import script must hash existing sheet passwords with bcrypt on first import.

**Media (phase 1):** Keep Drive URLs / image paths inside `Question.payload`. Dedicated object storage later.

## 5. Auth & API contracts

### Auth

- `POST /api/auth/login` — username + password → set httpOnly session cookie
- `GET /api/auth/me` — current user or 401
- `POST /api/auth/logout` — clear session
- Middleware protects authenticated routes; login is public
- Score/progress APIs resolve user **only** from session (never trust client-supplied username)

### Play flow

1. Home → class/level filters → courses  
2. Course detail → games + progress  
3. Game page → load questions  
4. Answer → client grade → `POST /api/score/submit` (+ progress update)  
5. Leaderboard → ScoreLog aggregates  

### UI loading (workspace rule)

While fetching: `.data-loading-state` + `fas fa-gear fa-spin` + text `đang tải dữ liệu`.  
Errors / empty states: same container **without** gear spinner.

### Errors

API returns clear `{ success, message }` and/or HTTP 400/401/500. UI shows human-readable Vietnamese messages.

## 6. Phased delivery

| Phase | Deliverable |
|-------|-------------|
| 0 | Scaffold `web/`, Prisma, env sample, empty migrate |
| 1 | User + auth + ClassLevel/Course + import users/courses |
| 2 | Scoring lib + ScoreLog write + Leaderboard API/UI |
| 3 | Port **grammar** end-to-end (template for all games) |
| 4+ | Port remaining games: quiz, pronunciation, scramble, word_match, look_and_write, choose_and_circle, read_and_complete, read_and_match, vocabulary_test, vocabulary_check |

Each game after phase 3 follows the same pattern: `features/games/<name>` + App route + load API + `submitAnswerScore`.

## 7. Import from Google Sheets

- Script reads spreadsheet (Sheets API or exported CSV) and upserts into Postgres.
- Run manually / on demand — not on every request.
- After import, production runtime does not depend on Apps Script.

## 8. Testing & verification

- Phase gates: smoke-test login, course list, one game answer → ScoreLog row → leaderboard update.
- Prefer small unit tests for `lib/scoring.ts` (point calculation).
- Before claiming a phase complete: run verification (app boots, migrate applies, grep/API checks for scoring path) — no “done” without evidence.

## 9. Environment

`.env.local` (gitignored):

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
SESSION_SECRET=long-random-string
```

Do not commit real passwords. Use cloud Postgres connection string for shared/deployed environments.

## 10. Non-goals / explicit exclusions

- Rewriting all games in one PR
- Keeping Sheets as live question store
- Changing WeWIN brand tokens without a separate design pass
- Putting secrets in docs or source

## 11. Success criteria

- Standard Next.js layout a new developer can navigate without knowing GAS
- Auth + courses + grammar + scoring + leaderboard work on Postgres
- Remaining games can be ported by copying the grammar feature pattern
- Workspace scoring and loading rules still hold

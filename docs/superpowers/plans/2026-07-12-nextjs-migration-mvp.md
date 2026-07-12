# Next.js Migration MVP (Phases 0–3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a standard Next.js + Prisma + PostgreSQL app in `web/` with username/password auth, courses, ScoreLog scoring, leaderboard, and one end-to-end game (`grammar`) as the template for later ports.

**Architecture:** App Router RSC + Route Handlers talk to PostgreSQL via Prisma. Session is an httpOnly cookie (JWT sealed with `jose`). Game answers call `POST /api/score/submit`; leaderboard aggregates `ScoreLog`. Legacy GAS HTML stays outside `web/` for reference/import only.

**Tech Stack:** Next.js 15, TypeScript, React, Prisma, PostgreSQL, bcryptjs, jose, Vitest, Font Awesome (CDN or package) for `fa-gear fa-spin`.

**Spec:** `docs/superpowers/specs/2026-07-12-nextjs-migration-design.md`

**Out of scope for this plan:** Porting quiz/pronunciation/scramble/word_match/look_and_write/starters games (follow-up plan after MVP works). Live Sheets runtime. Object storage.

---

## File map (create under `web/`)

| Path | Responsibility |
|------|----------------|
| `package.json` | Next app deps + scripts (`dev`, `build`, `test`, `db:*`) |
| `.env.example` | `DATABASE_URL`, `SESSION_SECRET` placeholders (no secrets) |
| `.env.local` | Real local/cloud connection (gitignored) |
| `.gitignore` | `.env.local`, `node_modules`, `.next` |
| `prisma/schema.prisma` | User, ClassLevel, Course, Question, GameProgress, ScoreLog |
| `lib/db.ts` | PrismaClient singleton |
| `lib/scoring.ts` | Point calculation (port from GAS) |
| `lib/auth.ts` | Password hash/verify, session get/set/clear |
| `lib/session.ts` | Cookie name + JWT seal/unseal helpers |
| `lib/loading.ts` | `LOADING_HTML` / React `DataLoading` helpers |
| `app/globals.css` | WeWIN CSS variables from `FRONTEND.md` |
| `app/layout.tsx` | Root layout, Nunito, FA |
| `app/(auth)/login/page.tsx` | Login form |
| `app/(main)/layout.tsx` | Authenticated shell |
| `app/(main)/page.tsx` | Home: class/level/course filters |
| `app/(main)/courses/[id]/page.tsx` | Course detail + game links |
| `app/(main)/leaderboard/page.tsx` | Leaderboard UI |
| `app/(main)/games/grammar/[courseId]/page.tsx` | Grammar game page |
| `app/api/auth/login/route.ts` | Login |
| `app/api/auth/logout/route.ts` | Logout |
| `app/api/auth/me/route.ts` | Current user |
| `app/api/courses/route.ts` | List courses (+ filters) |
| `app/api/courses/[id]/route.ts` | Course detail + progress summary |
| `app/api/score/submit/route.ts` | Append ScoreLog + return points |
| `app/api/leaderboard/route.ts` | Aggregate ScoreLog |
| `app/api/games/grammar/[courseId]/route.ts` | Grammar questions + progress |
| `app/api/progress/route.ts` | Save game progress statuses |
| `middleware.ts` | Protect `(main)` routes; allow login + public assets |
| `features/auth/LoginForm.tsx` | Client login form |
| `features/courses/CourseFilters.tsx` | Class/level filters |
| `features/courses/CourseList.tsx` | Course cards |
| `features/leaderboard/LeaderboardPanel.tsx` | Period tabs + list |
| `features/scoring/submitScore.ts` | Client helper calling score API |
| `features/games/grammar/GrammarGame.tsx` | Grammar play UI |
| `features/games/grammar/gradeAnswer.ts` | Client-side answer check |
| `components/DataLoading.tsx` | Standard loading / empty / error states |
| `components/Header.tsx` | Logo, user, logout, nav |
| `scripts/seed-dev.ts` | Seed demo user + sample course + grammar questions |
| `scripts/import-from-sheets.ts` | Optional CSV/Sheets import (users + courses first) |
| `lib/scoring.test.ts` | Vitest for points |

---

### Task 1: Init git (if missing) and scaffold Next.js app

**Files:**
- Create: `web/` (via create-next-app)
- Create: `web/.env.example`
- Create: root `.gitignore` entries if repo is new

- [ ] **Step 1: Initialize git at workspace root if needed**

```bash
cd "e:/Wewin/Game Trắc Nghiệm"
git rev-parse --is-inside-work-tree 2>nul || git init
```

Expected: prints `true`, or creates `.git`.

- [ ] **Step 2: Scaffold Next.js in `web/`**

```bash
cd "e:/Wewin/Game Trắc Nghiệm"
npx create-next-app@15 web --typescript --eslint --app --src-dir=false --tailwind=false --import-alias="@/*" --turbopack --yes
```

Expected: `web/package.json` exists; `web/app/page.tsx` exists.

- [ ] **Step 3: Install runtime deps**

```bash
cd "e:/Wewin/Game Trắc Nghiệm/web"
npm install @prisma/client bcryptjs jose zod
npm install -D prisma vitest @types/bcryptjs tsx
npx prisma init
```

Expected: `web/prisma/schema.prisma` created; `vitest` in `devDependencies`.

- [ ] **Step 4: Add `.env.example` and ignore secrets**

Create `web/.env.example`:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/wewin_game?schema=public"
SESSION_SECRET="replace-with-long-random-string-at-least-32-chars"
```

Ensure `web/.gitignore` contains `.env*.local` and `.env`. Create `web/.env.local` locally (not committed) with the real `DATABASE_URL` and a random `SESSION_SECRET`.

- [ ] **Step 5: Add npm scripts to `web/package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "tsx scripts/seed-dev.ts"
  }
}
```

- [ ] **Step 6: Commit**

```bash
cd "e:/Wewin/Game Trắc Nghiệm"
git add web docs
git commit -m "chore: scaffold Next.js app in web/ for migration MVP"
```

---

### Task 2: Prisma schema (all MVP models)

**Files:**
- Modify: `web/prisma/schema.prisma`

- [ ] **Step 1: Replace `schema.prisma` with:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String         @id @default(cuid())
  username     String         @unique
  passwordHash String
  displayName  String
  createdAt    DateTime       @default(now())
  progress     GameProgress[]
  scoreLogs    ScoreLog[]
}

model ClassLevel {
  id        String  @id @default(cuid())
  className String
  levelName String
  active    Boolean @default(true)

  @@unique([className, levelName])
  @@index([className])
}

model Course {
  id             String     @id @default(cuid())
  name           String
  className      String
  levelName      String
  active         Boolean    @default(true)
  ebookFileId    String?
  ebookPageStart Int?
  ebookPageEnd   Int?
  questions      Question[]

  @@index([className, levelName])
  @@index([name])
}

model Question {
  id        String   @id @default(cuid())
  courseId  String
  course    Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  game      String
  level     String?
  payload   Json
  active    Boolean  @default(true)
  sortOrder Int      @default(0)
  externalId String?

  @@index([courseId, game, active])
}

model GameProgress {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseKey String
  game      String
  statuses  Json
  updatedAt DateTime @updatedAt

  @@unique([userId, courseKey, game])
}

model ScoreLog {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  course        String
  game          String
  questionIndex Int
  isCorrect     Boolean
  elapsedMs     Int
  points        Int
  answeredAt    DateTime @default(now())

  @@index([userId, course])
  @@index([answeredAt])
  @@index([game])
}
```

- [ ] **Step 2: Apply schema to local/cloud Postgres**

```bash
cd "e:/Wewin/Game Trắc Nghiệm/web"
npx prisma migrate dev --name init_mvp
```

Expected: migration folder created; `prisma migrate` exits 0. If DB unreachable, fix `DATABASE_URL` first — do not continue.

- [ ] **Step 3: Commit**

```bash
git add web/prisma
git commit -m "feat(db): add Prisma schema for users, courses, questions, progress, scores"
```

---

### Task 3: Scoring library (TDD)

**Files:**
- Create: `web/lib/scoring.ts`
- Create: `web/lib/scoring.test.ts`
- Create: `web/vitest.config.ts`

- [ ] **Step 1: Add Vitest config**

Create `web/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: { environment: 'node' },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 2: Write failing tests**

Create `web/lib/scoring.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calculatePoints, SCORING } from './scoring';

describe('calculatePoints', () => {
  it('gives CORRECT_MAX when correct and elapsedMs is 0', () => {
    expect(calculatePoints(true, 0)).toBe(SCORING.CORRECT_MAX);
  });

  it('gives CORRECT_MIN when correct and elapsedMs >= TIME_LIMIT_MS', () => {
    expect(calculatePoints(true, SCORING.TIME_LIMIT_MS)).toBe(SCORING.CORRECT_MIN);
  });

  it('gives negative WRONG_MAX magnitude when wrong and very slow', () => {
    expect(calculatePoints(false, SCORING.TIME_LIMIT_MS)).toBe(-SCORING.WRONG_MAX);
  });

  it('gives negative WRONG_MIN magnitude when wrong and elapsedMs is 0', () => {
    expect(calculatePoints(false, 0)).toBe(-SCORING.WRONG_MIN);
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
cd "e:/Wewin/Game Trắc Nghiệm/web"
npm test
```

Expected: FAIL (module `./scoring` not found or exports missing).

- [ ] **Step 4: Implement scoring**

Create `web/lib/scoring.ts`:

```ts
export const SCORING = {
  TIME_LIMIT_MS: 30_000,
  CORRECT_MIN: 50,
  CORRECT_MAX: 200,
  WRONG_MIN: 20,
  WRONG_MAX: 80,
} as const;

/** Port of GAS calculatePoints_ — wrong answers return negative points. */
export function calculatePoints(isCorrect: boolean, elapsedMs: number): number {
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  let speedRatio = 1 - elapsed / SCORING.TIME_LIMIT_MS;
  if (speedRatio < 0) speedRatio = 0;
  if (speedRatio > 1) speedRatio = 1;

  if (isCorrect) {
    return Math.round(
      SCORING.CORRECT_MIN + (SCORING.CORRECT_MAX - SCORING.CORRECT_MIN) * speedRatio
    );
  }
  return -Math.round(
    SCORING.WRONG_MIN + (SCORING.WRONG_MAX - SCORING.WRONG_MIN) * (1 - speedRatio)
  );
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm test
```

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add web/lib/scoring.ts web/lib/scoring.test.ts web/vitest.config.ts web/package.json
git commit -m "feat(scoring): port GAS point calculation with unit tests"
```

---

### Task 4: DB client, session, auth helpers

**Files:**
- Create: `web/lib/db.ts`
- Create: `web/lib/session.ts`
- Create: `web/lib/auth.ts`

- [ ] **Step 1: Prisma singleton**

Create `web/lib/db.ts`:

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 2: Session cookie helpers**

Create `web/lib/session.ts`:

```ts
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'wewin_session';

export type SessionPayload = {
  userId: string;
  username: string;
  displayName: string;
};

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET is missing or too short');
  }
  return new TextEncoder().encode(secret);
}

export async function sealSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey());
}

export async function unsealSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.username !== 'string' ||
      typeof payload.displayName !== 'string'
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      username: payload.username,
      displayName: payload.displayName,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return unsealSession(token);
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await sealSession(payload);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
```

- [ ] **Step 3: Password helpers + requireUser**

Create `web/lib/auth.ts`:

```ts
import bcrypt from 'bcryptjs';
import { getSession, type SessionPayload } from './session';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    const err = new Error('Chưa đăng nhập') as Error & { status: number };
    err.status = 401;
    throw err;
  }
  return session;
}
```

- [ ] **Step 4: Commit**

```bash
git add web/lib/db.ts web/lib/session.ts web/lib/auth.ts
git commit -m "feat(auth): add Prisma client, JWT session cookies, password hashing"
```

---

### Task 5: Auth API routes + middleware

**Files:**
- Create: `web/app/api/auth/login/route.ts`
- Create: `web/app/api/auth/logout/route.ts`
- Create: `web/app/api/auth/me/route.ts`
- Create: `web/middleware.ts`

- [ ] **Step 1: Login route**

Create `web/app/api/auth/login/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { setSessionCookie } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập username và password' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { success: false, message: 'Sai username hoặc password' },
        { status: 401 }
      );
    }

    await setSessionCookie({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
    });

    return NextResponse.json({
      success: true,
      username: user.username,
      name: user.displayName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Logout + me**

Create `web/app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/session';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
```

Create `web/app/api/auth/me/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ loggedIn: false }, { status: 401 });
  }
  return NextResponse.json({
    loggedIn: true,
    username: session.username,
    name: session.displayName,
  });
}
```

- [ ] **Step 3: Middleware**

Create `web/middleware.ts`:

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'wewin_session';

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    // API routes enforce auth themselves where needed
    return NextResponse.next();
  }

  if (!(await hasValidSession(req))) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
```

- [ ] **Step 4: Commit**

```bash
git add web/app/api/auth web/middleware.ts
git commit -m "feat(auth): add login/logout/me API routes and auth middleware"
```

---

### Task 6: Shared UI — tokens, loading, layout, login page

**Files:**
- Create: `web/app/globals.css`
- Modify: `web/app/layout.tsx`
- Create: `web/components/DataLoading.tsx`
- Create: `web/components/Header.tsx`
- Create: `web/features/auth/LoginForm.tsx`
- Create: `web/app/(auth)/login/page.tsx`
- Create: `web/app/(main)/layout.tsx`
- Modify: `web/app/page.tsx` → move home under `(main)` (delete root page or redirect)

- [ ] **Step 1: Globals + layout**

Set `web/app/globals.css` CSS variables from `FRONTEND.md` (`--primary: #0d2b6e`, Nunito, `.data-loading-state`).

Update `web/app/layout.tsx` to `lang="vi"`, load Nunito + Font Awesome 6 CDN, import `globals.css`.

- [ ] **Step 2: DataLoading component**

Create `web/components/DataLoading.tsx`:

```tsx
type Props = {
  variant?: 'loading' | 'message';
  message?: string;
};

export function DataLoading({
  variant = 'loading',
  message = 'đang tải dữ liệu',
}: Props) {
  if (variant === 'loading') {
    return (
      <div className="data-loading-state">
        <i className="fas fa-gear fa-spin" aria-hidden="true" /> {message}
      </div>
    );
  }
  return <div className="data-loading-state">{message}</div>;
}

export const LOADING_TEXT = 'đang tải dữ liệu';
```

- [ ] **Step 3: Login form + page**

`LoginForm` posts to `/api/auth/login`, on success `router.push(next || '/')`.  
`app/(auth)/login/page.tsx` renders brand + form.

- [ ] **Step 4: Main layout with Header**

`Header` shows displayName, link to leaderboard, logout button calling `POST /api/auth/logout`.

- [ ] **Step 5: Temporary home**

`app/(main)/page.tsx` shows “WeWIN” + “Đăng nhập thành công” placeholder until courses task. Delete conflicting `app/page.tsx` or make it `redirect('/')` via moving routes only under groups.

- [ ] **Step 6: Manual verify**

```bash
cd "e:/Wewin/Game Trắc Nghiệm/web"
npm run dev
```

Open `/login` — page renders with WeWIN primary color. Unauthenticated `/` redirects to `/login`. (Seed is Task 7 — do not require login success yet.)

- [ ] **Step 7: Commit**

```bash
git add web/app web/components web/features/auth
git commit -m "feat(ui): add WeWIN layout, loading state, and login page"
```

---

### Task 7: Dev seed script (user + course + grammar questions)

**Files:**
- Create: `web/scripts/seed-dev.ts`

- [ ] **Step 1: Implement seed**

```ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123123', 10);

  const user = await prisma.user.upsert({
    where: { username: 'demo' },
    update: { passwordHash, displayName: 'Học sinh Demo' },
    create: {
      username: 'demo',
      passwordHash,
      displayName: 'Học sinh Demo',
    },
  });

  await prisma.classLevel.upsert({
    where: { className_levelName: { className: 'Lớp 8', levelName: 'Cấp Lớp 8' } },
    update: { active: true },
    create: { className: 'Lớp 8', levelName: 'Cấp Lớp 8', active: true },
  });

  const course = await prisma.course.upsert({
    where: { id: 'seed-course-everyup' },
    update: {
      name: 'EveryUp',
      className: 'Lớp 8',
      levelName: 'Cấp Lớp 8',
      active: true,
    },
    create: {
      id: 'seed-course-everyup',
      name: 'EveryUp',
      className: 'Lớp 8',
      levelName: 'Cấp Lớp 8',
      active: true,
    },
  });

  await prisma.question.deleteMany({ where: { courseId: course.id, game: 'grammar' } });

  await prisma.question.createMany({
    data: [
      {
        courseId: course.id,
        game: 'grammar',
        level: 'Cấp Lớp 8',
        sortOrder: 1,
        payload: {
          source: '',
          prefix: 'She',
          suffix: 'to school every day.',
          hint: 'go / goes',
          answers: ['goes'],
        },
      },
      {
        courseId: course.id,
        game: 'grammar',
        level: 'Cấp Lớp 8',
        sortOrder: 2,
        payload: {
          source: '',
          prefix: 'They',
          suffix: 'football yesterday.',
          hint: 'play / played',
          answers: ['played'],
        },
      },
    ],
  });

  console.log('Seeded user demo / 123123 and course', course.name, 'for', user.username);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Note: seed password `123123` is **dev-only**; production import must use real hashed user passwords from Sheets — never commit production secrets.

- [ ] **Step 2: Run seed**

```bash
cd "e:/Wewin/Game Trắc Nghiệm/web"
npm run db:seed
```

Expected: `Seeded user demo / 123123...`

- [ ] **Step 3: Smoke login with curl**

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"demo\",\"password\":\"123123\"}"
```

Expected: `{"success":true,...}` and `Set-Cookie: wewin_session=...`

- [ ] **Step 4: Commit**

```bash
git add web/scripts/seed-dev.ts
git commit -m "feat(db): add dev seed for demo user, course, and grammar questions"
```

---

### Task 8: Courses API + home / course detail UI

**Files:**
- Create: `web/app/api/courses/route.ts`
- Create: `web/app/api/courses/[id]/route.ts`
- Create: `web/features/courses/CourseFilters.tsx`
- Create: `web/features/courses/CourseList.tsx`
- Modify: `web/app/(main)/page.tsx`
- Create: `web/app/(main)/courses/[id]/page.tsx`

- [ ] **Step 1: List courses API**

`GET /api/courses?className=&levelName=` — requires session; returns `{ success, courses: [{ id, name, className, levelName }] }` and distinct class/level options from `ClassLevel` + `Course`.

- [ ] **Step 2: Course detail API**

`GET /api/courses/[id]` — returns course + per-game question counts (at least `grammar`) + progress statuses for current user (`GameProgress` where `courseKey` = course name or `name|level` matching GAS `progressCourseKey_`).

Define `courseKey` as: `level ? `${courseName}|${level}` : courseName` in `web/lib/courseKey.ts` and use everywhere.

- [ ] **Step 3: Home UI**

Show `DataLoading` while fetching. Filters + course list linking to `/courses/[id]`. Empty: message without gear.

- [ ] **Step 4: Course detail UI**

List games; for MVP only enable **Grammar** link to `/games/grammar/[courseId]`. Other games show “Sắp có” disabled.

- [ ] **Step 5: Verify in browser**

Login as `demo` → see EveryUp → open course detail → Grammar link visible.

- [ ] **Step 6: Commit**

```bash
git add web/app/api/courses web/app/(main) web/features/courses web/lib/courseKey.ts
git commit -m "feat(courses): add course list/detail APIs and home UI"
```

---

### Task 9: Score submit + progress APIs

**Files:**
- Create: `web/app/api/score/submit/route.ts`
- Create: `web/app/api/progress/route.ts`
- Create: `web/features/scoring/submitScore.ts`

- [ ] **Step 1: Score submit**

`POST /api/score/submit` body:

```json
{
  "course": "EveryUp",
  "game": "grammar",
  "questionIndex": 0,
  "isCorrect": true,
  "elapsedMs": 1200
}
```

Implementation:

1. `requireSession()`
2. `points = calculatePoints(isCorrect, elapsedMs)`
3. `prisma.scoreLog.create({ data: { userId, course, game, questionIndex, isCorrect, elapsedMs, points } })`
4. Sum course score for user from ScoreLog
5. Return `{ success, points, isCorrect, courseScore }`

Never accept `userId` / `username` from body.

- [ ] **Step 2: Progress save**

`POST /api/progress` body: `{ courseKey, game, statuses: ("empty"|"correct"|"wrong")[], reset?: boolean }` — upsert `GameProgress`.

- [ ] **Step 3: Client helper**

```ts
export async function submitAnswerScore(
  course: string,
  game: string,
  questionIndex: number,
  isCorrect: boolean,
  elapsedMs: number
) {
  const res = await fetch('/api/score/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course, game, questionIndex, isCorrect, elapsedMs }),
  });
  return res.json();
}
```

- [ ] **Step 4: Manual API test (logged-in cookie)**

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/score/submit ^
  -H "Content-Type: application/json" ^
  -d "{\"course\":\"EveryUp\",\"game\":\"grammar\",\"questionIndex\":0,\"isCorrect\":true,\"elapsedMs\":1000}"
```

Expected: `success: true`, `points` between 50 and 200. Confirm row in DB:

```bash
npx prisma studio
```

- [ ] **Step 5: Commit**

```bash
git add web/app/api/score web/app/api/progress web/features/scoring
git commit -m "feat(scoring): add ScoreLog submit and progress upsert APIs"
```

---

### Task 10: Leaderboard API + UI

**Files:**
- Create: `web/app/api/leaderboard/route.ts`
- Create: `web/features/leaderboard/LeaderboardPanel.tsx`
- Create: `web/app/(main)/leaderboard/page.tsx`
- Create: `web/lib/leaderboard.ts`

- [ ] **Step 1: Aggregate helper**

`getLeaderboard(period: 'day'|'week'|'month'|'all', offset = 0)`:

- Filter `ScoreLog.answeredAt` by Asia/Ho_Chi_Minh period window (port logic from GAS `normalizePeriodKey_` / date bounds — implement day/week/month/all clearly in `lib/leaderboard.ts`).
- Group by `userId`, sum `points`, join `displayName`/`username`.
- Sort desc, return top list.

- [ ] **Step 2: API**

`GET /api/leaderboard?period=week&offset=0` → `{ success, players: [{ username, displayName, points }], period, label }`.

- [ ] **Step 3: UI**

Period tabs; show `DataLoading` while fetch; list ranks.

- [ ] **Step 4: Verify**

After Task 9 submit, open `/leaderboard` — `demo` appears with points.

- [ ] **Step 5: Commit**

```bash
git add web/lib/leaderboard.ts web/app/api/leaderboard web/features/leaderboard web/app/(main)/leaderboard
git commit -m "feat(leaderboard): aggregate ScoreLog by period and add UI"
```

---

### Task 11: Grammar game (end-to-end template)

**Files:**
- Create: `web/app/api/games/grammar/[courseId]/route.ts`
- Create: `web/features/games/grammar/gradeAnswer.ts`
- Create: `web/features/games/grammar/GrammarGame.tsx`
- Create: `web/app/(main)/games/grammar/[courseId]/page.tsx`
- Create: `web/features/games/grammar/gradeAnswer.test.ts`

- [ ] **Step 1: Failing grade test**

```ts
import { describe, expect, it } from 'vitest';
import { gradeGrammarAnswer } from './gradeAnswer';

describe('gradeGrammarAnswer', () => {
  it('matches case-insensitively against answers list', () => {
    expect(gradeGrammarAnswer('Goes', ['goes', 'go'])).toBe(true);
    expect(gradeGrammarAnswer('went', ['goes'])).toBe(false);
  });
});
```

- [ ] **Step 2: Implement grader**

```ts
export function gradeGrammarAnswer(input: string, answers: string[]): boolean {
  const normalized = String(input || '').trim().toLowerCase();
  return answers.some((a) => String(a).trim().toLowerCase() === normalized);
}
```

Run `npm test` — expect PASS.

- [ ] **Step 3: Game data API**

`GET /api/games/grammar/[courseId]` — session required; load active grammar questions ordered by `sortOrder`; load progress; return `{ course: { id, name, levelName }, questions: [{ id, index, prefix, suffix, hint }], statuses }`. **Do not send `answers` to client** if you want stricter anti-cheat later; for MVP parity with GAS (answers often client-side), either:

- **MVP choice (locked):** return `answers` to client like current GAS HTML (simpler port), document that server still trusts `isCorrect` from client for scoring (same trust model as GAS).

- [ ] **Step 4: GrammarGame UI**

- On mount: fetch game data with `DataLoading`.
- Show `prefix ____ suffix`, hint, input, submit.
- Track `questionStartTime = Date.now()` when question shown.
- On submit: grade → `submitAnswerScore(courseName, 'grammar', index, isCorrect, Date.now() - start)` → update local statuses → `POST /api/progress`.
- Next question / finish summary with session points.

- [ ] **Step 5: Page wire-up**

`app/(main)/games/grammar/[courseId]/page.tsx` renders `<GrammarGame courseId={params.courseId} />`.

- [ ] **Step 6: E2E manual verification checklist**

1. Login `demo` / `123123`
2. Open course → Grammar
3. Answer one correct, one wrong
4. Confirm `ScoreLog` has 2 rows; leaderboard points change
5. Refresh game — progress statuses persist

- [ ] **Step 7: Commit**

```bash
git add web/app/api/games web/features/games/grammar web/app/(main)/games
git commit -m "feat(grammar): port grammar game with scoring and progress"
```

---

### Task 12: Sheets import stub (users + courses)

**Files:**
- Create: `web/scripts/import-from-sheets.ts`
- Create: `web/scripts/README-import.md`

- [ ] **Step 1: CSV-first importer**

Implement CLI that reads:

- `scripts/data/users.csv` → columns `username,password,displayName`
- `scripts/data/courses.csv` → columns `className,levelName,name,active`

For each user: `hashPassword(password)` then upsert.  
For each course: upsert by `name+className+levelName`.  
Print counts. Do **not** embed Google API keys in repo; document optional later Sheets API via `GOOGLE_SERVICE_ACCOUNT_JSON`.

- [ ] **Step 2: Sample CSV templates (no real passwords from production)**

Create empty templates with header row only.

- [ ] **Step 3: Commit**

```bash
git add web/scripts
git commit -m "feat(import): add CSV import stub for users and courses"
```

---

### Task 13: MVP verification gate

- [ ] **Step 1: Run automated checks**

```bash
cd "e:/Wewin/Game Trắc Nghiệm/web"
npm test
npm run lint
npm run build
```

Expected: tests pass; build exits 0.

- [ ] **Step 2: Run manual smoke script (document results in PR/notes)**

| Check | Expected |
|-------|----------|
| `/login` | Renders |
| Login demo | Cookie set; redirect home |
| Course list | EveryUp visible |
| Grammar play | ScoreLog rows created |
| `/leaderboard` | demo ranked |
| Unauthenticated `/courses/...` | Redirect login |

- [ ] **Step 3: Update design spec status line to `Implemented MVP (phases 0–3)`** when all checks pass (evidence first).

- [ ] **Step 4: Commit docs touch if any**

```bash
git add docs
git commit -m "docs: mark Next.js migration MVP phases 0-3 verification"
```

---

## Follow-up (NOT in this plan)

Separate plan after MVP: port each remaining game using the grammar pattern (`features/games/<name>`, route, API, `submitAnswerScore` with stable `questionIndex`). Order: quiz → pronunciation → scramble → word_match → look_and_write → starters set.

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Scaffold `web/` + Prisma + env | 1–2 |
| User + bcrypt + session auth | 4–6 |
| ClassLevel / Course | 2, 7–8 |
| ScoreLog append + scoring constants | 3, 9 |
| Leaderboard from ScoreLog | 10 |
| Grammar E2E template | 11 |
| Loading UI rule | 6, 8, 11 |
| Import from Sheets (batch) | 12 (CSV stub) |
| Phase 4+ other games | Explicitly deferred |
| Vitest scoring | 3 |
| Verification before done | 13 |

## Placeholder / consistency notes

- Game key string for grammar is always `'grammar'`.
- Session cookie name always `wewin_session`.
- `courseKey` helper shared for progress.
- ScoreLog has **no** unique constraint (append each attempt).

# Game Lesson PDF Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add administrator-managed PDF page ranges per course game and display them in Study4-style `Bài học` / `Bài tập` tabs inside every game.

**Architecture:** Store each range in a normalized `CourseGameLesson` row that uses the course's current ebook. A shared server loader supplies an optional lesson descriptor to one shared client tab wrapper, while all existing game components and scoring flows remain unchanged. A dedicated admin endpoint upserts or deletes one game mapping at a time.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma 7/PostgreSQL, Vitest, existing `EbookViewer`.

## Global Constraints

- Keep the existing course-level `Bài học` tab.
- Default every mapped game to `Bài tập`.
- Omit the in-game tab bar when no valid mapping exists.
- Use only canonical keys from `GAME_CATALOG`.
- Use `fas fa-gear fa-spin`, `đang tải dữ liệu`, and `data-loading-state` for PDF loading.
- Do not change answer grading, progress, or score submission.

---

### Task 1: Model and validate per-game lesson ranges

**Files:**
- Modify: `web/prisma/schema.prisma`
- Create: `web/prisma/migrations/20260721030000_add_course_game_lessons/migration.sql`
- Create: `web/lib/courseGameLesson.ts`
- Test: `web/lib/courseGameLesson.test.ts`

**Interfaces:**
- Produces: `parseCourseGameLessonRange(value, pageCount)` returning `{ ok: true, value: { pageStart, pageEnd } }` or `{ ok: false, message }`.
- Produces: Prisma `CourseGameLesson` with unique `(courseId, gameKey)`.

- [ ] **Step 1: Write failing validation tests**

Cover positive integer parsing, reversed ranges, known PDF page-count overflow, and a valid inclusive range.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- lib/courseGameLesson.test.ts`

Expected: FAIL because `courseGameLesson.ts` does not exist.

- [ ] **Step 3: Implement the parser and Prisma model**

The parser must reject non-integers and return Vietnamese messages suitable for the admin alert. Add:

```prisma
model CourseGameLesson {
  id        String   @id @default(cuid())
  courseId  String
  course    Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  gameKey   String
  pageStart Int
  pageEnd   Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([courseId, gameKey])
  @@index([courseId])
}
```

Add `gameLessons CourseGameLesson[]` to `Course`. Create SQL for the table, foreign key, unique index, and course index.

- [ ] **Step 4: Verify GREEN and Prisma validity**

Run: `npm test -- lib/courseGameLesson.test.ts`

Run: `npx prisma validate`

Run: `npx prisma generate`

Expected: all commands exit 0.

### Task 2: Add the shared student lesson tabs

**Files:**
- Create: `web/lib/loadCourseGameLesson.ts`
- Create: `web/features/games/GameLessonTabs.tsx`
- Test: `web/features/games/GameLessonTabs.test.tsx`
- Modify: all eleven `web/app/(main)/games/*/[courseId]/page.tsx` files
- Modify: `web/styles/legacy/game-styles.css`

**Interfaces:**
- Produces: `CourseGameLessonDescriptor = { ebookId: string; pageStart: number; pageEnd: number }`.
- Produces: `loadCourseGameLesson(courseId, gameKey): Promise<CourseGameLessonDescriptor | null>`.
- Produces: `<GameLessonTabs lesson={descriptor}>{game}</GameLessonTabs>`.

- [ ] **Step 1: Write failing render tests**

Use `renderToStaticMarkup` against an exported pure `GameLessonTabsContent`:

- no lesson renders children without the tab bar;
- mapped lesson defaults to active `Bài tập`;
- `initialTab="lesson"` renders `EbookViewer` and marks `Bài học` active.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- features/games/GameLessonTabs.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the wrapper and server loader**

The loader must return `null` for missing, archived, disabled, or inactive-PDF courses. The client wrapper owns tab state; the pure content component accepts `activeTab`/`initialTab` for deterministic tests and reuses `EbookViewer`.

- [ ] **Step 4: Wrap every game route**

Each page loads the matching canonical game key and wraps its existing game:

```tsx
const lesson = await loadCourseGameLesson(courseId, 'grammar');
return (
  <GameLessonTabs lesson={lesson}>
    <GrammarGame courseId={courseId} />
  </GameLessonTabs>
);
```

Repeat with the exact key for all eleven catalog games.

- [ ] **Step 5: Add responsive tab styling and verify GREEN**

Keep the game width behavior unchanged under the exercise tab. Give the lesson panel the existing ebook viewer's full responsive width.

Run: `npm test -- features/games/GameLessonTabs.test.tsx`

Expected: PASS.

### Task 3: Add the administrator mapping API

**Files:**
- Create: `web/app/api/admin/courses/[id]/game-lessons/[gameKey]/route.ts`
- Modify: `web/app/api/admin/courses/[id]/route.ts`
- Test: `web/lib/courseGameLesson.test.ts`

**Interfaces:**
- `PUT` consumes `{ pageStart: unknown, pageEnd: unknown }`.
- `DELETE` removes the selected `(courseId, gameKey)` mapping idempotently.
- Course admin `GET` returns `course.gameLessons`.

- [ ] **Step 1: Extend failing tests for canonical game-key validation**

Add tests for `isCourseGameKey(value)` accepting `grammar` and rejecting unknown keys.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- lib/courseGameLesson.test.ts`

Expected: FAIL because the exported validator is missing.

- [ ] **Step 3: Implement PUT and DELETE**

Require admin access. PUT verifies the course is not archived, verifies a current active ebook, validates against `Ebook.pageCount`, and calls Prisma `upsert` on `courseId_gameKey`. DELETE uses `deleteMany` so repeated removal succeeds.

- [ ] **Step 4: Return mappings from the admin course GET**

Load `gameLessons` ordered by `gameKey` without changing question counts or visibility behavior.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- lib/courseGameLesson.test.ts`

Expected: PASS.

### Task 4: Add per-game PDF controls to course administration

**Files:**
- Modify: `web/features/admin/CourseDetailAdmin.tsx`
- Modify: `web/styles/legacy/admin.css`
- Test: `web/features/admin/CourseGameLessonEditor.test.tsx`
- Create: `web/features/admin/CourseGameLessonEditor.tsx`

**Interfaces:**
- Produces a focused controlled row editor receiving `game`, `ebookAvailable`, `value`, `busy`, `onChange`, `onSave`, and `onRemove`.
- `CourseDetailAdmin` initializes values from `course.gameLessons` and calls the dedicated PUT/DELETE endpoint.

- [ ] **Step 1: Write failing static-render tests**

Verify populated page inputs, disabled controls when no course PDF exists, and the remove action only when a mapping exists.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- features/admin/CourseGameLessonEditor.test.tsx`

Expected: FAIL because the editor does not exist.

- [ ] **Step 3: Implement the controlled editor and integration**

Add a `Bài học PDF` column to each game row. Save updates only that game; remove clears only that mapping. Preserve entered values after network errors and use the existing global success/error alerts.

- [ ] **Step 4: Add responsive admin styles**

Desktop rows display game, question count, visibility, page range, and actions. Tablet/mobile rows stack the page-range editor below the game information without horizontal overflow.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- features/admin/CourseGameLessonEditor.test.tsx`

Expected: PASS.

### Task 5: Full verification

**Files:**
- Review all files changed in Tasks 1–4.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
npm test -- lib/courseGameLesson.test.ts features/games/GameLessonTabs.test.tsx features/admin/CourseGameLessonEditor.test.tsx
```

Expected: all focused tests pass.

- [ ] **Step 2: Run full checks**

Run: `npm test`

Run: `npm run lint`

Run: `npm run build`

Expected: all exit 0 without new warnings or errors.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff --check`

Confirm unrelated SSO changes are untouched and no generated `.next` artifacts are staged.

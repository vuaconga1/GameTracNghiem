# Game Lesson PDF Tabs Design

## Goal

Allow each enabled course game to expose a Study4-style `Bài học` / `Bài tập` tab pair. `Bài học` displays an administrator-selected page range from the course PDF; `Bài tập` preserves the existing game.

The existing course-level `Bài học` tab remains available.

## Student Experience

- Opening any game continues to use its existing `/games/<slug>/<courseId>` URL.
- When that course/game has a PDF page mapping, the screen shows two tabs:
  - `Bài học`: the existing `EbookViewer`, limited to the mapped page range.
  - `Bài tập`: the existing game UI and scoring flow.
- `Bài tập` is the default tab so current navigation behavior remains unchanged.
- When no mapping exists, the tab bar is omitted and the game renders exactly as it does today.
- Loading PDF pages uses the shared `data-loading-state` presentation with `fas fa-gear fa-spin` and `đang tải dữ liệu`.

## Administration

The course administration page keeps its current course-level PDF controls. Each game row gains page-start and page-end inputs plus a save/remove action.

- A per-game mapping can only be saved when the course has an active PDF.
- Both page values are positive integers and `pageEnd >= pageStart`.
- If the PDF has a known page count, both values must be within that count.
- Clearing/removing a mapping hides the student `Bài học` game tab.
- Disabling a game does not delete its mapping, so re-enabling it restores the prior lesson range.

## Data Model

Add a normalized `CourseGameLesson` model:

- `id`: generated primary key.
- `courseId`: relation to `Course`, cascading on course deletion.
- `gameKey`: canonical key from `GAME_CATALOG`.
- `pageStart`, `pageEnd`: inclusive PDF page range.
- `createdAt`, `updatedAt`: audit timestamps.
- Unique constraint on `(courseId, gameKey)`.

The mapping uses the current `Course.ebookFileId`; it does not duplicate the ebook ID. Changing the course PDF therefore changes the source PDF for both the course lesson and all game lesson ranges.

## Architecture and Data Flow

1. A server helper loads the active course, verifies the game is enabled, and returns an optional `{ ebookId, pageStart, pageEnd }` lesson descriptor.
2. Every game route page wraps its existing game component in one shared `GameLessonTabs` client component.
3. The wrapper receives the lesson descriptor from the server. It renders no tabs when the descriptor is absent.
4. The admin course API returns existing game mappings and accepts a validated per-game upsert or delete through a dedicated route.
5. `CourseDetailAdmin` edits each game mapping without changing question content or game visibility APIs.

This boundary keeps PDF behavior independent from all eleven game implementations and leaves answer scoring unchanged.

## Errors and Edge Cases

- Invalid game keys return HTTP 400.
- Missing or archived courses return HTTP 404.
- Missing/inactive course PDFs or invalid page ranges return HTTP 400.
- Admin save failures retain the current form values and show the existing admin error alert.
- A stale mapping without a usable PDF is treated as absent for students.
- Existing courses require no backfill; no rows means no in-game lesson tabs.

## Testing

- Unit-test page-range validation and mapping normalization.
- Test the shared tabs component with and without a lesson mapping, including tab switching.
- Test admin controls for save/remove payloads and visible mapping state.
- Test the admin route for authorization, invalid ranges, upsert, and deletion.
- Run Prisma validation/generation, the focused Vitest tests, the full test suite, ESLint on changed files, and a production build.

## Out of Scope

- Automatic recognition of grammar/vocabulary pages from PDF text.
- Different PDF files per game.
- Per-question PDF mappings.
- Removing the existing course-level lesson tab.

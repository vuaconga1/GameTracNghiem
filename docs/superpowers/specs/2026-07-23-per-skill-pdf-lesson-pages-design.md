# Per-skill PDF lesson pages (unit ebook)

**Date:** 2026-07-23  
**Status:** Implemented  
**App:** `.worktrees/nextjs-migration/web`  
**Related:** `2026-07-23-unit-skill-cards-design.md` (student skill cards; lesson tab previously unchanged)

## Goal

Each skill (nghe / đọc / nói / viết / từ vựng) shows its own page range of the **same unit PDF**, instead of always showing the full unit ebook (e.g. `1 / 5`).

## Decisions

| Topic | Choice |
|--------|--------|
| Storage | Table `CourseSkillLesson` mirroring `CourseGameLesson` (`courseId` + `skillId` unique, `pageStart`/`pageEnd`) |
| PDF file | Same `Course.ebookFileId` as the unit; only page ranges differ |
| Skills | `listening`, `reading`, `speaking`, `writing`, `vocabulary` |
| With `?skill=` | Restrict viewer to that skill’s mapping |
| Without skill (unit root) | Full unit ebook range (`Course.ebookPageStart` / `ebookPageEnd`) |
| Unset skill mapping | **Do not** invent pages or fall back to full PDF — show “Chưa gán trang bài học cho kỹ năng này” |
| Migration / backfill | No silent page mapping; leave empty until admin configures |

## Schema

```prisma
model CourseSkillLesson {
  id        String   @id @default(cuid())
  courseId  String
  skillId   String   // listening | reading | speaking | writing | vocabulary
  pageStart Int
  pageEnd   Int
  // unique(courseId, skillId)
}
```

## Student flow

1. `/courses/[id]` → tab **Bài học** → unit ebook range (unchanged default).
2. `/courses/[id]?skill=listening` → tab **Bài học** keeps `?skill=` (tabs are client-only; URL unchanged) → only listening pages.
3. Skill selected but no `CourseSkillLesson` row → empty message (not full 5 pages).

## Admin how-to

1. Open **Admin → khóa học → chi tiết**.
2. Under **Bài học (PDF)**: pick the ebook + optional unit default page range; save.
3. Under **Trang bài học theo kỹ năng**: for each skill set **Trang từ – Trang đến** (same number for a single page); **Lưu** / **Gỡ**.
4. Requires an active ebook on the course (same rule as game lessons).

## API

- `PUT /api/admin/courses/[id]/skill-lessons/[skillId]` — upsert `{ pageStart, pageEnd }`
- `DELETE /api/admin/courses/[id]/skill-lessons/[skillId]` — remove mapping
- Admin `GET /api/admin/courses/[id]` includes `skillLessons[]`
- Student `loadCourseDetail` / `GET /api/courses/[id]` returns `skillLessons` map

## Resolve helper

`resolveCourseEbookPagesForSkill({ skillId, unitEbook, skillLessons })` →

- `missing-ebook` | `unit` | `skill` | `missing-skill-lesson`

## Out of scope

- Changing per-game `CourseGameLesson` (in-game Bài học tabs)
- Auto-splitting a 5-page PDF into five skills

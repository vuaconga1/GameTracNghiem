# Unit → skill cards → games + admin config

**Date:** 2026-07-23  
**Status:** Approved (product owner)  
**App:** `.worktrees/nextjs-migration/web`  
**Supersedes (student visibility):** `2026-07-14-course-game-visibility-design.md` (`enabledGames` / “Hiện với HS”)

## Goal

On each unit (Course), students pick a skill (Nghe / Đọc / Nói / Viết / Từ vựng), then see only games assigned to that skill. Admins configure per-unit skill↔game mapping and which skills are enabled.

## Decisions

| Topic | Choice |
|--------|--------|
| Scope of mapping | **Per-unit** (`Course`), not global |
| Exclusivity | Each game belongs to **at most one** skill (or hidden), **except `quiz`** which may be assigned to **multiple** skills — see `2026-07-23-quiz-skill-type-exercise-nav-design.md` |
| Student visibility | Game visible iff assigned to a skill **and** that skill is enabled (`quiz` visible under each assigned+enabled skill) |
| Skill cards | Always show **5** cards; hide a card only when that skill is disabled (`enabledSkills`) |
| Empty skill | Card still shows; inside may show empty / no-exercises message |
| Lesson tab | Unchanged for **unit root**; with `?skill=` uses per-skill PDF ranges — see `2026-07-23-per-skill-pdf-lesson-pages-design.md` |
| Old `enabledGames` | Stop using for student/admin visibility UI; keep column temporarily; **derive on write** from assigned+enabled skills for any remaining readers |

## Data model (`Course`)

- `gameSkills` `Json?` — map `Record<gameKey, SkillId | SkillId[] | null>`  
  - Omit key or `null` = hidden  
  - Scalar `SkillId` for exclusive games; `quiz` may be `SkillId[]` when multi-assigned  
  - Readers normalize scalar ↔ array via `skillsForGame`
- `enabledSkills` `String[]` — skill ids that are ON  
  - Default / empty / null at read time → all five: `listening`, `reading`, `speaking`, `writing`, `vocabulary`

## Migration seed (convention)

Map currently-visible games → skills. Unassigned / previously hidden → `null` / omit.

| Skill | Default game keys |
|--------|-------------------|
| listening (nghe) | *(none — leave empty; do not put pronunciation here)* |
| reading (đọc) | `read_and_complete`, `read_and_match`, `vocabulary_check`, `choose_and_circle`, `word_match`, `vocabulary_test` |
| speaking (nói) | `pronunciation` |
| writing (viết) | `look_and_write`, `grammar`, `scramble` |
| vocabulary (từ vựng) | `quiz` (default; may also be multi-assigned to other skills in admin) |

Rules:

1. If course had **non-empty** `enabledGames`, only those keys get a skill; others stay hidden.
2. If `enabledGames` was **empty** (historically = all visible), assign **all** catalog games per the table above.
3. Every migrated course gets `enabledSkills` = all five skill ids.
4. Follow-up: if `quiz` was previously assigned to `reading`, reassign to `vocabulary` (exclusive).

## Student flow

1. Enter unit → tab **Bài tập** shows 5 skill cards (labels: “Luyện kỹ năng nghe/đọc/nói/viết” + “Luyện từ vựng”), filtered by `enabledSkills`.
2. Click skill → game grid filtered to that skill.
3. Back from game grid → skill cards (not home / course list).
4. URLs:
   - `/courses/[id]` — skill cards
   - `/courses/[id]?skill=listening|reading|speaking|writing|vocabulary` — games for that skill
5. Tab **Bài học**: unit root → unit ebook range; with `?skill=` → that skill’s page range (see per-skill PDF lesson spec).

## Admin flow

- Remove “Hiện với HS” checkbox.
- Per game: select **Ẩn | Nghe | Đọc | Nói | Viết | Từ vựng** (exclusive for non-quiz). **Trắc nghiệm (`quiz`)**: multi-select checkboxes.
- Five toggles to enable/disable each skill card for students.
- Save via existing `PATCH /api/admin/courses/[id]` with `gameSkills` / `enabledSkills` (and derived `enabledGames`).

## API

- Student `GET /api/courses/[id]` (and `loadCourseDetail`): return `gameSkills`, `enabledSkills`, and derived visible `enabledGames` for compatibility.
- Admin `GET|PATCH /api/admin/courses/[id]`: read/write `gameSkills`, `enabledSkills`; validate catalog keys + skill ids; enforce exclusivity on normalize for non-quiz games (`quiz` may be multi); sync `enabledGames` on write.

## Resolve helpers (shared)

Given a course:

- Which skills are visible to students (`enabledSkills`)
- Which games belong to a skill and are student-visible
- Whether a game route is playable (assigned + skill enabled)
- Normalize PATCH input (valid keys, exclusive assignment)

## Out of scope

- Changing scoring / `submitAnswerScore` / leaderboard
- Legacy GAS HTML / `Code.gs`
- Global (cross-course) skill catalog overrides

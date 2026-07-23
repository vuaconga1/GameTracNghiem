# Quiz: skill → type → exercise → question list

**Date:** 2026-07-23  
**Status:** Approved (product owner)  
**App:** `.worktrees/nextjs-migration/web`  
**Related:** `2026-07-23-unit-skill-cards-design.md`

## Goal

Reuse a single `quiz` game under multiple skills. Students pick **type** then **exercise**, then the existing question-list + play flow, filtered to that skill+type+exercise.

## Student flow

1. Unit skill card → game list (unchanged)
2. Click **Trắc nghiệm** (`quiz`) with `?skill=` → **3 type cards**: Trắc nghiệm / Điền từ / Từ loại (hide empty)
3. Click type → **Exercise cards** grouped by question `exercise` (empty → `"Khác"`; hide empty)
4. Click exercise → existing question list (stats + list + “Bắt đầu làm bài”)
5. Play as today; scoring uses original full-course `question.index`

### URLs

| Step | Query |
|------|--------|
| Type picker | `/games/quiz/[courseId]?skill=vocabulary` |
| Exercise picker | `?skill=&type=multiple_choice\|fill_blank\|word_form` |
| Question list | `?skill=&type=&exercise=Exercise%202` |

Missing `skill` → redirect to `/courses/[courseId]`. Back goes up one level: list → exercises → types → course skill games.

## Data model

- Game key stays `quiz`.
- Question payload adds:
  - `skill`: `listening|reading|speaking|writing|vocabulary` (default legacy: `vocabulary`)
  - `exercise`: string (trim; empty → group label `Khác`)
- Existing `type`: `multiple_choice` | `fill_blank` | `word_form`

## Multi-skill `gameSkills`

- `gameSkills[gameKey] = SkillId | SkillId[] | null`
- **`quiz` only** may be multi-assigned; other games stay exclusive (max one).
- Readers normalize via `skillsForGame` / `gameAssignedToSkill`.
- Scalar `quiz: 'vocabulary'` remains valid (no forced DB rewrite).

## Admin

- Question editor / sheet: **Kỹ năng** + **Exercise**
- Course detail: quiz uses skill checkboxes; other games keep single select

## Out of scope

- Changing scoring formula / leaderboard aggregation
- GAS / legacy HTML

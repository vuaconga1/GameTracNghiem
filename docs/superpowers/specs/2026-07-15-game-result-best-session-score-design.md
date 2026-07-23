# Game result UI + best play-session score

**Date:** 2026-07-15  
**Status:** Approved for implementation  
**App:** `.worktrees/nextjs-migration/web`

## Goal

1. Redesign list-complete + «Hoàn thành!» panels: darker colors, clearer layout.
2. Show **tổng điểm** = điểm của **lần chơi điểm cao nhất** (not lifetime sum).
3. Apply consistently to all games with list/result panels.

## Play session (option A)

- One session starts on «Bắt đầu làm bài» (if none) or «Làm lại từ đầu».
- Persist `GameProgress.playSessionId`; write `ScoreLog.playSessionId` on each score submit.
- Reload mid-run reuses the same `playSessionId`.
- «Làm lại từ đầu» resets statuses and creates a new UUID session (ScoreLog history kept).

## `gameScore`

`MAX(SUM(points) GROUP BY playSessionId)` for `userId + scoreLookupCourseKeys + game`.  
Rows with `playSessionId = null` form one legacy session.

Leaderboard total-across-all-logs is unchanged.

## API

- Every game `GET` returns `gameScore` + `playSessionId`.
- `POST /api/progress` accepts/returns `playSessionId`; on `reset` assigns a new id if not provided.
- `POST /api/score/submit` accepts `playSessionId`, returns `gameScore` (best session) + `points`.

## UI

- Shared darker CSS for `.stat-item` / `.q-list-item` status colors and `.result-panel`.
- Score hero above list stats: large `gameScore` + label «Tổng điểm cao nhất».
- Result panel: large score + correct/wrong summary + actions.

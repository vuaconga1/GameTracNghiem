# Design: Legacy HTML UI Parity on Next.js (Scope A)

**Date:** 2026-07-12  
**Status:** Implemented — verified by Scope A gate (`npm test`, `npm run lint`, `npm run build`, structural UI markers)  
**Branch / worktree:** `feature/nextjs-migration` → `.worktrees/nextjs-migration`  
**Depends on:** Next.js MVP (phases 0–3) already implemented

## 1. Goal

Make the existing Next.js pages look and feel **~100% like the legacy GAS HTML** for the surfaces already wired to APIs: app shell, login, home/courses, course detail, leaderboard, and grammar game — by porting legacy CSS and rebuilding React markup to use the same class names and DOM structure.

## 2. Decisions (locked)

| Topic | Choice |
|-------|--------|
| Scope | **A** — shell + home, login, course detail, leaderboard, grammar only; other games later |
| CSS strategy | **A** — port `GameStyles.html` + inline CSS from `index.html` / `grammar.html` into Next styles |
| Implementation approach | Port CSS + rebuild React markup with legacy class names; keep Next routes and APIs |
| Login UX | Keep `/login` route; style as `.login-overlay` + `.login-modal` |
| Ebook | Port **chrome** (`.ebook-viewer` toolbar/empty states); full PDF render deferred |
| Rank badge | Show UI; value may be `--` / hidden until rank API exists |
| Data / scoring | Do not change schema or `submitAnswerScore` semantics |
| Loading | Keep workspace rule: `fa-gear fa-spin` + `đang tải dữ liệu` |

## 3. Out of scope

- Visual port of quiz, pronunciation, scramble, word_match, look_and_write, starters games
- Full PDF ebook rendering / Drive proxy
- Pixel-perfect browser matrix beyond desktop + existing mobile breakpoints in legacy CSS
- Rewriting APIs or Prisma models for UI-only needs (except optional display fields later)

## 4. Architecture

```
Legacy CSS (GameStyles + index/grammar inline)
        ↓ port
web/styles/legacy/*.css  →  imported from app/layout.tsx
        ↓
React components using legacy class names
        ↓
Existing Route Handlers / session / ScoreLog (unchanged)
```

### Target style files

| File | Source |
|------|--------|
| `web/styles/legacy/game-styles.css` | `GameStyles.html` (strip `<style>` wrappers) |
| `web/styles/legacy/index-shell.css` | Inline CSS block from `index.html` |
| `web/styles/legacy/grammar-extras.css` | Grammar-only rules not covered by GameStyles (if any remain) |
| `web/app/globals.css` | Thin entry: import legacy sheets + any Next resets that do not fight tokens |

### Target shell components

| Component | Responsibility |
|-----------|----------------|
| `components/shell/AppShell.tsx` | `.page-shell` > `.app` > sidebar + main + footer |
| `components/shell/Sidebar.tsx` | Logo, filters (home) or `nav-item` (game), version |
| `components/shell/AppHeader.tsx` | Mobile menu, user, badge-rank, leaderboard, logout |
| `components/shell/SiteFooter.tsx` | `.site-footer` brand / contact / copy |
| `components/DataLoading.tsx` | Keep; ensure class `.data-loading-state` matches legacy |

Tailwind may remain installed but **must not** drive shell/page layout for these surfaces.

## 5. Page parity map

| Next route | Legacy reference | Must match |
|------------|------------------|------------|
| `/login` | `#loginOverlay` / `.login-modal` | Overlay + modal fields/submit |
| `/` | `#view-courses` | Sidebar `.filter-item` chips, `.courses-header`, `.course-grid` / `.course-card` |
| `/courses/[id]` | `#view-detail` | `.book-card`, `.detail-tabs`, `.activity-card` grid; ebook chrome stub on “Bài học” |
| `/leaderboard` | `#view-leaderboard` | `.period-toggle`, `.lb-podium`, `.lb-list` / `.lb-row`, `.lb-sticky` |
| `/games/grammar/[courseId]` | `grammar.html` | Game sidebar, list → question → result, `.rewrite-row`, `.game-meta` score/progress |

Activity cards for non-grammar games: **visual** parity with disabled / “Sắp có” state; Grammar remains the only live link.

## 6. Implementation phases

| Phase | Deliverable |
|-------|-------------|
| U1 | Port legacy CSS into `web/styles/legacy/*`; wire imports; align tokens |
| U2 | AppShell + login modal styling |
| U3 | Home filters + course cards |
| U4 | Course detail (book-card, tabs, activities, ebook chrome stub) |
| U5 | Leaderboard podium + list + sticky |
| U6 | Grammar list → question → result + score bar |
| U7 | Visual check vs HTML + `npm test` / `npm run build` |

## 7. Testing & verification

- Automated: existing Vitest suite still passes; build succeeds.
- Manual: side-by-side with legacy `index.html` / `grammar.html` for layout, colors, key components.
- Smoke: `demo` / `123123` → home → course → grammar answer → leaderboard still works.
- Loading states must keep gear spinner rule; empty/error without gear.

## 8. Success criteria

- Shared shell (sidebar / header / footer) matches legacy structure and classes.
- Home, detail, leaderboard, grammar visually match legacy counterparts for Scope A.
- No regression to auth, scoring, or progress APIs.
- Other games remain deferred without breaking activity-grid layout.

## 9. Non-goals / exclusions

- 100% parity for games not yet on Next
- Live Sheets CSS sync
- Changing WeWIN brand outside legacy source CSS

# Legacy HTML UI Parity (Scope A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the existing Next.js MVP pages so shell, login, home, course detail, leaderboard, and grammar match the legacy GAS HTML (~100% visual parity) by porting legacy CSS and rebuilding markup with the same class names.

**Architecture:** Extract CSS from `GameStyles.html` + `index.html` into `web/styles/legacy/*`. Replace Tailwind-driven layouts with React components that emit legacy DOM classes (`.page-shell`, `.sidebar`, `.course-card`, `.lb-podium`, `.rewrite-row`, …). Keep all existing APIs, session auth, and scoring logic unchanged.

**Tech Stack:** Next.js 15 App Router, React, ported legacy CSS, Font Awesome 6, Nunito (already loaded).

**Spec:** `docs/superpowers/specs/2026-07-12-legacy-ui-parity-design.md`  
**Worktree:** `E:/Wewin/Game Trắc Nghiệm/.worktrees/nextjs-migration`

---

## File map

| Path | Responsibility |
|------|----------------|
| `web/styles/legacy/game-styles.css` | Port of `GameStyles.html` |
| `web/styles/legacy/index-shell.css` | Port of inline `<style>` from `index.html` |
| `web/app/globals.css` | Import legacy sheets; remove conflicting Tailwind-first page styles |
| `web/public/wewinlogo.png` | Copy from repo root logo |
| `web/components/shell/AppShell.tsx` | `.page-shell` / `.app` / backdrop / main / footer slot |
| `web/components/shell/Sidebar.tsx` | Logo, filters slot or game nav, version |
| `web/components/shell/AppHeader.tsx` | Mobile menu, user, rank badge, leaderboard, logout |
| `web/components/shell/SiteFooter.tsx` | `.site-footer` |
| `web/components/shell/SidebarContext.tsx` | Mobile sidebar open/close |
| `web/components/DataLoading.tsx` | Keep API; ensure classes match legacy |
| `web/app/layout.tsx` | Import globals; keep fonts/FA |
| `web/app/(main)/layout.tsx` | Use AppShell + home sidebar filters vs game sidebar |
| `web/app/(auth)/login/page.tsx` | `.login-overlay` + `.login-modal` |
| `web/features/auth/LoginForm.tsx` | Legacy field/button classes |
| `web/features/courses/CourseFilters.tsx` | Render `.filter-item` chips (not `<select>`) |
| `web/features/courses/CourseList.tsx` | `.course-grid` / `.course-card` |
| `web/app/(main)/page.tsx` | Courses header + list inside content |
| `web/app/(main)/courses/[id]/page.tsx` | Detail book-card / tabs / activities / ebook stub |
| `web/features/leaderboard/LeaderboardPanel.tsx` | Podium + list + sticky |
| `web/features/games/grammar/GrammarGame.tsx` | List → question → result chrome |
| `web/components/Header.tsx` | Delete after AppHeader replaces it (or re-export) |

---

### Task 1: Port legacy CSS + logo asset

**Files:**
- Create: `web/styles/legacy/game-styles.css`
- Create: `web/styles/legacy/index-shell.css`
- Modify: `web/app/globals.css`
- Create: `web/public/wewinlogo.png` (copy)

- [ ] **Step 1: Extract GameStyles**

From worktree root:

```powershell
cd "E:/Wewin/Game Trắc Nghiệm/.worktrees/nextjs-migration"
New-Item -ItemType Directory -Force -Path web/styles/legacy | Out-Null
# GameStyles.html is raw CSS (no <style> wrapper in this repo)
Copy-Item GameStyles.html web/styles/legacy/game-styles.css -Force
```

Expected: `web/styles/legacy/game-styles.css` starts with `:root {` and contains `.page-shell`, `.sidebar`, `.game-page`.

- [ ] **Step 2: Extract index.html inline CSS**

```powershell
cd "E:/Wewin/Game Trắc Nghiệm/.worktrees/nextjs-migration"
$lines = Get-Content index.html
$start = ($lines | Select-String -Pattern '<style>' | Select-Object -First 1).LineNumber
$end = ($lines | Select-String -Pattern '</style>' | Select-Object -First 1).LineNumber
$css = $lines[($start)..($end-2)] -join "`n"
# Remove rules that only fight Next (html font imports already in layout) if duplicated
Set-Content -Path web/styles/legacy/index-shell.css -Value $css -Encoding utf8
```

Expected: file contains `.course-card`, `.login-overlay`, `.lb-podium`, `.site-footer`, `.filter-item`.

- [ ] **Step 3: Copy logo**

```powershell
Copy-Item "E:/Wewin/Game Trắc Nghiệm/.worktrees/nextjs-migration/wewinlogo.png" `
  "E:/Wewin/Game Trắc Nghiệm/.worktrees/nextjs-migration/web/public/wewinlogo.png" -Force
```

- [ ] **Step 4: Wire globals**

Replace `web/app/globals.css` content with:

```css
@import "../styles/legacy/game-styles.css";
@import "../styles/legacy/index-shell.css";

/* Next-only: avoid double margin on body from leftover utilities */
html,
body {
  max-width: 100%;
}
```

Remove previous Tailwind `@import "tailwindcss"` **or** keep Tailwind import **after** legacy only if build requires it — prefer **removing** Tailwind from globals so legacy tokens win (`--bg-page: #f8fafc` from GameStyles). If `postcss` fails without Tailwind, leave postcss config but do not `@import "tailwindcss"` in globals.

- [ ] **Step 5: Smoke build CSS**

```bash
cd "E:/Wewin/Game Trắc Nghiệm/.worktrees/nextjs-migration/web"
npm run build
```

Expected: exit 0 (pages may still look wrong — OK).

- [ ] **Step 6: Commit**

```bash
cd "E:/Wewin/Game Trắc Nghiệm/.worktrees/nextjs-migration"
git add web/styles/legacy web/app/globals.css web/public/wewinlogo.png
git commit -m "feat(ui): port legacy GameStyles and index CSS into Next"
```

---

### Task 2: App shell (sidebar, header, footer, mobile)

**Files:**
- Create: `web/components/shell/SidebarContext.tsx`
- Create: `web/components/shell/Sidebar.tsx`
- Create: `web/components/shell/AppHeader.tsx`
- Create: `web/components/shell/SiteFooter.tsx`
- Create: `web/components/shell/AppShell.tsx`
- Modify: `web/app/(main)/layout.tsx`
- Delete or stop using: `web/components/Header.tsx`

- [ ] **Step 1: Sidebar context**

Create `web/components/shell/SidebarContext.tsx`:

```tsx
'use client';

import { createContext, useContext, useMemo, useState } from 'react';

type SidebarContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(
    () => ({ open, setOpen, toggle: () => setOpen((o) => !o) }),
    [open]
  );
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
```

- [ ] **Step 2: Sidebar + Header + Footer**

`Sidebar.tsx` props:

```tsx
type SidebarProps = {
  mode: 'home' | 'game';
  filtersSlot?: React.ReactNode;
  gameNav?: React.ReactNode; // e.g. links Trang chủ / Ngữ pháp
};
```

Markup must include:

```html
<aside class="sidebar">
  <div class="sidebar-logo"><img src="/wewinlogo.png" alt="WeWIN" /></div>
  <!-- home: <div class="sidebar-filters filters">...<div class="filter-grid"> -->
  <!-- game: <nav class="sidebar-nav">...</nav> -->
  <div class="sidebar-version">Version: 2.3.219</div>
</aside>
```

`AppHeader.tsx` (client): classes `header`, `header-left`, `mobile-menu-btn`, `header-title`, `badge-rank`, `header-actions`, `action-item`, `action-item-logout`. Logout → `POST /api/auth/logout` → `/login`. Rank badge text: `—` for now.

`SiteFooter.tsx`: port structure from `index.html` `.site-footer` (brand, contact grid, copy). Keep static WeWIN text/links from legacy HTML.

- [ ] **Step 3: AppShell**

```tsx
'use client';

export function AppShell({
  sidebar,
  header,
  children,
}: {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const { open, setOpen } = useSidebar();
  return (
    <div className="page-shell">
      <div className={`app${open ? ' sidebar-open' : ''}`} id="appShell">
        <div
          className={`sidebar-backdrop${open ? '' : ' hidden'}`}
          onClick={() => setOpen(false)}
          aria-hidden={!open}
        />
        {sidebar}
        <main className="main">
          {header}
          <div className="content">
            <div className="content-inner">{children}</div>
          </div>
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 4: Wire `(main)/layout.tsx`**

```tsx
import { requireSession } from '@/lib/auth';
import { SidebarProvider } from '@/components/shell/SidebarContext';
import { AppShell } from '@/components/shell/AppShell';
import { Sidebar } from '@/components/shell/Sidebar';
import { AppHeader } from '@/components/shell/AppHeader';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <SidebarProvider>
      <AppShell
        sidebar={<Sidebar mode="home" />}
        header={<AppHeader displayName={session.displayName} />}
      >
        {children}
      </AppShell>
    </SidebarProvider>
  );
}
```

Note: grammar route will override sidebar mode in Task 6 via a nested layout `app/(main)/games/grammar/[courseId]/layout.tsx` with `mode="game"`.

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add web/components/shell web/app/(main)/layout.tsx
git add -u web/components/Header.tsx
git commit -m "feat(ui): add legacy AppShell with sidebar, header, and footer"
```

---

### Task 3: Login modal styling

**Files:**
- Modify: `web/app/(auth)/login/page.tsx`
- Modify: `web/features/auth/LoginForm.tsx`

- [ ] **Step 1: Login page markup**

```tsx
export default function LoginPage() {
  return (
    <div className="login-overlay" id="loginOverlay" style={{ display: 'flex' }}>
      <div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="loginTitle">
        <h2 id="loginTitle" className="login-title">Đăng nhập</h2>
        <LoginForm />
      </div>
    </div>
  );
}
```

Do **not** wrap login in AppShell (auth layout stays minimal). Optional: full-page `.page-shell` background only.

- [ ] **Step 2: LoginForm fields**

Use classes: `login-field`, `login-submit`, error text as in legacy. Keep `fetch('/api/auth/login')` behavior and `next` query redirect.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(ui): style login page as legacy login modal"
```

---

### Task 4: Home — filter chips + course cards

**Files:**
- Modify: `web/features/courses/CourseFilters.tsx`
- Modify: `web/features/courses/CourseList.tsx`
- Modify: `web/app/(main)/page.tsx`
- Modify: `web/app/(main)/layout.tsx` (pass filters into Sidebar via client bridge)

**Pattern for filters in sidebar:** Create client wrapper `web/features/courses/HomeCoursesView.tsx` that owns filter state + course fetch, and renders:

1. Filters into a portal/slot — simplest MVP: put filters **inside** the page content header **and** duplicate into sidebar by restructuring layout:

**Preferred approach (locked):** Change `(main)/page.tsx` to a client `HomeCoursesView` that includes both sidebar filters **and** grid by making layout accept children only, and use a dedicated home layout:

Create `web/app/(main)/(home)/layout.tsx` is optional complexity.

**Simpler locked approach:** Keep sidebar in layout with empty filters; `HomeCoursesView` renders a **top filter strip using `.filter-grid`** inside `.courses-area` for desktop parity secondary, **and** inject filters into sidebar via `Sidebar` prop from a client parent:

Replace `(main)/layout.tsx` shell so home page is:

```tsx
// page.tsx
'use client';
export default function HomePage() {
  return <HomeCoursesView />;
}
```

And change main layout to **not** hardcode empty Sidebar filters — instead `HomeCoursesView` renders full `AppShell` itself… That duplicates shell.

**Best locked approach:**

1. `MainLayout` provides AppShell with `<Sidebar mode="home" filtersSlot={<div id="sidebar-filters-root" />}` />`.
2. `HomeCoursesView` uses `createPortal` to render `.filter-grid` into `#sidebar-filters-root`.

```tsx
import { createPortal } from 'react-dom';
// after mount:
const mount = document.getElementById('sidebar-filters-root');
return (
  <>
    {mount && createPortal(<CourseFilters ... />, mount)}
    <div className="content-body" id="view-courses">
      <div className="courses-area">
        <div className="courses-header">...</div>
        <CourseList ... />
      </div>
    </div>
  </>
);
```

- [ ] **Step 1: Rewrite CourseFilters** as buttons:

```tsx
<button
  type="button"
  className={`filter-item${active ? ' active' : ''}`}
  data-filter-type="class"
  onClick={() => onChange(value)}
>
  {label}
</button>
```

Include “Tất cả” chip. Same for levels.

- [ ] **Step 2: Rewrite CourseList**

```tsx
<a className="course-card" href={`/courses/${id}`}>
  <div className="course-thumb-placeholder" />
  <div className="course-title">{name}</div>
</a>
```

Grid wrapper: `<div className="course-grid">`.

- [ ] **Step 3: HomeCoursesView + portal**

Loading: `<DataLoading />`. Empty: `<DataLoading variant="message" message="Chưa có khóa học." />`.

- [ ] **Step 4: Manual check**

`npm run dev` → login → sidebar chips + course cards look like legacy.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(ui): restore legacy home filters and course cards"
```

---

### Task 5: Course detail — book card, tabs, activities, ebook stub

**Files:**
- Modify: `web/app/(main)/courses/[id]/page.tsx`
- Create: `web/features/courses/CourseDetailView.tsx`

- [ ] **Step 1: Markup structure**

```tsx
<div className="view-detail" id="view-detail">
  <button type="button" className="detail-back" onClick={() => router.push('/')}>← Quay lại</button>
  <div className="detail-body" id="detailBody">
    <div className="book-card">...</div>
    <div className="detail-main-panel">
      <div className="detail-tabs tabs-secondary">
        <button className={`tab-secondary${tab==='lesson'?' active':''}`}>Bài học</button>
        <button className={`tab-secondary${tab==='exercises'?' active':''}`}>Bài tập</button>
      </div>
      {tab==='lesson' && (
        <div className="ebook-viewer">
          <div className="ebook-toolbar">...</div>
          <div className="ebook-empty">Sách điện tử sẽ được kết nối sau.</div>
        </div>
      )}
      {tab==='exercises' && (
        <div className="activity-area">
          <div className="activity-grid">
            {/* Grammar live link + other games Sắp có with activity-icon.* classes */}
          </div>
        </div>
      )}
    </div>
  </div>
</div>
```

Grammar card: `Link` to `/games/grammar/${id}` with classes `activity-card` + `activity-icon grammar`.

Other games: `activity-card` with disabled styling / label `Sắp có` — icons: `quiz`, `pronunciation`, etc. matching legacy class suffixes if present in CSS.

- [ ] **Step 2: Keep fetching** `/api/courses/[id]` for counts/progress display on grammar card.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(ui): port course detail book card, tabs, and activity grid"
```

---

### Task 6: Leaderboard podium + sticky

**Files:**
- Modify: `web/features/leaderboard/LeaderboardPanel.tsx`
- Modify: `web/app/(main)/leaderboard/page.tsx`

- [ ] **Step 1: Restructure panel**

```tsx
<div className="view-leaderboard" id="view-leaderboard">
  <div className="lb-page">
    <h1 className="lb-title">Bảng xếp hạng</h1>
    <div className="period-toggle">...</div>
    <div className="lb-podium">
      {/* top 3 as .podium-step */}
    </div>
    <div className="lb-list">
      {/* .lb-row for rank 4+ or all rows */}
    </div>
  </div>
  <div className="lb-sticky-wrap">
    <div className="lb-sticky" id="lbSticky">
      {/* current user row if found in players; else message */}
    </div>
  </div>
</div>
```

Period buttons: use `.period-btn` + `.active`. Keep API `period=day|week|month|all`.

- [ ] **Step 2: DataLoading** while fetch; no gear on empty.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(ui): port leaderboard podium, list, and sticky bar"
```

---

### Task 7: Grammar game chrome (list → question → result)

**Files:**
- Create: `web/app/(main)/games/grammar/[courseId]/layout.tsx`
- Modify: `web/features/games/grammar/GrammarGame.tsx`
- Modify: `web/app/(main)/games/grammar/[courseId]/page.tsx`

- [ ] **Step 1: Game layout with game sidebar**

```tsx
// layout.tsx — client or server+client
// Provide AppShell with Sidebar mode="game" and nav:
// <a class="nav-item" href="/">Trang chủ</a>
// <a class="nav-item active" href={...}>Ngữ pháp</a>
```

Because `(main)/layout` already wraps AppShell, **override** by either:

- **Option locked:** Remove AppShell from `(main)/layout` and let each section provide shell — too invasive.

- **Option locked (use this):** Keep main layout shell; for grammar pages, hide home sidebar filters and show game nav via `Sidebar` detecting pathname:

```tsx
'use client';
import { usePathname } from 'next/navigation';
const pathname = usePathname();
const isGrammar = pathname.startsWith('/games/grammar');
return <Sidebar mode={isGrammar ? 'game' : 'home'} gameNav={...} filtersSlot={...} />;
```

Move Sidebar into a client `MainShell.tsx` used by `(main)/layout.tsx`.

- [ ] **Step 2: Rewrite GrammarGame panels**

State: `panel: 'list' | 'question' | 'result'`.

**List panel** (`#listPanel`):

- `.list-stats` with correct/wrong/pending counts
- `.question-list` > buttons `.q-list-item` (classes for status)
- Start / continue opens question panel

**Question panel:**

- `.game-top`, `.game-meta` (counter + `.meta-score-pill` + `.progress-bar-wrap` > `.progress-bar-fill`)
- `.source-sentence` optional
- `.rewrite-row`: `.rewrite-prefix` + `input.rewrite-input` + `.rewrite-suffix`
- `.hint-box`, `.feedback`, `.game-actions` with `.btn.btn-primary` / `.btn-secondary`

On submit: existing `gradeGrammarAnswer` + `submitAnswerScore` + `/api/progress`.

**Result panel:** summary + button back to list/home.

Keep scoring/progress calls identical to current implementation.

- [ ] **Step 3: Tests**

```bash
npm test
```

Expected: gradeAnswer + other tests still pass.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(ui): port grammar list/question/result chrome to match legacy"
```

---

### Task 8: Verification gate

- [ ] **Step 1: Automated**

```bash
cd "E:/Wewin/Game Trắc Nghiệm/.worktrees/nextjs-migration/web"
npm test
npm run lint
npm run build
```

Expected: all exit 0.

- [ ] **Step 2: Manual checklist** (record PASS/FAIL in commit message or short note in spec status)

| Check | Expected |
|-------|----------|
| `/login` | Looks like legacy modal |
| Home | Sidebar chips + course cards |
| Course detail | book-card + tabs + activity grid |
| Leaderboard | podium + sticky |
| Grammar | list → question → result; score submits |
| Loading | gear + `đang tải dữ liệu` |

- [ ] **Step 3: Update spec status**

In `docs/superpowers/specs/2026-07-12-legacy-ui-parity-design.md` set status to `Implemented on feature/nextjs-migration` when checks pass.

- [ ] **Step 4: Commit**

```bash
git commit -am "docs: mark legacy UI parity Scope A verification"
```

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Port GameStyles + index CSS | 1 |
| AppShell sidebar/header/footer | 2 |
| Login modal style | 3 |
| Home filters + course cards | 4 |
| Course detail + ebook stub | 5 |
| Leaderboard podium/sticky | 6 |
| Grammar chrome | 7 |
| Verification | 8 |
| No API/schema changes | All tasks |
| Other games deferred | Task 5 disabled cards only |

## Consistency notes

- Logo path always `/wewinlogo.png`
- Version string `Version: 2.3.219` (legacy)
- Rank badge placeholder `—` until rank API exists
- Do not change `calculatePoints` / ScoreLog behavior

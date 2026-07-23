# AI Handoff — WeWIN Game Trắc Nghiệm (Next.js web)

**Ngày cập nhật:** 2026-07-14  
**Mục đích:** File này dành cho AI/engineer khác đọc để hiểu toàn bộ ngữ cảnh app web và tiếp tục làm việc **không cần đọc lại lịch sử chat**.

---

## 1. Sản phẩm là gì?

**WeWIN Education — Game Trắc Nghiệm:** nền tảng luyện tiếng Anh cho học sinh (Global Success / các cấp Lớp 1–9, Starters → Flyers + THCS).

Học sinh:
1. Đăng nhập
2. Chọn khóa (unit), ví dụ `Unit 1` / `Lớp 8`
3. Xem **Bài học** (PDF ebook theo khoảng trang)
4. Làm **11 loại game** → ghi điểm → vào **bảng xếp hạng**

Admin:
- CRUD cấp lớp, khóa học, câu hỏi (sheet editor), user, ebook PDF
- Bật/ẩn từng game với học sinh (`enabledGames`)

---

## 2. Nơi làm việc (QUAN TRỌNG)

| Vị trí | Vai trò |
|--------|---------|
| **App code** | `e:\Wewin\Game Trắc Nghiệm\.worktrees\nextjs-migration\web\` |
| **Docs / specs** | `e:\Wewin\Game Trắc Nghiệm\docs\superpowers\` |
| **Cursor rules** | `e:\Wewin\Game Trắc Nghiệm\.cursor\rules\` |

**Quy tắc cứng:**
- Mọi thay đổi sản phẩm làm trong **Next.js** (`web/` trong worktree).
- **Không** sửa / deploy Google Apps Script (`Code.gs`, `*.html` legacy ở root — đã xóa / không còn là runtime).
- Rule: `.cursor/rules/nextjs-only.mdc`

Folder `.worktrees/` có thể bị gitignore ở root — code app vẫn nằm ở đường dẫn trên.

---

## 3. Tech stack

| Layer | Công nghệ |
|-------|-----------|
| Framework | **Next.js 15.5** (App Router, Turbopack) |
| UI | **React 19**, TypeScript |
| Font / icons | Nunito (`next/font`), Font Awesome 6 CDN |
| DB | **PostgreSQL** |
| ORM | **Prisma 7** + `@prisma/adapter-pg` |
| Auth | username/password, **bcryptjs**, JWT cookie `wewin_session` (**jose**, 7 ngày); Parent Portal SSO qua `GET /api/auth/portal-sso?token=` (`PORTAL_SSO_SECRET`) |
| Validation | **zod** |
| PDF | **pdfjs-dist** 4.x |
| CSS | Chính: CSS legacy port (`styles/legacy/*` qua `app/globals.css`). Tailwind v4 có sẵn, dùng nhẹ |
| Test | **Vitest** (`npm test`) |

---

## 4. Chạy local

```bash
cd "e:/Wewin/Game Trắc Nghiệm/.worktrees/nextjs-migration/web"

# .env hoặc .env.local
# DATABASE_URL=postgresql://USER:PASS@HOST:5432/wewin_game?schema=public
# SESSION_SECRET=chuoi-bi-mat-dai-hon-16-ky-tu

npm install
npm run db:generate
npm run db:migrate    # hoặc db:push
npm run db:seed       # demo + admin, password 123123
npm run dev           # mặc định http://localhost:3000
```

Scripts hữu ích:
- `npm run db:import-excel` — import từ Excel
- `npx tsx scripts/import-unit1-lop8-leisure.ts` — đã chạy: +40 câu Unit 1 Lớp 8 (Leisure)
- `npm test` / `npm run build`

Env tối thiểu (xem `.env.example`): `DATABASE_URL`, `SESSION_SECRET`.
SSO từ Parent Portal: thêm `PORTAL_SSO_SECRET` (trùng `CFG.GAME_SSO_SECRET` trong `baobaiwewin/code.gs.txt`).

**Seed accounts:** `demo` (student), `admin` (admin) — password `123123` (chỉ local).

---

## 5. Cấu trúc thư mục (tóm tắt)

```
web/
├── app/
│   ├── (auth)/login/
│   ├── (main)/              # shell học sinh (cần session)
│   │   ├── page.tsx         # Home khóa học
│   │   ├── courses/[id]/
│   │   ├── leaderboard/
│   │   └── games/<slug>/[courseId]/
│   ├── (admin)/admin/       # CMS (role=admin)
│   └── api/                 # Route handlers
├── components/              # shell, DataLoading, admin shell
├── features/
│   ├── auth/, courses/, games/, leaderboard/, scoring/, admin/
├── lib/
│   ├── db.ts, auth.ts, session.ts, scoring.ts
│   ├── gameCatalog.ts       # danh sách game + live flags
│   ├── courseKey.ts, leaderboard*.ts
│   ├── ebookStorage.ts
│   └── admin/payloadSchemas.ts, sheetColumns.ts, …
├── prisma/schema.prisma + migrations/
├── scripts/                 # seed, import
├── styles/legacy/           # CSS port từ GAS
├── storage/ebooks/          # PDF (không commit nội dung thật)
└── middleware.ts            # gate trang (API tự check session)
```

---

## 6. Auth & roles

- Roles: `student` | `admin` (`User.role`)
- Cookie: `wewin_session` (httpOnly, sameSite=lax)
- Payload JWT: `{ userId, username, displayName, role }`
- Pages: `middleware` + layout `requireSession` / `requireAdmin`
- API: tự gọi `requireSession()` / `requireAdmin()` trong handler
- Soft-delete user: `archivedAt` → không login được

Endpoints: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`

---

## 7. Data model (Prisma)

File: `web/prisma/schema.prisma`

| Model | Ý nghĩa |
|-------|---------|
| **User** | Tài khoản |
| **ClassLevel** | Nhãn cấp lớp (`levelName` unique) — khớp string với `Course.levelName`, không FK |
| **Course** | Khóa/unit: `name`, `levelName`, `active`, `archivedAt`, `enabledGames[]` (rỗng = hiện tất cả game), `ebookFileId?`, `ebookPageStart/End?` |
| **Question** | Nội dung game: `courseId`, `game` (key), `payload` **Json**, `sortOrder`, `active`, `archivedAt`, `externalId?` |
| **GameProgress** | Tiến độ: unique `(userId, courseKey, game)`; `statuses` Json `empty\|correct\|wrong` |
| **ScoreLog** | Sự kiện ghi điểm (append-only) → nguồn bảng xếp hạng |
| **Ebook** | Metadata PDF; file tại `storage/ebooks/{id}.pdf` |

**courseKey (progress):** `` `${course.name}|${course.levelName}` `` — xem `lib/courseKey.ts`  
**ScoreLog.course:** thường lưu **tên khóa** (`name`), không phải cuid.

Soft-delete admin: filter `archivedAt: null` (`lib/admin/notArchived.ts`).

---

## 8. Catalog 11 game

Nguồn: `lib/gameCatalog.ts` — **tất cả `live: true`**.

| `game` key (DB/API/ScoreLog) | URL slug | Label UI |
|------------------------------|----------|----------|
| `grammar` | `grammar` | Ngữ pháp |
| `quiz` | `quiz` | Trắc nghiệm |
| `pronunciation` | `pronunciation` | Phát âm |
| `scramble` | `scramble` | Sắp xếp từ |
| `word_match` | `word-match` | Nối từ với hình |
| `look_and_write` | `look-and-write` | Nhìn và viết |
| `choose_and_circle` | `choose-and-circle` | Chọn và khoanh |
| `read_and_complete` | `read-and-complete` | Đọc và hoàn thành |
| `read_and_match` | `read-and-match` | Đọc và nối |
| `vocabulary_test` | `vocabulary-test` | Kiểm tra từ vựng |
| `vocabulary_check` | `vocabulary-check` | Kiểm tra đúng sai |

**Visibility:** `Course.enabledGames` — rỗng ⇒ all; học sinh chỉ thấy intersection với catalog. Helper: `resolveEnabledGameKeys`, `findPlayableCourseGame`.

**Hai nhóm payload:**
1. **Scalar** (1 Question = 1 câu): grammar, quiz, pronunciation, scramble, word_match  
2. **Exercise** (1 Question = 1 “bài”, có `items[]`): look_and_write, choose_and_circle, read_and_complete, read_and_match, vocabulary_test, vocabulary_check  

Schema Zod: `lib/admin/payloadSchemas.ts` — luôn validate khi admin tạo/sửa.

### Ví dụ payload ngắn

```json
// grammar
{ "prefix": "She", "suffix": "to school every day.", "hint": "goes", "answers": ["goes"] }

// quiz
{ "type": "multiple_choice", "question": "…", "answer": "goes", "options": ["go","goes","going","went"] }

// pronunciation
{ "mode": "word", "prompt": "…", "targetText": "leisure", "targetIpa": "/ˈleʒə(r)/", "hint": "…" }
// mode: phoneme | word | sentence

// scramble / word_match
{ "word": "leisure", "hint": "thời gian rảnh", "image": "" }

// look_and_write / vocabulary_test
{ "title": "…", "instruction": "…", "word_bank": ["a","b"], "items": [{ "order": 1, "image": "", "answer": "a" }] }

// choose_and_circle
{ "title": "…", "items": [{ "order": 1, "options": ["a","b"], "answer": "a", "image": "" }] }

// read_and_complete
{ "title": "…", "word_bank": ["a"], "items": [{ "order": 1, "sentence": "I like ___.", "answer": "a" }] }

// read_and_match
{ "title": "…", "items": [{ "order": 1, "sentence": "…", "label": "A", "answer": "A", "image": "" }] }

// vocabulary_check
{ "title": "…", "items": [{ "order": 1, "word": "cat", "sentence": "This is a cat.", "is_correct": true, "image": "" }] }
```

Admin API:
- `GET/POST /api/admin/courses/[id]/questions?game=`
- `GET/PATCH/DELETE /api/admin/questions/[id]`

---

## 9. Luồng ghi điểm → bảng xếp hạng (BẮT BUỘC)

```
Học sinh trả lời
  → client gọi submitAnswerScore(courseName, gameKey, questionIndex, isCorrect, elapsedMs)
  → POST /api/score/submit
  → calculatePoints() → ScoreLog.create
  → Leaderboard đọc từ ScoreLog
```

Files:
- Client: `features/scoring/submitScore.ts`
- API: `app/api/score/submit/route.ts`
- Công thức: `lib/scoring.ts`  
  - Time limit 30s  
  - Đúng: **50–200** (nhanh → cao)  
  - Sai: **âm** −(20–80) (sai nhanh → trừ nhiều hơn)

Progress riêng: `POST /api/progress` → `GameProgress.statuses` — **không thay thế** ScoreLog.

Rule: `.cursor/rules/game-scoring-leaderboard.mdc`  
→ Khi thêm/sửa game, mỗi lần chấm đúng/sai phải gọi `submitAnswerScore`.

---

## 10. UI conventions

### Loading (bắt buộc khi fetch data)
- Icon: `fas fa-gear fa-spin`
- Text: `đang tải dữ liệu`
- Class: `data-loading-state`
- Component: `components/DataLoading.tsx`
- Lỗi / trống: **không** dùng bánh răng

Rule: `.cursor/rules/ui-loading-state.mdc`

### CSS
Giữ ngôn ngữ visual legacy (màu WeWIN xanh `#0d2b6e`, bo góc card, shell sidebar). Sửa chủ yếu trong `styles/legacy/` + CSS module/local của từng game.

---

## 11. Luồng học sinh & admin

### Học sinh
1. `/login` → `/`
2. Home lọc cấp / tìm khóa → `/courses/[id]`
3. Tab **Bài học**: `EbookViewer` nếu có `ebookFileId` + page range  
   - File: authenticated `GET /api/ebooks/[id]/file`  
   - Render PDF.js canvas, **fit theo chiều ngang** + zoom ±, cuộn dọc
4. Tab **Bài tập**: card game → `/games/<slug>/<courseId>`
5. `/leaderboard` theo kỳ (ngày/tuần/tháng/all)

### Admin (`/admin`)
- Dashboard, class-levels, courses, course detail (bật/ẩn game, gắn ebook)
- Questions: list + sheet “Sửa nội dung” + form editor
- Users, ebooks (upload PDF)

Specs liên quan:
- `docs/superpowers/specs/2026-07-12-nextjs-migration-design.md`
- `docs/superpowers/specs/2026-07-13-admin-cms-design.md`
- `docs/superpowers/specs/2026-07-13-admin-sheet-edit-mode-design.md`
- `docs/superpowers/specs/2026-07-14-course-game-visibility-design.md`
- `docs/superpowers/specs/2026-07-14-ebook-pdf-viewer-design.md`

---

## 12. Trạng thái gần đây (2026-07-14)

### Ebook PDF viewer
- Đã đổi từ fit-to-page → **fit-to-width** (`EbookViewer.tsx` + CSS `overflow: auto` trên canvas wrap)
- Zoom là hệ số trên scale vừa chiều ngang

### Data Unit 1 / Lớp 8
- Course: `name: "Unit 1"`, `levelName: "Lớp 8"`
- Script: `scripts/import-unit1-lop8-leisure.ts`
- Đã insert **+40** câu/bài (prefix `externalId` `U1-L8-LEISURE-…`) cho các game đang ≤5:
  - pronunciation, word_match, look_and_write, choose_and_circle, read_and_complete, read_and_match, vocabulary_test, vocabulary_check
- Bỏ qua: grammar (11), quiz (10), scramble (6)
- Chủ đề từ vựng: **Leisure**; ảnh nhiều chỗ dùng `placehold.co`

### Game Phát âm — QUAN TRỌNG
UI luyện từ/câu có micro thật + chấm STT:

| Phần | Thực tế |
|------|---------|
| Nghe mẫu / nghe chậm | **Thật** — Web Speech TTS hoặc `referenceAudioUrl` |
| Micro ghi âm | **Thật** — `MediaRecorder` / `getUserMedia` |
| Chấm điểm | **Groq Whisper** → similarity (≥70 đúng); hết quota/thiếu key → **Web Speech** fallback |
| ScoreLog | Tự gọi `submitAnswerScore` (bỏ Đúng/Sai) |
| Phân tích từng âm | **Đã bỏ** (Whisper không phoneme thật) |
| Tab Trọng âm | **Ẩn** trên player (phase này) |

Files: `features/games/pronunciation/*`, `POST /api/games/pronunciation/assess`, env `GROQ_API_KEY`  
Spec: `docs/superpowers/specs/2026-07-15-pronunciation-whisper-scoring-design.md`

Admin mode pronunciation: `phoneme | word | sentence` (stress ẩn player)

---

## 13. Mẫu thêm / sửa game

1. Payload schema trong `lib/admin/payloadSchemas.ts` (nếu đổi shape)
2. Feature UI dưới `features/games/<name>/`
3. Page `app/(main)/games/<slug>/[courseId]/page.tsx`
4. API `app/api/games/<slug>/[courseId]/route.ts`
5. Mỗi câu trả lời → `submitAnswerScore` + (nếu cần) persist progress
6. Catalog entry trong `gameCatalog.ts` (`live: true`)
7. Loading chuẩn khi fetch
8. Test vitest nếu đã có pattern cùng game

Template tham khảo: `features/games/grammar/GrammarGame.tsx`

---

## 14. File nên mở trước (theo thứ tự)

1. `lib/gameCatalog.ts`
2. `prisma/schema.prisma`
3. `docs/superpowers/specs/2026-07-12-nextjs-migration-design.md`
4. `lib/scoring.ts` + `features/scoring/submitScore.ts` + `app/api/score/submit/route.ts`
5. `lib/session.ts` + `lib/auth.ts` + `middleware.ts`
6. `lib/admin/payloadSchemas.ts`
7. `features/courses/CourseDetailView.tsx` + `EbookViewer.tsx`
8. `features/admin/CourseDetailAdmin.tsx`
9. `.cursor/rules/nextjs-only.mdc`, `ui-loading-state.mdc`, `game-scoring-leaderboard.mdc`

---

## 15. Known gaps / không làm nhầm

- README trong `web/` vẫn là boilerplate create-next-app — **không** phải tài liệu sản phẩm
- `PROJECT.md` root và một số rule vẫn nhắc GAS — runtime thật là Next
- Không có Google OAuth; Sheets/Excel chỉ để **import**, không phải source of truth live
- Không có upload ảnh/audio CMS (paste URL vào payload)
  → **Phase 1+2:** Admin sheet **Gắn thư mục ảnh/audio** — scalar games + nested `items[].image` (look_and_write, choose_and_circle, read_and_complete, read_and_match, vocabulary_test, vocabulary_check). File lưu `storage/media/`, URL `/api/media/...`.
- Ebook storage local disk, chưa S3
- Pronunciation chưa chấm AI thật
- Không sửa ScoreLog qua admin (phase 1)
- Không force-push / không commit secrets (`.env`)

---

## 16. Sơ đồ kiến trúc nhanh

```mermaid
flowchart LR
  Browser --> NextApp[Next.js App Router]
  NextApp --> API[Route Handlers]
  API --> Prisma
  Prisma --> PG[(PostgreSQL)]
  Games[features/games/*] -->|submitAnswerScore| ScoreAPI["/api/score/submit"]
  ScoreAPI --> ScoreLog[(ScoreLog)]
  ScoreLog --> LB[Leaderboard]
  Games --> ProgressAPI["/api/progress"]
  ProgressAPI --> GameProgress[(GameProgress)]
  Course --> Ebook[(Ebook)]
  Ebook --> Disk["storage/ebooks/*.pdf"]
```

---

## 17. Cách AI nhận việc nên hành xử

1. `cd` vào `.worktrees/nextjs-migration/web` trước khi sửa code
2. Đọc rule Cursor + schema + gameCatalog trước khi đoán
3. Không port lại sang GAS HTML
4. Mọi chấm điểm game phải có ScoreLog
5. Loading UI theo chuẩn gear
6. Với feature lớn (vd Azure phát âm): brainstorm → spec trong `docs/superpowers/specs/` → plan → implement
7. Chỉ commit khi user yêu cầu

---

*Hết file handoff. Cập nhật ngày/section tương ứng khi kiến trúc hoặc trạng thái phát âm/Azure thay đổi.*

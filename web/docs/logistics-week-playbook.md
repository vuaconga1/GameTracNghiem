# Logistics week playbook (seed + games)

Hướng dẫn làm **tuần mới** cho English for Logistics giống week 1–3.

## Cấu trúc sản phẩm

| Week | URL | Courses |
|------|-----|---------|
| 1 | `/logistics` | 4 units (IDs cuid sẵn có) |
| 2 | `/logistics/week2` | 3 units (`cmlgw2…`) |
| 3 | `/logistics/week3` | 4 units (`cmlgw3…`) |
| N | `/logistics/weekN` | Mirror week3 |

Mỗi unit:

1. `Course` + PDF ebook (skill lessons vocabulary + speaking)
2. Curated vocab deck → UI tab Từ vựng
3. Games: **scramble** + **pronunciation** (+ AI Speaking topic)
4. `enabledSkills`: `vocabulary`, `speaking`

Level DB (giữ typo): `English For Logictics`

## Checklist tuần mới (ví dụ week 4)

### 1. PDF nguồn

Đặt PDF vào thư mục cố định (week3 dùng `../audio` cạnh `web/`), hoặc set env:

```bash
LOGISTICS_WEEK4_PDF_DIR="E:/path/to/pdfs"
```

Quyết định **thứ tự unit** (thường Level 1 trước, Level 2 sau).

### 2. `lib/logisticsUnits.ts`

- Thêm `LOGISTICS_WEEK4_COURSES` với `id` dạng `cmlgw4…`, `key` dạng `W4-…`
- Mở rộng `LogisticsWeek = 1 | 2 | 3 | 4`
- Cập nhật `logisticsCoursesForWeek` + `logisticsWeekHomeHref`

### 3. `lib/logisticsVocabDeck.ts`

- Curate `W4_*_VOCAB` từ PDF (6–8 từ/unit; có nghĩa + example)
- Map vào `DECKS_BY_COURSE_ID`
- Cập nhật test `logisticsVocabDeck.test.ts`

### 4. Scripts

Copy week3:

- `scripts/seed-logistics-week4.ts` — upsert ClassLevel, Ebook, Course, CourseSkillLesson
- `scripts/seed-logistics-week4-vocab-games.ts` — scramble / pronunciation / SpeakingTopic

### 5. UI

- `app/(main)/logistics/week4/page.tsx`
- `MainShell` — thêm nav week4
- `LogisticsCoursesView` — title key `logistics.week4`
- `lib/i18n/messages/{vi,en}.ts` — `week4`
- `CourseDetailView` dùng `logisticsWeekHomeHref` (đã generic)

### 6. Chạy seed

Từ `web/`:

```bash
node scripts/run-with-env.mjs local -- npx tsx scripts/seed-logistics-week4.ts
node scripts/run-with-env.mjs local -- npx tsx scripts/seed-logistics-week4-vocab-games.ts

# production / neon khi sẵn sàng
node scripts/run-with-env.mjs neon -- npx tsx scripts/seed-logistics-week4.ts
node scripts/run-with-env.mjs neon -- npx tsx scripts/seed-logistics-week4-vocab-games.ts
```

### 7. Kiểm tra

- `/logistics/week4` hiện đúng số khóa
- Vào unit → tab Bài học (PDF), Từ vựng, game scramble + phát âm
- Back về đúng `/logistics/week4`

## Week 3 — PDF mapping (đã làm)

Thứ tự import **PDF 4 → 1** theo request:

| # | Course key | PDF |
|---|------------|-----|
| 1 | `W3-FREIGHT` | `Unit 5 Freight Rates & Basic Quotation Structure -Session 5- L 1.pdf` |
| 2 | `W3-INVOICE` | `Understanding Invoices & Payment Terms.pdf` |
| 3 | `W3-FEES` | `Logistics English - Extra Fees & Price Increases- Session 5 - Level 2.pdf` |
| 4 | `W3-FREEDAYS` | `Topic 6 - Free Days & Late Container Fees - Sesssion 6- Level 2.pdf` |

## Ghi chú

- Không dựa hotspot PDF thô cho game — curated deck sạch hơn (xem `_week2-vocab-report.json`).
- `logisticsGameWord()` bỏ phần `(…)` cuối từ khi đưa vào scramble/pronunciation.
- Guest progress lưu localStorage theo `courseKey` + game — không cần seed riêng.

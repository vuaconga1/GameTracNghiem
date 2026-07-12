# Frontend – Game Trắc Nghiệm (WeWIN)

Tài liệu hướng dẫn giao diện frontend cho dự án Google Apps Script.

---

## 1. Màu sắc chủ đạo

| Token CSS | Mã màu | Mục đích |
|-----------|--------|----------|
| `--primary` | `#0d2b6e` | Màu chủ đạo – xanh dương đậm (sidebar logo, tab active, nút, link) |
| `--primary-dark` | `#0a224f` | Hover / trạng thái nhấn |
| `--primary-light` | `#e8eef8` | Nền highlight (filter active, action hover) |
| `--primary-hover` | `#d0daf0` | Hover phụ |
| `--accent-gold` | `#e4c28e` | Điểm nhấn thương hiệu WeWIN (logo, badge) |
| `--bg-page` | `#fffef8` | Nền trang – vàng nhạt, sáng, ấm |
| `--white` | `#ffffff` | Thẻ, header, modal |
| `--text-dark` | `#333333` | Văn bản chính |
| `--text-muted` | `#9e9e9e` | Văn bản phụ |
| `--border` | `#e0e0e0` | Đường viền |

### Footer (gradient riêng)

| Vùng | Mã màu |
|------|--------|
| Gradient nền | `#0a1435` → `#122b6b` → `#0a1435` |
| Overlay trang trí | `rgba(251, 191, 36, 0.12)` |

---

## 2. Typography

- **Font:** [Nunito](https://fonts.google.com/specimen/Nunito) (Google Fonts)
- **Trọng lượng:** 400 (thường), 600 (medium), 700–800 (tiêu đề, nút)
- **Ngôn ngữ:** Tiếng Việt (`lang="vi"`)

---

## 3. Layout

```
┌─────────────┬──────────────────────────────────────┐
│   Sidebar   │  Header (login / user + actions)     │
│   (200px)   ├──────────────────────────────────────┤
│             │  Tabs + Content (nền vàng nhạt)      │
│             ├──────────────────────────────────────┤
│             │  Footer (xanh đậm gradient)          │
└─────────────┴──────────────────────────────────────┘
```

| Thành phần | Ghi chú |
|------------|---------|
| Sidebar | Cố định trái, logo nền `--primary` |
| Main | `margin-left: 200px`, flex column |
| Content | Nền `--bg-page`, padding 28px |
| Footer | Full width trong `.main`, luôn ở cuối trang |

---

## 4. Component

### Nút (Button)

- Bo góc: `10px` – `12px`
- Font weight: `700` – `800`
- Nền: `--primary`, chữ trắng
- **Hover:** `transform: scale(1.06)` + đổi màu nền sang `--primary-dark`

Áp dụng cho: `button`, `.btn-login`, `.login-submit`, `.level-pill`, `.detail-back`, `.footer-social-link`

### Tab

- Active: chữ `--primary` + gạch dưới 3px `--primary`
- Inactive: `--text-muted`

### Thẻ khóa học / hoạt động

- Nền trắng, `border-radius: 12px–14px`
- `box-shadow` nhẹ
- Hover: `translateY(-2px)` + shadow đậm hơn

### Modal đăng nhập

- Header modal: nền `--primary`
- Form: nền trắng, input focus viền `--primary`

### Footer

- Logo + slogan + 5 icon mạng xã hội (trái)
- Lưới 2×2 thông tin liên hệ (phải)
- Copyright: `© 2026 WeWIN Education. All rights reserved. Made with ❤️`

---

## 5. Hiệu ứng tương tác

| Hiệu ứng | Giá trị |
|----------|---------|
| Button hover zoom | `scale(1.06)`, `transition: 0.22s ease` |
| Footer contact card hover | `scale(1.03)` |
| Course card hover | `translateY(-3px)` |

---

## 6. File liên quan

| File | Vai trò |
|------|---------|
| `index.html` | Trang chính – layout, CSS, JS |
| `grammar.html` | Trang ngữ pháp |
| `multiplechoice.html` | Trang trắc nghiệm |
| `leaderboard.html` | Trang bảng xếp hạng (standalone) |
| `FRONTEND.md` | Quy tắc giao diện và UX (gồm mục 9 – loading) |
| `wewinlogo.png` | Logo WeWIN |
| `Code.gs` | API server (login, logo, session, dữ liệu game) |

---

## 7. Responsive

- **≤ 1200px:** Lưới khóa học 3 cột
- **≤ 900px:** Filter + content xếp dọc; footer 1 cột; activity grid 1 cột

---

## 8. Quy tắc khi chỉnh sửa

1. Luôn dùng biến CSS trong `:root`, không hard-code màu xanh/lục rời.
2. Màu chủ đạo là **xanh dương đậm**, không dùng xanh lá làm primary.
3. Nền trang giữ tông **vàng nhạt sáng** (`--bg-page`), không chuyển về xám/trắng thuần.
4. Mọi nút mới thêm cần có hiệu ứng hover zoom.
5. Footer giữ gradient xanh đậm và thông tin liên hệ WeWIN Education.

---

## 9. Trạng thái tải dữ liệu (bắt buộc)

**Nguyên tắc:** Trước khi nhận được dữ liệu thật từ Google Apps Script (hoặc `localStorage` khi offline), **không hiển thị số liệu giả / placeholder** (vd: `0/3`, `0/6`, tên mẫu trên bảng xếp hạng). Người dùng dễ nhầm đó là dữ liệu thật.

### Khi nào hiện loading

| Vùng | Trạng thái loading | Sau khi tải xong |
|------|-------------------|------------------|
| Danh sách khóa học | `Đang tải khóa học...` | Thẻ khóa học hoặc thông báo trống |
| Chi tiết khóa học | `Đang tải dữ liệu...` (ẩn stats + activity) | Số bài hoàn thành, điểm, tiến độ Ngữ pháp / Trắc nghiệm |
| Trang game (grammar / quiz / pronunciation) | `Đang tải dữ liệu...`, stats hiện `—`, nút thao tác disabled | Danh sách câu hỏi + thống kê thật |
| Bảng xếp hạng | Spinner + `Đang tải dữ liệu...` (cả sticky footer) | Hạng, tên, điểm thật |

### Class / component dùng chung

```html
<div class="data-loading-state">
  <i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...
</div>
```

- **`.lb-loading`** — danh sách dài (khóa học, bảng xếp hạng).
- **`.data-loading-state`** — vùng nội dung game / chi tiết.
- **`.detail-data-loading`** — overlay trong trang chi tiết khóa (`index.html`).
- **`.lb-sticky.is-loading`** — thanh sticky xếp hạng khi chưa có dữ liệu user.

### Quy tắc implement

1. **Không dùng `GAME_TOTALS` mock** làm số hiển thị ban đầu — chỉ dùng sau khi API trả về hoặc đọc `localStorage`.
2. Khi mở chi tiết khóa: gọi `setDetailLoading(true)` ngay, `false` khi `getCourseDetail` hoàn tất (kể cả lỗi).
3. Khi refresh ngầm (vd: `window.focus`): có thể tải lại **không** hiện overlay loading (`updateDetailProgress(false)`).
4. Placeholder số: dùng `—`, không dùng `0` nếu chưa có nguồn dữ liệu.
5. Mọi trang mới có dữ liệu từ GAS phải tuân pattern: **loading → dữ liệu thật / thông báo lỗi / trống** — không có bước hiển thị mock ở giữa.

### File áp dụng

| File | Hàm / vùng liên quan |
|------|----------------------|
| `index.html` | `setDetailLoading`, `loadCourseList`, `loadLeaderboardData` |
| `grammar.html` | `setGameLoading`, `loadGameData` |
| `multiplechoice.html` | `setGameLoading`, `loadGameData` |
| `pronunciation.html` | `loadGameData`, trạng thái loading của card luyện phát âm |
| `leaderboard.html` | `setLbStickyLoading`, `loadLeaderboard` |

---

## 10. Dữ liệu mẫu (sample data)

**Chỉ được phép** giữ dữ liệu tĩnh cho bộ lọc **Lớp/Cấp độ** trên trang Khóa học:

| Cột trái | Cột phải |
|----------|----------|
| Tất cả | *(trống)* |
| 3-4 tuổi | Starters |
| 4-5 tuổi | Cấp độ 1 |
| 5-6 tuổi | Cấp độ 2 |
| 6-7 tuổi | Cấp độ 3 |
| 7-8 tuổi | Cấp độ 4 |
| 8-9 tuổi | Cấp độ 5 |
| 9-10 tuổi | Cấp độ 6 |
| Lớp 1 – Lớp 4 | *(trống)* |

**Không được** hard-code trong frontend:

- Tên khóa học, sách, câu hỏi mẫu (EveryUp, Fun 4 Flyers, …)
- Tiến độ / điểm giả (`0/3`, badge rank mẫu, tên trên bảng xếp hạng)
- Danh sách câu hỏi fallback khi API lỗi
- Header mẫu kiểu "Easy Class Admin"

Dữ liệu thật lấy từ Google Sheet qua `Code.gs`. Xóa dữ liệu mẫu trên Sheet: chạy `clearAllSampleData()` trong Apps Script Editor.

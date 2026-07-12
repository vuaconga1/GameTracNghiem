# Database — Câu hỏi Starters (6 sheet riêng)

Thiết kế bảng dữ liệu cho **6 loại game Starters** (Lớp 1–2).  
Tuân thủ `PROJECT.md` mục 5: **cột tiếng Việt**, người không biết code vẫn nhập được.

> **Quyết định thiết kế:** Mỗi loại game **một sheet riêng** — chỉ có cột cần thiết, không còn nhiều cột trống gây rối.

---

## 1. Kiến trúc tổng quan

```
Tab HuongDan              → Hướng dẫn chung (không đọc vào game)

Tab Nhin_va_viet          → Game « Nhìn và viết »
Tab Chon_va_khoanh        → Game « Chọn và khoanh »
Tab Doc_va_hoan_thanh     → Game « Đọc và hoàn thành »
Tab Doc_va_noi            → Game « Đọc và nối »
Tab Kiem_tra_tu_vung      → Game « Kiểm tra từ vựng »
Tab Kiem_tra_dung_sai     → Game « Kiểm tra đúng sai »
```

| Quyết định | Lý do |
|------------|-------|
| **6 sheet riêng** | Mỗi bảng 8–9 cột thay vì 18 cột; không cần cột « Loại bài » |
| **Nhiều dòng = 1 bài chơi** | Cột « Mã bài » gom câu trong cùng một lượt chơi |
| **Tên tab không dấu** | `Nhin_va_viet`… dễ import Drive / code; tiêu đề hiển thị vẫn tiếng Việt có dấu trên app |
| **Backend gộp khi đọc** | `Code.gs` đọc 6 sheet, gắn `type` theo tên tab |

### Map tên tab → mã code

| Tên tab (Sheet / Excel) | Tên hiển thị app | Mã code |
|-------------------------|------------------|---------|
| `Nhin_va_viet` | Nhìn và viết | `look_and_write` |
| `Chon_va_khoanh` | Chọn và khoanh | `choose_and_circle` |
| `Doc_va_hoan_thanh` | Đọc và hoàn thành | `read_and_complete` |
| `Doc_va_noi` | Đọc và nối | `read_and_match` |
| `Kiem_tra_tu_vung` | Kiểm tra từ vựng | `vocabulary_test` |
| `Kiem_tra_dung_sai` | Kiểm tra đúng sai | `vocabulary_check` |

---

## 2. Cột chung (mọi sheet)

| Cột | Mô tả |
|-----|--------|
| **Mã bài** | Nhóm các dòng thành 1 lượt chơi. VD: `HK2-NV-01` |
| **Thứ tự** | `1`, `2`, `3`… trong cùng mã bài |
| **Tên khóa học** | Trùng sheet Khóa học. VD: `Global Success Lớp 1 - Học kỳ 2` |
| **Đang dùng** | `Có` hoặc `Không` |

**Hàng 1:** tên cột. **Hàng 2:** ghi chú mẫu (xám — code **bỏ qua**).

---

## 3. Bảng cột từng sheet

### 3.1. `Nhin_va_viet` — Nhìn và viết (9 cột)

| Cột | Bắt buộc | Mô tả |
|-----|----------|-------|
| Mã bài | Có | |
| Thứ tự | Có | |
| Tên khóa học | Có | |
| Tiêu đề bài | Không | Chỉ dòng Thứ tự = 1 |
| Hướng dẫn | Không | Chỉ dòng Thứ tự = 1. VD: `Look and write.` |
| Hộp từ gợi ý | Có* | Dòng 1: `brother\|sister\|tent` (*áp dụng cả bài) |
| Link hình ảnh | Có | Link Google Drive |
| Đáp án đúng | Có | Từ khớp với hình |
| Đang dùng | Có | |

### 3.2. `Chon_va_khoanh` — Chọn và khoanh (8 cột)

| Cột | Bắt buộc | Mô tả |
|-----|----------|-------|
| Mã bài | Có | |
| Thứ tự | Có | |
| Tên khóa học | Có | |
| Link hình ảnh | Có | |
| Lựa chọn A | Có | |
| Lựa chọn B | Có | |
| Đáp án đúng | Có | Từ đúng (`brother`) hoặc `A` / `B` |
| Đang dùng | Có | |

### 3.3. `Doc_va_hoan_thanh` — Đọc và hoàn thành (8 cột)

| Cột | Bắt buộc | Mô tả |
|-----|----------|-------|
| Mã bài | Có | |
| Thứ tự | Có | |
| Tên khóa học | Có | |
| Hộp từ gợi ý | Có* | Dòng 1 của mã bài |
| Nội dung câu | Có | `I am ___ years old.` |
| Link hình gợi ý | Không | Ảnh nhỏ gợi ý |
| Đáp án đúng | Có | |
| Đang dùng | Có | |

### 3.4. `Doc_va_noi` — Đọc và nối (8 cột)

| Cột | Bắt buộc | Mô tả |
|-----|----------|-------|
| Mã bài | Có | |
| Thứ tự | Có | |
| Tên khóa học | Có | |
| Nội dung câu | Có | Câu bên trái |
| Link hình ảnh | Có | Hình bên phải (app xáo thứ tự) |
| Nhãn hình | Không | `A`, `B`, `C`… |
| Đáp án đúng | Có | Nhãn hình đúng (thường trùng « Nhãn hình ») |
| Đang dùng | Có | |

### 3.5. `Kiem_tra_tu_vung` — Kiểm tra từ vựng (8 cột)

| Cột | Bắt buộc | Mô tả |
|-----|----------|-------|
| Mã bài | Có | |
| Thứ tự | Có | |
| Tên khóa học | Có | |
| Hướng dẫn | Không | Dòng 1. VD: `Look at the pictures…` |
| Hộp từ gợi ý | Có* | Dòng 1 của mã bài |
| Link hình ảnh | Có | |
| Đáp án đúng | Có | |
| Đang dùng | Có | |

### 3.6. `Kiem_tra_dung_sai` — Kiểm tra đúng sai (8 cột)

| Cột | Bắt buộc | Mô tả |
|-----|----------|-------|
| Mã bài | Có | |
| Thứ tự | Có | |
| Tên khóa học | Có | |
| Link hình ảnh | Có | |
| Từ hiển thị | Có | |
| Câu mô tả | Có | |
| Đúng hay sai? | Có | `Đúng` = khớp thật; `Sai` = cố ý sai |
| Đang dùng | Có | |

---

## 4. Quy tắc nhóm bài (Mã bài)

```
Mã bài HK2-NV-01  (sheet Nhin_va_viet)
├── Thứ tự 1  → tiêu đề + hộp từ + tranh 1
├── Thứ tự 2  → tranh 2
└── Thứ tự 3  → tranh 3
         ↓
    1 lượt chơi trên app
```

**Quy ước mã bài:** `[Học kỳ]-[Viết tắt]-[Số]`  
VD: `HK2-NV-01`, `HK2-CK-01`, `HK2-DS-01`

---

## 5. Ví dụ dữ liệu mẫu

### `Nhin_va_viet`

| Mã bài | Thứ tự | Tên khóa học | Tiêu đề bài | Hướng dẫn | Hộp từ gợi ý | Link hình ảnh | Đáp án đúng | Đang dùng |
|--------|--------|--------------|-------------|-----------|--------------|---------------|-------------|-----------|
| HK2-NV-01 | 1 | Global Success Lớp 1 - Học kỳ 2 | STARTERS ENGLISH TEST - TERM 2 | Look and write. | fifteen\|brother\|sister | https://drive.../15.png | fifteen | Có |
| HK2-NV-01 | 2 | Global Success Lớp 1 - Học kỳ 2 | | | | https://drive.../brother.png | brother | Có |

### `Chon_va_khoanh`

| Mã bài | Thứ tự | Tên khóa học | Link hình ảnh | Lựa chọn A | Lựa chọn B | Đáp án đúng | Đang dùng |
|--------|--------|--------------|---------------|------------|------------|-------------|-----------|
| HK2-CK-01 | 1 | Global Success Lớp 1 - Học kỳ 2 | https://drive.../boy.png | brother | sister | brother | Có |

### `Doc_va_hoan_thanh`

| Mã bài | Thứ tự | Tên khóa học | Hộp từ gợi ý | Nội dung câu | Link hình gợi ý | Đáp án đúng | Đang dùng |
|--------|--------|--------------|--------------|--------------|-------------------|-------------|-----------|
| HK2-DH-01 | 1 | Global Success Lớp 1 - Học kỳ 2 | fifteen\|blanket | I am ___ years old. | https://drive.../num15.png | fifteen | Có |

### `Doc_va_noi`

| Mã bài | Thứ tự | Tên khóa học | Nội dung câu | Link hình ảnh | Nhãn hình | Đáp án đúng | Đang dùng |
|--------|--------|--------------|--------------|---------------|-----------|-------------|-----------|
| HK2-DN-01 | 1 | Global Success Lớp 1 - Học kỳ 2 | I wear my new ___. | https://drive.../shoes.png | A | A | Có |

### `Kiem_tra_tu_vung`

| Mã bài | Thứ tự | Tên khóa học | Hướng dẫn | Hộp từ gợi ý | Link hình ảnh | Đáp án đúng | Đang dùng |
|--------|--------|--------------|-----------|--------------|---------------|-------------|-----------|
| HK2-KT-01 | 1 | Global Success Lớp 1 - Học kỳ 2 | Look at the pictures… | yogurt\|yams\|zoo | https://drive.../yogurt.png | yogurt | Có |

### `Kiem_tra_dung_sai`

| Mã bài | Thứ tự | Tên khóa học | Link hình ảnh | Từ hiển thị | Câu mô tả | Đúng hay sai? | Đang dùng |
|--------|--------|--------------|---------------|--------------|-----------|---------------|-----------|
| HK2-DS-01 | 1 | Global Success Lớp 1 - Học kỳ 2 | https://drive.../question.png | question | This is a question. | Đúng | Có |
| HK2-DS-01 | 2 | Global Success Lớp 1 - Học kỳ 2 | https://drive.../ox.png | fox | This is a fox. | Sai | Có |

---

## 6. So sánh: 1 sheet vs 6 sheet

| | 1 sheet gộp (cũ) | 6 sheet riêng (mới) |
|--|------------------|---------------------|
| Số cột | 18 | 8–9 mỗi sheet |
| Cột trống | Nhiều | Không |
| Người nhập | Phải nhớ cột nào dùng | Mở đúng tab là biết điền gì |
| Code | Đọc 1 sheet + lọc `type` | Đọc 6 sheet, `type` = tên tab |

---

## 7. Backend (`Code.gs`) — gợi ý

```javascript
CONFIG.STARTER_SHEETS = {
  Nhin_va_viet: 'look_and_write',
  Chon_va_khoanh: 'choose_and_circle',
  // ...
};
```

Đọc từng sheet → gom theo `Mã bài` → trả JSON cho frontend (giữ nguyên cấu trúc mục 6 cũ).

---

## 8. Tab `HuongDan`

```
HƯỚNG DẪN NHẬP CÂU HỎI STARTERS
────────────────────────────────
• Mỗi LOẠI GAME có một tab riêng — mở đúng tab cần nhập.
• Mỗi bài chơi = nhiều dòng cùng « Mã bài », « Thứ tự » = 1, 2, 3…
• Hộp từ: cách nhau bằng dấu |  (VD: cat|dog|bird)
• Link ảnh: Drive → Chia sẻ → Bất kỳ ai có liên kết.
• « Đúng hay sai? » = Đúng nếu hình khớp từ+câu; Sai nếu cố ý sai.

CÁC TAB:
  Nhin_va_viet       → Nhìn và viết
  Chon_va_khoanh     → Chọn và khoanh
  Doc_va_hoan_thanh  → Đọc và hoàn thành
  Doc_va_noi         → Đọc và nối
  Kiem_tra_tu_vung   → Kiểm tra từ vựng
  Kiem_tra_dung_sai  → Kiểm tra đúng sai
```

---

*Cập nhật: 08/07/2026 — chuyển từ 1 sheet gộp sang 6 sheet riêng.*

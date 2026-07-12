# Game Trắc Nghiệm – WeWIN Education

Tài liệu ghi nhớ dự án: mục tiêu, cấu trúc cấp độ theo **Cambridge Global Success**, thể loại game và kiến trúc kỹ thuật.

> Cập nhật: 08/07/2026 — bổ sung mục 5: quy tắc thiết kế Sheet (cột tiếng Việt).

---

## 1. Tổng quan

Ứng dụng học tiếng Anh dạng game trắc nghiệm cho học sinh WeWIN Education, chạy trên **Google Apps Script** (backend) + HTML/CSS/JS (frontend), dữ liệu lưu trên **Google Sheets**.

**Mục tiêu chính:**

- Học sinh chọn khóa học theo lớp / cấp độ Cambridge Global Success.
- Làm bài qua các thể loại game (ngữ pháp, trắc nghiệm, phát âm, …).
- Theo dõi tiến độ, điểm số và bảng xếp hạng.

**Đơn vị phát triển:** WeWIN Education  
**Thương hiệu giao diện:** Xanh dương đậm `#0d2b6e`, font Nunito (xem chi tiết trong `FRONTEND.md`).

---

## 2. Cấu trúc cấp độ – Cambridge Global Success

Game được tổ chức theo **2 nhóm độ tuổi**, bám sát chương trình **Cambridge Global Success**.

### 2.1. Nhóm Tiểu học (Lớp 1 → Lớp 5)

| Lớp học | Cấp Cambridge | Ghi chú |
|---------|---------------|---------|
| Lớp 1 | **Starters** | Gộp chung với Lớp 2 |
| Lớp 2 | **Starters** | Gộp chung với Lớp 1 |
| Lớp 3 | **Movers** | Gộp chung với Lớp 4 |
| Lớp 4 | **Movers** | Gộp chung với Lớp 3 |
| Lớp 5 | **Flyers** | Cấp riêng |

**Tóm tắt 3 cấp:**

```
Lớp 1–2  →  Starters
Lớp 3–4  →  Movers
Lớp 5    →  Flyers
```

### 2.2. Nhóm THCS (Lớp 6 → Lớp 9)

Mỗi lớp là **một cấp độ riêng** (4 cấp):

| Lớp học | Cấp độ |
|---------|--------|
| Lớp 6 | Cấp Lớp 6 |
| Lớp 7 | Cấp Lớp 7 |
| Lớp 8 | Cấp Lớp 8 |
| Lớp 9 | Cấp Lớp 9 |

**Tóm tắt:**

```
Lớp 6  →  Cấp Lớp 6
Lớp 7  →  Cấp Lớp 7
Lớp 8  →  Cấp Lớp 8
Lớp 9  →  Cấp Lớp 9
```

### 2.3. Sơ đồ phân cấp

```
Cambridge Global Success
│
├── Tiểu học (Lớp 1–5)
│   ├── Starters  ← Lớp 1, Lớp 2
│   ├── Movers    ← Lớp 3, Lớp 4
│   └── Flyers    ← Lớp 5
│
└── THCS (Lớp 6–9)
    ├── Cấp Lớp 6
    ├── Cấp Lớp 7
    ├── Cấp Lớp 8
    └── Cấp Lớp 9
```

### 2.4. Ánh xạ bộ lọc (dự kiến trên Sheet)

Sheet `Class_Level` và `Courses` sẽ dùng cặp `class` + `level`:

| `class` (cột A) | `level` (cột B) |
|-----------------|-----------------|
| Lớp 1 | Starters |
| Lớp 2 | Starters |
| Lớp 3 | Movers |
| Lớp 4 | Movers |
| Lớp 5 | Flyers |
| Lớp 6 | *(để trống hoặc tên cấp tương ứng sách)* |
| Lớp 7 | *(để trống hoặc tên cấp tương ứng sách)* |
| Lớp 8 | *(để trống hoặc tên cấp tương ứng sách)* |
| Lớp 9 | *(để trống hoặc tên cấp tương ứng sách)* |

> **Lưu ý:** Hệ thống cũ dùng nhãn theo độ tuổi (`3-4 tuổi`, `4-5 tuổi`, …) sẽ được thay bằng nhãn theo **lớp học** như trên.

---

## 3. Thể loại game theo cấp độ

Mỗi cấp có thể có **tập thể loại game khác nhau**, phù hợp trình độ và mục tiêu học tập.

### 3.1. Thể loại hiện có

| Mã | Tên hiển thị | File | Sheet dữ liệu | Mô tả ngắn |
|----|--------------|------|---------------|------------|
| `grammar` | Ngữ pháp | `grammar.html` | `Questions_Grammar` | Điền từ / chọn đáp án ngữ pháp |
| `quiz` | Trắc nghiệm | `multiplechoice.html` | `Questions_Quiz` | Câu hỏi trắc nghiệm đa dạng |
| `pronunciation` | Phát âm | `pronunciation.html` | `Questions_Pronunciation` | Luyện phát âm |

### 3.2. Phân bổ theo cấp

| Cấp | Thể loại game | Ghi chú |
|-----|---------------|---------|
| **Starters** (Lớp 1–2) | 6 dạng game đơn giản (mục 3.4) | Từ vựng cơ bản, hình ảnh lớn, tương tác trực quan |
| **Movers** (Lớp 3–4) | Trắc nghiệm, Ngữ pháp, Phát âm | Tăng độ phức tạp câu và ngữ cảnh |
| **Flyers** (Lớp 5) | Trắc nghiệm, Ngữ pháp, Phát âm | Chuẩn bị chuyển cấp THCS |
| **Lớp 6** | Trắc nghiệm, Ngữ pháp | Có thể bổ sung dạng đọc hiểu |
| **Lớp 7** | Trắc nghiệm, Ngữ pháp | Mở rộng kỹ năng viết / ngữ pháp nâng cao |
| **Lớp 8** | Trắc nghiệm, Ngữ pháp | Ôn luyện theo đề Cambridge |
| **Lớp 9** | Trắc nghiệm, Ngữ pháp | Tổng hợp, luyện thi |

### 3.4. Starters (Lớp 1–2) — Game đơn giản

Cấp **Starters** dùng các dạng bài **đơn giản, trực quan**, bám theo worksheet kiểm tra từ vựng Term 2. Mỗi bài thường có **word bank** (hộp từ) chung và nhiều câu nhỏ trong một lượt chơi.

**Nguyên tắc UX cho Starters:**

- Hình minh họa lớn, màu sắc tươi, nhiều khoảng trắng.
- Từ vựng cơ bản: số, gia đình, quần áo, đồ vật, động từ `-ing` đơn giản.
- Ưu tiên **chạm / kéo-thả / chọn** thay vì gõ phím (có thể hỗ trợ gõ tùy chọn).
- Một bài = một chủ đề từ vựng (vd: family, clothes, numbers).

#### Bảng 6 dạng game Starters

| # | Mã (dự kiến) | Tên tiếng Anh | Tên hiển thị | Cơ chế chơi | Dữ liệu cần có |
|---|--------------|---------------|--------------|-------------|----------------|
| 1 | `look_and_write` | Look and write | Nhìn và viết | Nhìn tranh → chọn/ghi từ đúng từ word bank | `image`, `answer`, `word_bank[]` |
| 2 | `choose_and_circle` | Choose and circle | Chọn và khoanh | Nhìn tranh → chọn 1 trong 2 từ (đúng/sai) | `image`, `options[]` (2 từ), `answer` |
| 3 | `read_and_complete` | Read and complete | Đọc và hoàn thành | Câu có chỗ trống + icon gợi ý → chọn từ word bank | `sentence` (có `___`), `hint_image`, `answer`, `word_bank[]` |
| 4 | `read_and_match` | Read and match | Đọc và nối | Nối câu mô tả với hình đúng (kéo dây hoặc click cặp) | `sentences[]`, `images[]`, `pairs` (map câu ↔ hình) |
| 5 | `vocabulary_test` | Vocabulary test | Kiểm tra từ vựng | Lưới nhiều tranh + word bank — mỗi tranh một từ | `items[]` (image + answer), `word_bank[]` |
| 6 | `vocabulary_check` | Vocabulary check | Kiểm tra đúng/sai | Xem tranh + từ + câu → bấm ✓ (đúng) hoặc ✗ (sai) | `image`, `word`, `sentence`, `is_correct` (boolean) |

#### Mô tả chi tiết từng dạng

**1. Look and write** *(Activity 1 – STARTERS ENGLISH TEST)*

```
Word bank: fifteen | brother | sister | grandmother | shirts | shoes | shorts | tent | teapot | blanket

[ảnh 1] _______    [ảnh 2] _______    …
```

- Học sinh nhìn từng hình và điền/chọn từ phù hợp.
- Digital: kéo từ từ word bank vào ô trống, hoặc tap chọn từ.

**2. Choose and circle** *(Activity 2)*

```
[ảnh cậu bé]     ( brother )  ( sister )   ← chọn 1
[ảnh lều]        ( teapot )   ( tent )
```

- Trắc nghiệm 2 lựa chọn — phù hợp nhất với trẻ nhỏ.
- Digital: tap vào ô từ đúng.

**3. Read and complete** *(Activity 3)*

```
Word bank: fifteen | brother | …

I am ___ years old.          [icon: số 15]
I sleep under a warm ___.    [icon: chăn]
```

- Điền từ vào chỗ trống, có **icon gợi ý** bên cạnh câu.
- Digital: chọn từ từ word bank hoặc kéo-thả.

**4. Read and match** *(Activity 4)*

```
Cột trái (câu)              Cột phải (hình A–E)
I wear my new ___.      ———   [A: giày]
My grandma is very kind. ———  [B: bà]
I like camping in a ___. ———   [C: lều]
…
```

- Nối câu (có thể có chỗ trống) với hình minh họa tương ứng.
- Digital: vẽ đường nối hoặc click cặp (câu ↔ hình).

**5. Vocabulary test** *(VOCABULARY TEST)*

```
"Look at the pictures and write the correct words. Use the words in the box."

┌─────────────────────────────┐
│ yogurt | yams | yo-yos | …  │  ← word bank
└─────────────────────────────┘

[1. ảnh sữa chua] _____   [2. ảnh khoai] _____   …
```

- Lưới 8–10 tranh, mỗi tranh một từ — dùng chung word bank.
- Gần giống *Look and write* nhưng bố cục dạng **bài kiểm tra tổng hợp** nhiều từ cùng chủ đề (chữ cái Y, Z, động từ -ing, …).

**6. Vocabulary check** *(VOCABULARY CHECK)*

```
"Look and read. Put a tick (✓) or a cross (x) in the box."

[ảnh]  question   This is a question.        [ ✓ ] [ ✗ ]
[ảnh con bò]  fox   This is a fox.           [ ✓ ] [ ✗ ]  ← sai (cố ý)
```

- Mỗi dòng: hình + từ + câu — học sinh quyết định **khớp hay không khớp**.
- Một số câu cố ý sai (ảnh ≠ từ) để luyện nhận biết.
- Digital: nút ✓ xanh / ✗ đỏ.

#### Cấu trúc sheet Starters (6 tab riêng)

> **Thiết kế đầy đủ:** xem [`DATABASE_STARTERS.md`](DATABASE_STARTERS.md) — **mỗi loại game một sheet**, 8–9 cột tiếng Việt.

**Tóm tắt:**

| Thành phần | Mô tả |
|------------|-------|
| Tab hướng dẫn | `HuongDan` |
| 6 tab dữ liệu | `Nhin_va_viet`, `Chon_va_khoanh`, `Doc_va_hoan_thanh`, `Doc_va_noi`, `Kiem_tra_tu_vung`, `Kiem_tra_dung_sai` |
| Nhóm bài | Cột **Mã bài** — nhiều dòng = 1 lượt chơi |
| Không cần cột « Loại bài » | Tên tab = loại game |

**Map tab → tên hiển thị:**

| Tên tab | Hiển thị app |
|---------|--------------|
| `Nhin_va_viet` | Nhìn và viết |
| `Chon_va_khoanh` | Chọn và khoanh |
| `Doc_va_hoan_thanh` | Đọc và hoàn thành |
| `Doc_va_noi` | Đọc và nối |
| `Kiem_tra_tu_vung` | Kiểm tra từ vựng |
| `Kiem_tra_dung_sai` | Kiểm tra đúng sai |

> Backend (`Code.gs`) đọc 6 sheet, gắn `type` theo tên tab — người nhập **không cần** cột loại bài hay mã code.

#### File frontend dự kiến

| File | Dạng game |
|------|-----------|
| `starters.html` | Trang hub chọn 6 dạng (hoặc từng dạng một trang con) |
| `starters-look-write.html` | Look and write + Vocabulary test |
| `starters-choose.html` | Choose and circle |
| `starters-complete.html` | Read and complete |
| `starters-match.html` | Read and match |
| `starters-check.html` | Vocabulary check |

> **Trạng thái:** Các dạng trên đã **xác định theo mẫu worksheet**; chưa implement code. Game `grammar` / `quiz` / `pronunciation` hiện tại dùng cho cấp cao hơn hoặc sẽ tách riêng cho Starters sau.

### 3.3. Nguyên tắc gán game cho khóa học

- Mỗi **khóa học** (một dòng trong sheet `Courses`) gắn với `class` + `level` + tên sách/khóa.
- Câu hỏi trong các sheet `Questions_*` lọc theo cột `course`.
- Tiến độ lưu theo `user` + `course` + loại game (`grammar` / `quiz` / `pronunciation`) trong sheet `Progress`.
- Một khóa có thể bật/tắt từng thể loại tùy số câu hỏi thực tế trên Sheet.

---

## 4. Kiến trúc kỹ thuật

### 4.1. Stack

| Thành phần | Công nghệ |
|------------|-----------|
| Backend / API | Google Apps Script (`Code.gs`) |
| Frontend | HTML + CSS + JavaScript (vanilla) |
| Cơ sở dữ liệu | Google Sheets |
| Hosting | Google Apps Script Web App |


### 4.2. Google Sheets

| Sheet | Vai trò |
|-------|---------|
| `User` | Tài khoản đăng nhập |
| `Class_Level` | Bộ lọc Lớp / Cấp độ (dropdown phụ thuộc) |
| `Courses` | Danh mục khóa học theo lớp + cấp |
| `Questions_Grammar` | Ngân hàng câu hỏi ngữ pháp |
| `Questions_Quiz` | Ngân hàng câu trắc nghiệm |
| `Questions_Pronunciation` | Ngân hàng câu phát âm |
| `Questions_Starter` (6 tab) | `Nhin_va_viet`, `Chon_va_khoanh`, … — xem `DATABASE_STARTERS.md` |
| `Progress` | Tiến độ từng học sinh / khóa / game |
| `Leaderboard` | Bảng xếp hạng |
| `ScoreLog` | Nhật ký điểm từng lượt chơi |

### 4.3. File mã nguồn chính

| File | Vai trò |
|------|---------|
| `index.html` | Trang chủ: đăng nhập, danh sách khóa, chi tiết khóa, bảng xếp hạng |
| `grammar.html` | Game ngữ pháp |
| `multiplechoice.html` | Game trắc nghiệm |
| `pronunciation.html` | Game phát âm |
| `GameStyles.html` | CSS dùng chung (nhúng qua GAS `include`) |
| `Code.gs` | API: login, session, lọc khóa, tải câu hỏi, lưu điểm |
| `appsscript.json` | Cấu hình Apps Script |
| `Game Trắc Nghiệm.xlsx` | File Excel tham chiếu / nhập liệu ngoại tuyến |
| `FRONTEND.md` | Quy tắc giao diện, màu sắc, loading state |
| `PROJECT.md` | Tài liệu này – định hướng nghiệp vụ & cấp độ |
| `DATABASE_STARTERS.md` | Schema 6 sheet Starters (mỗi game một tab) |

### 4.4. Luồng người dùng

```
Đăng nhập
    ↓
Chọn Lớp / Cấp độ (Class_Level)
    ↓
Chọn khóa học (Courses)
    ↓
Chọn thể loại game (Ngữ pháp / Trắc nghiệm / Phát âm)
    ↓
Làm bài → Lưu điểm (ScoreLog) + Tiến độ (Progress)
    ↓
Xem bảng xếp hạng (Leaderboard)
```

---

## 5. Quy tắc thiết kế Google Sheet (nhập liệu)

**Yêu cầu cốt lõi:** Sheet là giao diện nhập liệu cho **giáo viên / team nội dung** — không phải cho lập trình viên. Người **không biết code hay database** vẫn phải nhập được dữ liệu một cách tự nhiên.

### 5.1. Nguyên tắc chung

1. **Tên cột bằng tiếng Việt**, ngắn gọn, đúng nghĩa nghiệp vụ.
2. **Không dùng thuật ngữ kỹ thuật** trên header sheet: tránh `id`, `type`, `active`, `is_correct`, `JSON`, `boolean`, `URL` (trừ khi kèm giải thích tiếng Việt rõ ràng).
3. **Giá trị điền bằng tiếng Việt hoặc tiếng Anh học thuật** — tùy nội dung bài (câu hỏi tiếng Anh; trạng thái bật/tắt ghi `Có` / `Không`; đúng/sai ghi `Đúng` / `Sai`).
4. **Một cột = một ý rõ ràng**; tránh gộp nhiều thông tin khó đọc (không bắt người nhập viết JSON).
5. **Cột không bắt buộc để trống** — chỉ điền cột cần cho loại bài đó (vd: « Chọn và khoanh » không cần « Hộp từ gợi ý »).
6. **Hàng 1 luôn là tên cột**; có thể thêm **hàng 2 ghi chú mẫu** (màu xám, in nghiêng) — hàng mẫu không được đọc vào game.
7. **Dropdown / Data validation** cho các cột chọn sẵn: Loại bài, Đang dùng, Đúng hay sai?, Tên khóa học.
8. **Mã hóa nội bộ** (key game, map cột, `true`/`false`) do `Code.gs` xử lý — **không đẩy trách nhiệm này sang người nhập liệu**.

### 5.2. Quy tắc đặt tên cột

| Nên dùng | Tránh dùng |
|----------|------------|
| Mã câu | id, question_id |
| Tên khóa học | course, course_id |
| Loại bài | type, game_type |
| Link hình ảnh | image, image_url |
| Đáp án đúng | answer, correct_answer |
| Đang dùng | active, enabled |
| Đúng hay sai? | is_correct, boolean |
| Hộp từ gợi ý | word_bank, options_pipe |

### 5.3. Hướng dẫn ngắn trên từng sheet

Mỗi sheet nên có **tab « Hướng dẫn »** hoặc **dòng chú thích đầu sheet** giải thích:

- Cột nào bắt buộc cho từng loại bài.
- Cách tách nhiều từ (dùng dấu `|`).
- Cách lấy link ảnh Google Drive (chia sẻ → « Bất kỳ ai có liên kết »).
- Ví dụ 1–2 dòng mẫu đã điền đầy đủ.

### 5.4. Áp dụng cho tất cả sheet

Quy tắc này áp dụng cho **mọi sheet** người dùng sửa tay, không chỉ `Questions_Starter`:

| Sheet (tên file) | Ví dụ tên cột tiếng Việt (hướng tới) |
|------------------|----------------------------------------|
| `Class_Level` | Lớp, Cấp độ, Đang dùng |
| `Courses` | Lớp, Cấp độ, Tên khóa học, Đang dùng |
| `Questions_Starter` | 6 tab: `Nhin_va_viet`, `Chon_va_khoanh`, … (xem `DATABASE_STARTERS.md`) |
| `Questions_Grammar` | Mã câu, Tên khóa học, Câu hỏi, Gợi ý, Đáp án đúng, Đang dùng |
| `Questions_Quiz` | Mã câu, Tên khóa học, Loại câu, Câu hỏi, Đáp án, Đang dùng |
| `Questions_Pronunciation` | Mã câu, Tên khóa học, Từ/câu cần đọc, Link âm thanh mẫu, Đang dùng |
| `User` | Tên đăng nhập, Mật khẩu, Họ tên, Lớp |

> Sheet hệ thống (`Progress`, `ScoreLog`, `Leaderboard`) do **code tự ghi** — có thể giữ tên cột kỹ thuật hoặc tiếng Việt tùy team, nhưng người dùng thường **không sửa tay**.

### 5.5. Trách nhiệm code vs người nhập liệu

```
Người nhập liệu (Sheet)          Code.gs (Backend)
────────────────────────         ─────────────────
Tiếng Việt, dễ hiểu      →      Đọc cột, map sang key nội bộ
Có / Không               →      true / false
Đúng / Sai               →      boolean cho game
Nhìn và viết             →      look_and_write
Link Drive               →      URL ảnh dùng trên web
```

---

## 6. Quy tắc dữ liệu & UX

1. **Không hiển thị dữ liệu giả** trước khi API trả về — luôn có trạng thái loading (xem `FRONTEND.md` mục 9).
2. Dữ liệu thật lấy từ Google Sheet; không hard-code tên khóa / câu hỏi mẫu trên frontend.
3. Bộ lọc Lớp/Cấp độ đọc từ sheet `Class_Level` — cập nhật sheet khi đổi sang cấu trúc lớp 1–9.
4. Điểm số: đúng 50–200 điểm, sai 20–80 điểm, giới hạn 30 giây/câu (cấu hình trong `CONFIG.SCORING`).
5. **Mọi game bắt buộc tính điểm:** mỗi lượt chấm phải gọi `submitAnswerScore` → ghi `ScoreLog` → bảng xếp hạng tổng hợp từ đó. Không chỉ lưu tiến độ (`Progress`) mà bỏ qua điểm.

---

## 7. Việc cần làm (roadmap)

- [ ] Cập nhật sheet `Class_Level`: thay nhãn độ tuổi → **Lớp 1 – Lớp 9** theo mục 2.
- [ ] Cập nhật sheet `Courses`: gán khóa học Global Success cho từng lớp/cấp.
- [ ] Thiết kế sheet theo **mục 5** (cột tiếng Việt, dropdown, tab Hướng dẫn).
- [ ] Tạo 6 sheet Starters theo `DATABASE_STARTERS.md` + tab `HuongDan`.
- [ ] Bổ sung `submitAnswerScore` cho 5 game Starters còn lại (chọn khoanh, đọc hoàn thành, đọc nối, KT từ vựng, KT đúng sai).
- [ ] Nhập ngân hàng câu hỏi Movers/Flyers/THCS vào `Questions_Grammar`, `Questions_Quiz`, `Questions_Pronunciation`.
- [ ] Xác định thể loại game cụ thể cho Movers, Flyers, THCS.
- [ ] Đồng bộ `FRONTEND.md` mục 10 (sample filter) với cấu trúc lớp mới.

---

## 8. Tham chiếu nhanh

| Khái niệm | Giá trị |
|-----------|---------|
| Chương trình | Cambridge Global Success |
| Tiểu học | Lớp 1–5 → Starters / Movers / Flyers |
| THCS | Lớp 6–9 → mỗi lớp một cấp |
| Game Starters | `look_and_write`, `choose_and_circle`, `read_and_complete`, `read_and_match`, `vocabulary_test`, `vocabulary_check` |
| Game cấp cao | `grammar`, `quiz`, `pronunciation` |
| API backend | `Code.gs` (Google Apps Script) |
| Sheet nhập liệu | Cột tiếng Việt, dễ hiểu (mục 5) |

---

*Tài liệu này dùng làm nguồn tham chiếu khi phát triển tính năng, nhập liệu Sheet và trao đổi với team nội dung.*

# Design: Parent Portal → Game Trắc Nghiệm SSO

**Ngày:** 2026-07-15  
**Goal:** Từ Parent Portal (`wewin.baobai.edu.vn`), phụ huynh đã đăng nhập bấm nút thứ hai mở game trắc nghiệm trong tab mới, tự đăng nhập; nếu chưa có user thì tạo mới.

## Quyết định đã chốt

| Mục | Quyết định |
|-----|------------|
| Mở game | Tab mới (không iframe) |
| Username | = mã học viên (SID) |
| Auth | JWT HS256 ngắn hạn, secret chung portal ↔ game |
| Password tài khoản game | = mã truy cập portal (thường `123`); sync khi SSO |
| Nút hiện tại | Giữ nguyên iframe → `wewin-game.vercel.app` |
| Nút mới | “Mở game trắc nghiệm” → `game-trac-nghiem-*.vercel.app` |

## Luồng

```
Portal (đã login)
  → JSONP action=game_sso_token (studentId, accessCode, name)
  → Apps Script ký JWT { sid, name, pwd, iat, exp≈180s }
  → window.open(GAME_URL/api/auth/portal-sso?token=…)
  → Next.js verify JWT (PORTAL_SSO_SECRET)
  → upsert User(username=sid, passwordHash từ pwd, displayName=name, role=student)
  → set cookie wewin_session → redirect /
```

## Bảo mật

- Secret chỉ nằm trong Apps Script `CFG.GAME_SSO_SECRET` và Vercel `PORTAL_SSO_SECRET` (không commit giá trị production vào GitHub Pages).
- Token hết hạn ~3 phút; một lần dùng đủ để set cookie.
- Từ chối SSO nếu username trùng user `admin` đã có.
- Không escalate role: portal SSO luôn `student`.

## Thay đổi file

**Portal (`baobaiwewin/`):**
- `index.html` — nút + handler mở tab
- `code.gs.txt` — `game_sso_token` + ký JWT

**Game (`.worktrees/nextjs-migration/web/`):**
- `lib/portalSso.ts` — verify + upsert
- `app/api/auth/portal-sso/route.ts` — GET handler
- `middleware.ts` — allowlist route
- `.env.example` — `PORTAL_SSO_SECRET`

## Ngoài scope

- Đổi SSO của `wewin-game` (iframe) sang JWT
- Đổi mật khẩu portal từ phía game

# iuh-grade-notifier

Báo điểm IUH (qua API OneUni) lên **Discord webhook** mỗi khi giảng viên cập nhật điểm.
Chạy định kỳ trên **GitHub Actions**, so sánh với lần chạy trước, chỉ báo khi có điểm mới/đổi.
Repo public → state điểm được **mã hoá AES-256-GCM** trước khi commit.

## Cách hoạt động

1. Login OAuth2 password grant (OneUni / OpenIddict), decode JWT lấy `idSinhVien`.
2. `KetQuaHocTap` → list môn theo kỳ → `KetQuaHocTapChiTiet` từng môn → `DanhGiaRenLuyen`.
3. Chuẩn hoá mỗi ô điểm thành cell, dựng snapshot, so với snapshot cũ (giải mã từ `state/grades.enc`).
4. Mọi giá trị mới xuất hiện / bị sửa → gom vào **1 tin Discord** (mỗi môn 1 embed).
   Môn vừa có "Điểm tổng kết" → embed vàng nổi bật. Điểm rèn luyện → embed tím.
5. Mã hoá snapshot mới, commit ngược vào repo. Lần đầu chỉ tạo baseline, **không gửi**.

## Secrets (Settings → Secrets and variables → Actions)

| Secret | Ví dụ |
|---|---|
| `ONEUNI_USERNAME` | `<MSSV>IUH` (`<MSSV><loại><trường>`) |
| `ONEUNI_PASSWORD` | mật khẩu SV |
| `ONEUNI_CLIENT_SECRET` | `LcC4X5PeQ<MiQ;L` |
| `STATE_ENCRYPTION_KEY` | `openssl rand -base64 32` (đã set tự động) |
| `DISCORD_WEBHOOK_URL` | `https://discord.com/api/webhooks/...` |
| `DISCORD_ALERT_WEBHOOK` | (tuỳ chọn) webhook báo bot chết |

4 secret nhạy cảm set bằng `bash setup-secrets.sh` (giá trị nhập tay, không qua git).

## Chạy

- Tự động: cron `0 1 * * *` = 08:00 VN mỗi ngày.
- Tay/test: tab **Actions → check-grades → Run workflow**, chọn `mode = test`.
  TEST_MODE login + load điểm có sẵn + gửi 1 tin `🧪 [TEST]`, **không đụng** state.
- Local: `TEST_MODE=1 node src/index.js` (cần các env ở trên).

## Config (env, có mặc định)

`URL_UNI`, `AUTH_BASE`, `CLIENT_ID`, `SCOPE`, `TEST_SUBJECT_COUNT` (mặc định 3),
`NOTIFY_ON_FIRST_RUN` (mặc định tắt). Đổi `URL_UNI` + `ONEUNI_USERNAME` để trường khác dùng OneUni.

## Test

```bash
node --test
```

## Ghi chú

- `sv.iuh.edu.vn` thiếu intermediate CA → app đặt `NODE_TLS_REJECT_UNAUTHORIZED=0` (mục 2c spec).
- Mỗi run ghi `state/last_checked.txt` để repo có commit đều → scheduled workflow không bị GitHub tắt sau 60 ngày.
- Không log điểm/mật khẩu; state chỉ lưu dạng mã hoá.

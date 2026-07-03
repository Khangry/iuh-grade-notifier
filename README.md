# 📊 Báo điểm IUH qua Discord

App tự động kiểm tra điểm trên **OneUni** (Đại học Công nghiệp TP.HCM) và **nhắn lên Discord** mỗi khi có điểm mới hoặc điểm bị sửa. Chạy tự động mỗi ngày, **miễn phí**, không cần bật máy tính.

> Hướng dẫn này viết cho người **không biết gì về code**. Cứ làm từng bước, không cần cài gì lên máy, làm hết trên trình duyệt. Mất khoảng **15 phút**.

---

## Bạn cần chuẩn bị

1. **Tài khoản GitHub** (miễn phí) → tạo tại https://github.com/signup
2. **1 server Discord** của riêng bạn (để nhận thông báo). Chưa có thì mở app Discord → bấm dấu **+** bên trái → *Tạo máy chủ của tôi*.
3. **Tài khoản đăng nhập OneUni** (mã số sinh viên + mật khẩu bạn hay dùng để xem điểm).

---

## Bước 1 — Sao chép app về tài khoản của bạn (Fork)

1. Mở trang app: **https://github.com/Khangry/iuh-grade-notifier**
2. Góc trên bên phải, bấm nút **Fork**.
3. Ở trang hiện ra, bấm **Create fork**.

Xong. Giờ bạn có bản sao app trong tài khoản GitHub của mình. Mọi bước sau làm trên **bản sao của bạn**.

---

## Bước 2 — Lấy đường link Discord (Webhook)

Đây là "địa chỉ" để app gửi tin nhắn vào Discord của bạn.

1. Mở Discord, vào server của bạn.
2. Chọn 1 kênh (channel) muốn nhận điểm, bấm ⚙️ **Chỉnh sửa kênh** (biểu tượng bánh răng cạnh tên kênh).
3. Chọn **Tích hợp (Integrations)** → **Webhook** → **Tạo Webhook (New Webhook)**.
4. Bấm **Sao chép URL Webhook (Copy Webhook URL)**.
5. Dán tạm URL này vào Ghi chú / Notepad. Lát nữa dùng. (Dạng: `https://discord.com/api/webhooks/...`)

---

## Bước 3 — Chuẩn bị 5 thông tin để điền

Mở Notepad, chuẩn bị sẵn 5 dòng sau (lát copy dán vào GitHub):

| Tên | Giá trị điền vào | Lấy ở đâu |
|---|---|---|
| `ONEUNI_USERNAME` | `<MSSV>` + `IUH`, ví dụ `<MSSV>IUH` | Mã số sinh viên của bạn, viết liền chữ `IUH` phía sau |
| `ONEUNI_PASSWORD` | mật khẩu OneUni của bạn | Mật khẩu bạn đăng nhập xem điểm |
| `ONEUNI_CLIENT_SECRET` | `LcC4X5PeQ<MiQ;L` | Điền y hệt (dùng chung cho mọi SV IUH) |
| `DISCORD_WEBHOOK_URL` | link ở **Bước 2** | Đã copy ở trên |
| `STATE_ENCRYPTION_KEY` | 1 chuỗi ngẫu nhiên (xem Bước 4) | Tự tạo ở Bước 4 |

> ⚠️ 5 thông tin này là **bí mật**. Không đưa cho ai, không đăng lên đâu. GitHub sẽ giữ kín (mã hoá) cho bạn.

---

## Bước 4 — Tạo "chìa khoá mã hoá" (STATE_ENCRYPTION_KEY)

App lưu điểm cũ để so sánh, và **mã hoá** trước khi lưu (vì bản sao repo để công khai). Bạn cần 1 chuỗi khoá ngẫu nhiên.

**Cách dễ nhất (Windows, không cài gì):**
1. Bấm nút **Start**, gõ `PowerShell`, mở **Windows PowerShell**.
2. Dán dòng này vào rồi Enter:
   ```powershell
   [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   ```
3. Nó in ra 1 chuỗi kiểu `k9Zx...=`. **Copy toàn bộ chuỗi đó** — đây là `STATE_ENCRYPTION_KEY`.

> Không dùng được PowerShell? Vào https://generate.plus/en/base64 → chọn 32 bytes → Generate → copy kết quả.

---

## Bước 5 — Điền 5 thông tin vào GitHub

1. Vào bản sao repo của bạn (tài khoản của bạn → repo `iuh-grade-notifier`).
2. Bấm tab **Settings** (⚙️, trên cùng).
3. Menu trái: **Secrets and variables** → **Actions**.
4. Bấm nút xanh **New repository secret**.
5. Với **từng** dòng trong bảng ở Bước 3:
   - **Name**: gõ tên (vd `ONEUNI_USERNAME`) — gõ **chính xác**, viết hoa, có dấu gạch dưới.
   - **Secret**: dán giá trị.
   - Bấm **Add secret**.
6. Lặp lại đủ **5 lần** cho 5 secret.

Xong thì trang này phải hiện đủ 5 dòng:
`ONEUNI_USERNAME`, `ONEUNI_PASSWORD`, `ONEUNI_CLIENT_SECRET`, `DISCORD_WEBHOOK_URL`, `STATE_ENCRYPTION_KEY`.

---

## Bước 6 — Bật tính năng tự chạy (Actions)

1. Trong repo, bấm tab **Actions** (trên cùng).
2. Nếu thấy nút **"I understand my workflows, go ahead and enable them"** → bấm vào.

---

## Bước 7 — Chạy thử để kiểm tra

Kiểm tra app login được + gửi Discord được (chưa cần chờ điểm mới):

1. Tab **Actions** → menu trái chọn **check-grades**.
2. Bên phải bấm nút **Run workflow**.
3. Ô **mode** chọn **test** → bấm nút xanh **Run workflow**.
4. Chờ ~30 giây, refresh trang. Dòng chạy hiện **dấu ✓ xanh** = thành công.
5. Mở Discord kiểm tra: phải có tin **🧪 [TEST] Kiểm tra pipeline** kèm vài môn điểm.

- ✓ xanh + có tin Discord → **cài đặt xong!**
- ✗ đỏ → xem mục **Gặp lỗi** bên dưới.

---

## Xong! Từ giờ app tự làm gì?

- **Mỗi ngày 8h sáng** (giờ VN) app tự kiểm tra điểm.
- Có điểm **mới** hoặc điểm bị **sửa** → gửi ngay 1 tin lên Discord.
  - Điểm thành phần (thường xuyên, giữa kỳ, thực hành...) → tin **xanh**.
  - Môn vừa có **điểm tổng kết** → tin **vàng** nổi bật kèm điểm chữ, xếp loại.
  - **Điểm rèn luyện** thay đổi → tin **tím**.
- Không có gì mới → **im lặng**, không spam.
- Lần chạy đầu chỉ ghi nhận điểm hiện có làm mốc, **không gửi** (tránh spam toàn bộ điểm cũ).

Không cần làm gì thêm. Muốn bấm chạy tay lúc nào thì làm lại **Bước 7** (chọn mode **normal**).

---

## Gặp lỗi? (Troubleshooting)

Vào tab **Actions** → bấm vào lần chạy bị ✗ đỏ → bấm bước **Run grade checker** để xem dòng lỗi.

| Dòng lỗi có chữ | Nguyên nhân | Cách sửa |
|---|---|---|
| `Đăng nhập thất bại` / `invalid_grant` | Sai username / password / client_secret | Kiểm tra lại 3 secret. Username phải có `IUH` ở cuối. Client secret điền y hệt `LcC4X5PeQ<MiQ;L` |
| `STATE_ENCRYPTION_KEY phải là 32 byte` | Khoá mã hoá sai | Làm lại **Bước 4**, tạo khoá mới, cập nhật secret |
| `Discord HTTP 401/404` | Link webhook sai hoặc đã bị xoá | Làm lại **Bước 2**, cập nhật `DISCORD_WEBHOOK_URL` |
| `Thiếu config bắt buộc` | Thiếu 1 secret | Kiểm tra đủ 5 secret ở **Bước 5**, tên gõ đúng |

Sửa secret: **Settings → Secrets and variables → Actions** → bấm tên secret → **Update**.

> **Lưu ý:** GitHub tự tắt lịch chạy nếu repo 60 ngày không có hoạt động. App đã tự chống điều này (mỗi ngày ghi 1 mốc thời gian). Nếu lỡ bị tắt, GitHub gửi email — bạn chỉ cần vào tab **Actions** bấm **Enable**.

---

## Dành cho người biết dùng terminal (tuỳ chọn)

Không muốn điền secret bằng tay trên web? Cài [GitHub CLI](https://cli.github.com/), rồi trong thư mục repo:

```bash
bash setup-secrets.sh                                   # nhập 4 secret nhạy cảm
openssl rand -base64 32 | gh secret set STATE_ENCRYPTION_KEY
gh workflow run check-grades.yml -f mode=test           # chạy thử
```

Chạy test ở máy: `TEST_MODE=1 node src/index.js` (cần Node.js 20+ và các biến môi trường tương ứng).
Chạy bộ test: `node --test`.

## App hoạt động thế nào (tóm tắt kỹ thuật)

Login OneUni (OAuth2) → đọc `KetQuaHocTap` + `KetQuaHocTapChiTiet` từng môn + `DanhGiaRenLuyen` → dựng "ảnh chụp" điểm → so với ảnh lần trước (giải mã từ `state/grades.enc`) → điểm mới/đổi thì gửi Discord → mã hoá lưu lại. Toàn bộ chạy trên GitHub Actions. Không lưu điểm/mật khẩu dạng đọc được, không in ra log công khai.

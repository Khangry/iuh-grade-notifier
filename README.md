# IUH Grade Notifier

Tự động kiểm tra dữ liệu OneUni của IUH và gửi thông báo Discord khi có thay đổi. Ứng dụng được thiết kế để chạy miễn phí trên GitHub Actions mỗi ngày lúc **08:00 giờ Việt Nam** (GitHub có thể chạy trễ khi hệ thống quá tải).

Theo dõi ba loại dữ liệu:

- Điểm thành phần, điểm tổng kết, điểm chữ và xếp loại của từng lớp học phần.
- Điểm rèn luyện.
- Phiếu thu học phí mới, kèm liên kết hóa đơn PDF nếu OneUni trả về.

Lần chạy bình thường đầu tiên chỉ tạo mốc so sánh; sẽ không gửi toàn bộ điểm cũ lên Discord. Các lần sau, app chỉ thông báo giá trị mới hoặc bị thay đổi; ô bị xoá/rỗng được bỏ qua để tránh báo sai.

## Cách hoạt động

```text
GitHub Actions → đăng nhập OneUni → lấy dữ liệu điểm/phiếu thu
               → so với state đã mã hoá → Discord webhook
               → cập nhật state đã mã hoá vào repository
```

State được lưu tại `state/grades.enc`, mã hoá bằng AES-256-GCM. Mật khẩu OneUni, webhook và khoá mã hoá được lấy từ GitHub Secrets, không ghi vào source code hay log. `state/last_checked.txt` chỉ lưu thời điểm chạy để workflow có commit định kỳ.

## Cài đặt trên GitHub

### 1. Fork repository

Fork repository này về tài khoản GitHub của bạn. Các thay đổi state sẽ được commit vào bản fork đó, vì vậy Actions cần quyền ghi nội dung repository.

### 2. Tạo Discord webhook

Trong Discord, chọn kênh muốn nhận thông báo:

`Chỉnh sửa kênh` → `Tích hợp` → `Webhook` → `Tạo webhook` → `Sao chép URL webhook`.

Không chia sẻ URL này; bất kỳ ai có URL đều có thể gửi tin nhắn vào kênh.

### 3. Khai báo GitHub Secrets

Vào repository fork → `Settings` → `Secrets and variables` → `Actions` → `New repository secret`, rồi thêm các secret sau.

| Secret | Bắt buộc | Nội dung |
| --- | :---: | --- |
| `ONEUNI_USERNAME` | Có | Tên đăng nhập OneUni (thường là MSSV nối `IUH`, ví dụ `12345678IUH`). |
| `ONEUNI_PASSWORD` | Có | Mật khẩu OneUni. |
| `ONEUNI_CLIENT_SECRET` | Có | Client secret của OneUni dùng cho đăng nhập mobile. |
| `DISCORD_WEBHOOK_URL` | Có | URL webhook Discord ở bước trước. |
| `STATE_ENCRYPTION_KEY` | Có khi chạy normal | Khoá Base64 gồm đúng 32 byte để mã hoá state. |
| `DISCORD_ALERT_WEBHOOK` | Không | Webhook riêng nhận cảnh báo khi app gặp lỗi. |

Tạo `STATE_ENCRYPTION_KEY` trên PowerShell (Windows):

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Giữ nguyên khoá này sau khi app đã chạy. Đổi khoá làm state cũ không thể giải mã; nếu cần đổi, hãy xoá `state/grades.enc` trong fork rồi để app tạo baseline mới.

### 4. Bật và chạy thử workflow

Vào tab `Actions`, bật workflows nếu GitHub yêu cầu. Chọn workflow **check-grades** → `Run workflow` → chọn `test` → `Run workflow`.

Chế độ `test` thực hiện đăng nhập và tải dữ liệu thật, sau đó gửi vài môn thuộc kỳ gần nhất (và vài phiếu thu nếu có) với tiền tố `🧪`. Chế độ này không đọc hay ghi state, nên không tạo thông báo “điểm mới” giả.

Sau khi test thành công, workflow tự chạy hằng ngày. Có thể chạy thủ công ở chế độ `normal` bất kỳ lúc nào.

## Nội dung thông báo

| Trường hợp | Hiển thị Discord |
| --- | --- |
| Điểm thành phần mới/sửa | Embed xanh `📊`, hiển thị điểm cũ → điểm mới khi có sửa. |
| Môn vừa có điểm tổng kết | Embed vàng `✅`, gom điểm tổng kết, thang 4, điểm chữ, xếp loại và đạt/không đạt. |
| Điểm rèn luyện thay đổi | Embed tím `📋`. |
| Phiếu thu mới | Embed cam `💸`, định dạng tiền VND và liên kết PDF hóa đơn. |

Discord giới hạn tối đa 10 embeds mỗi tin nhắn; app tự chia thành nhiều tin khi cần.

## Chạy cục bộ

Yêu cầu Node.js 20 trở lên. Repo không có dependency runtime nên không cần cài package để chạy; vẫn có thể dùng `npm test` để chạy test suite.

```bash
npm test
```

Khai báo các biến môi trường bắt buộc trước khi chạy. Chạy test pipeline là lựa chọn an toàn vì không sửa `state/`:

```powershell
$env:ONEUNI_USERNAME = '...'
$env:ONEUNI_PASSWORD = '...'
$env:ONEUNI_CLIENT_SECRET = '...'
$env:DISCORD_WEBHOOK_URL = '...'
$env:TEST_MODE = '1'
node src/index.js
```

Để chạy chế độ bình thường, thêm `STATE_ENCRYPTION_KEY` và bỏ `TEST_MODE`. Chế độ này tạo/cập nhật `state/grades.enc` cùng `state/last_checked.txt` trong thư mục hiện hành.

Các biến cấu hình nâng cao (thường không cần đặt):

| Biến | Mặc định | Mục đích |
| --- | --- | --- |
| `AUTH_BASE` | `https://mobile.oneuni.com.vn` | Máy chủ xác thực OneUni. |
| `URL_UNI` | `https://sv.iuh.edu.vn/AppSVGV/` | API trường. |
| `CLIENT_ID` | `mobile_flutter` | OAuth client ID. |
| `SCOPE` | `offline_access openid` | OAuth scope. |
| `TEST_SUBJECT_COUNT` | `3` | Số môn và số phiếu thu tối đa gửi trong test mode. |
| `NOTIFY_ON_FIRST_RUN` | Không bật | Đặt `1` để gửi tin xác nhận sau khi baseline được tạo. |

## Xử lý sự cố

| Lỗi | Cách kiểm tra |
| --- | --- |
| `Thiếu config bắt buộc` | Kiểm tra tên và giá trị các GitHub Secrets bắt buộc. |
| `Đăng nhập thất bại` hoặc `invalid_grant` | Kiểm tra username, password và client secret OneUni. |
| `STATE_ENCRYPTION_KEY phải là 32 byte` | Tạo lại khoá Base64 từ đúng 32 byte; không dùng một chuỗi văn bản bất kỳ. |
| Không giải mã được state | Khoá hiện tại khác khoá đã dùng để ghi `state/grades.enc`; khôi phục khoá cũ hoặc xoá file state để baseline lại. |
| `Discord HTTP 401` / `404` | Webhook không hợp lệ, bị xoá hoặc đã bị lộ; tạo webhook mới và cập nhật secret. |

Mở lần chạy lỗi tại `Actions` → **check-grades** → bước **Run grade checker** để xem thông báo. Ứng dụng không chủ động in mật khẩu hoặc nội dung điểm vào log; nếu cấu hình `DISCORD_ALERT_WEBHOOK`, lỗi cũng được gửi tới webhook đó theo cơ chế best-effort.

## Lưu ý bảo mật và vận hành

- Không commit `.env`, secrets hoặc URL webhook. `.gitignore` đã loại trừ các file local thông dụng.
- Workflow commit ciphertext vào fork của bạn. Không thể đọc điểm từ `state/grades.enc` nếu không có `STATE_ENCRYPTION_KEY`.
- Khi API trả về 401, app đăng nhập lại và thử lại request một lần. Nếu một môn, điểm rèn luyện hoặc phiếu thu lỗi riêng lẻ, phần đó bị bỏ qua để các dữ liệu khác vẫn được lưu.
- `src/index.js` hiện tắt xác thực chứng chỉ TLS cho toàn bộ process để tương thích endpoint IUH đang thiếu intermediate CA. Điều này làm giảm an toàn khi chạy trên mạng không tin cậy; chỉ nên chạy workflow trong môi trường GitHub Actions hoặc khi bạn hiểu rủi ro.

## Phát triển

```bash
npm test
npm start
```

Test suite dùng mock cho OneUni và Discord, bao phủ đăng nhập, API retry, snapshot, diff, định dạng Discord, mã hoá state và các kịch bản tích hợp. `npm start` tương đương `node src/index.js` và cần các biến môi trường tương ứng với chế độ chạy.

## License

Package metadata khai báo giấy phép MIT. Repository hiện chưa có tệp `LICENSE` riêng.

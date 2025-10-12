# KLC Bến Lức – Hướng dẫn triển khai nhanh

Tài liệu này giải thích các bước tiếp theo sau khi đã tạo project Firebase `klc-ben-luc-crm` để trang nội bộ hoạt động đầy đủ và đồng bộ giữa các thiết bị.

## 1. Bật cơ sở dữ liệu Firestore
1. Trong Firebase console, chọn **Build → Firestore Database**.
2. Nhấn **Create database** → chọn **Production mode** (giữ vùng mặc định). 
3. Hoàn tất wizard, Firestore sẽ tạo sẵn collection rỗng.

> ⚠️ Ở chế độ Production, mọi truy cập đều bị chặn tới khi bạn cập nhật luật bảo mật ở bước 4.

## 2. Khởi tạo dữ liệu người dùng
1. Mở trang web KLC Bến Lức (phiên bản GitHub Pages hoặc chạy `index.html` cục bộ).
2. Trình duyệt sẽ tự gọi hàm `seedDefaultUsers` để tạo 2 tài khoản đầu tiên trong collection `users`:
   - **admin / 123456** – quyền Quản trị viên.
   - **nhanvien / 1234** – quyền Nhân viên.
3. Vào Firestore → tab **Data** kiểm tra collection `users` đã xuất hiện.

Nếu bạn xoá collection này, chỉ cần tải lại trang web để lệnh seed chạy lại.

## 3. Kết nối trang với Firestore
1. Trong Firebase console, mở **Project settings → Your apps**.
2. Kiểm tra app web đã hiển thị đúng cấu hình (apiKey, authDomain, …). Những giá trị này đã được nhập sẵn trong `assets/js/app.js`, nên bạn chỉ cần đảm bảo chúng trùng khớp.
3. Từ lúc này, mọi biểu mẫu sẽ đọc/ghi dữ liệu theo thời gian thực lên Firestore.

## 4. Cập nhật luật bảo mật Firestore
Trang web đang sử dụng Firestore trực tiếp trên trình duyệt, vì vậy bạn phải tự đặt luật cho phép truy cập. Để bắt đầu nhanh (và chỉ nên dùng nội bộ), vào tab **Rules** và dán mẫu sau:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Sau khi xác nhận mọi thứ chạy ổn, bạn nên siết luật lại, ví dụ chỉ cho phép khi có header bí mật hoặc trường `active` của người dùng.

## 5. Bật đồng bộ và sao lưu Google Drive
1. Trong trang web → **Thiết lập hệ thống → Kết nối**.
2. Điền **ID thư mục Drive** (chuỗi cuối URL). 
3. Tạo Google Apps Script mới với hàm `doPost(e)` để nhận JSON và ghi file vào thư mục đó. Triển khai web app ở chế độ **Anyone**.
4. Dán URL web app vào ô **Webhook Google Drive**, nhấn **Lưu cấu hình**.
5. Dùng nút **Sao lưu lên Drive** để kiểm tra dữ liệu được gửi thành công.

## 6. Kiểm tra các phân hệ
- **Tổng quan:** đổi bộ lọc thời gian, biểu đồ sẽ tự cập nhật khi Firestore có dữ liệu mới.
- **Khách hàng/CSKH/Bảo hành/Checklist/Tồn kho/Thu & Chi:** thử thêm bản ghi và mở trang ở thiết bị khác để thấy dữ liệu cập nhật ngay.
- **Thiết lập hệ thống:**
  - Thay màu chủ đạo hoặc tải logo mới → giao diện sẽ đổi tức thì và lưu trong `localStorage`.
  - Quản lý nhân viên: thêm thành viên mới, trạng thái sẽ đồng bộ sang tab khác.

## 7. Triển khai lại lên GitHub Pages
1. Commit và push thay đổi lên nhánh chính của repo GitHub.
2. Đảm bảo GitHub Pages đang trỏ vào thư mục gốc (`/`).
3. Sau vài phút build, tải lại trang `https://dat150802.github.io/Dat150802/` để sử dụng bản mới.

---
Nếu bạn gặp lỗi "permission denied" hoặc không thấy dữ liệu đồng bộ, hãy kiểm tra lại **Rules** và chắc chắn bạn đang mở đúng project Firebase `klc-ben-luc-crm` như trong hình chụp màn hình.

# KLC Bến Lức – Nền tảng quản trị đồng bộ thời gian thực

Ứng dụng nội bộ của KLC Bến Lức đã được chuyển hóa thành SPA hiện đại chạy hoàn toàn trên trình duyệt nhưng đồng bộ dữ liệu qua Firebase Firestore và sao lưu với Google Drive. Người dùng có thể đăng nhập bằng Firebase Auth, theo dõi dữ liệu realtime trên mọi thiết bị và xuất snapshot lên Drive chỉ với một cú nhấp chuột.

## Kiến trúc & Công nghệ

- **Frontend**: HTML thuần + JavaScript, Tailwind-style utilities trong `styles.css`, Chart.js CDN, Sortable.js cho kéo thả bố cục.
- **Realtime backend**: Firebase Firestore (compat SDK) với các collection: `users`, `customers`, `care`, `warranties`, `maintenances`, `tasks`, `inventory`, `finance`, `approvals`, `layouts`, `branding`, `logs`.
- **Đăng nhập**: Firebase Auth (Email/Password). Người dùng có thể chọn nhớ đăng nhập (Local persistence) hoặc chỉ giữ trong phiên.
- **Sao lưu**: Google Apps Script Web App nhận JSON và ghi vào thư mục Drive ID `1Khqq8amrAJ1qrLCRXVAnqN4M0vuPM8PO`.
- **Triển khai**: GitHub Pages hoặc bất kỳ static host nào – chỉ cần cung cấp `config.js` với thông số Firebase + Apps Script.

## Thiết lập nhanh

1. **Cài đặt phụ thuộc tĩnh**
   ```bash
   cp config.example.js config.js
   ```
   Cập nhật `config.js` với thông tin Firebase & Apps Script của bạn.

2. **Chạy thử cục bộ**
   ```bash
   npx serve
   # hoặc
   python -m http.server 8000
   ```
   Sau đó truy cập http://localhost:8000 (hoặc port tương ứng).

3. **Triển khai**
   - Đẩy toàn bộ mã nguồn (trừ `config.js`) lên GitHub.
   - Bật GitHub Pages cho nhánh `main` với thư mục gốc `/`.
   - Upload riêng file `config.js` vào phần “Secrets” của hosting (ví dụ dùng GitHub Actions copy) hoặc lưu tại server tĩnh.

## Cấu hình Firebase

1. Tạo project Firebase mới, bật Firestore (chế độ production) và Firebase Authentication (Email/Password).
2. Lấy thông tin cấu hình Web app (apiKey, authDomain, projectId, ...) và điền vào `config.js`.
3. Thiết lập **Security Rules** cơ bản:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if false;
       }
       match /users/{userId} {
         allow read: if request.auth != null;
         allow create: if request.auth != null;
         allow update, delete: if request.auth != null &&
           (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
            request.auth.uid == userId);
       }
       match /{collection}/{docId} {
         allow read: if request.auth != null;
         allow create: if request.auth != null;
         allow update, delete: if request.auth != null && (
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
           request.resource.data.createdBy == request.auth.uid
         );
       }
     }
   }
   ```
4. Tạo tài khoản nhân viên mẫu (tùy chọn). Nếu chưa có quản trị viên, giao diện sẽ hiển thị form “Tạo quản trị viên đầu tiên” ngay sau khi khởi động.

## Ứng dụng Google Apps Script cho sao lưu

1. Mở [Google Apps Script](https://script.google.com/) → “New project”.
2. Thay nội dung `Code.gs` bằng mẫu trong tài liệu dự án (xem `config.example.js`).
3. Chạy `Deploy > Test deployments > Web app`, cấp quyền “Anyone with the link”.
4. Sao chép URL triển khai và điền vào `BACKUP_ENDPOINTS` trong `config.js`:
   ```js
   export const BACKUP_ENDPOINTS = {
     upload: 'https://script.google.com/macros/s/ID/exec',
     latest: 'https://script.google.com/macros/s/ID/exec?action=latest'
   };
   ```
5. Kiểm tra bằng cách đăng nhập quản trị viên → mục **Tùy chỉnh → Sao lưu & Google Drive** → “Xuất sao lưu”. File JSON sẽ xuất hiện trong thư mục Drive đã định.

## Tính năng chính

- **Đăng nhập & phân quyền**: Nhớ phiên, tự seed admin, nhân viên chỉ thấy menu cho phép.
- **Đồng bộ realtime**: Mọi form (khách hàng, CSKH, tồn kho, thu chi, checklist, …) sử dụng `onSnapshot` nên thiết bị khác nhìn thấy ngay.
- **Checklist công việc**: Checklist → Lịch làm việc → Báo cáo liên thông, báo cáo dựa trên hạng mục đã giao.
- **Bố cục kéo thả**: Trang chủ có chế độ “Chỉnh bố cục” (drag-and-drop) lưu theo từng người dùng vào collection `layouts`.
- **Sao lưu Drive**: Snapshot toàn bộ collection chỉ với một cú nhấp chuột, xem tên bản gần nhất ngay trong UI.
- **Migration**: Nếu trình duyệt còn dữ liệu `localStorage` từ phiên bản cũ, banner “Di chuyển lên cloud” sẽ xuất hiện để chuyển lên Firestore.
- **Nhật ký thao tác**: Mỗi hành động lưu/xóa ghi vào collection `logs` phục vụ audit.

## Tips vận hành

- **Tài khoản mẫu**: tạo `admin@example.com / 12345678` và `nv@example.com / 12345678` trong Firebase để demo.
- **Cập nhật thương hiệu**: chỉnh sửa file `config.js` (`BRAND.primary`, `BRAND.accent`) để đổi màu nhận diện.
- **Phân trang/giới hạn**: Firestore đang đọc tối đa 100 bản ghi mỗi lần; mở rộng bằng cách chỉnh lại truy vấn trong `app.js` khi cần.
- **Triển khai HTTPS**: Firebase Auth yêu cầu origin an toàn – hãy luôn dùng HTTPS khi triển khai thực tế.

## Thư mục & cấu trúc

```
├── index.html          # Giao diện chính (SPA)
├── checklist.html      # Lối tắt vào module Checklist
├── styles.css          # Phong cách chủ đạo, responsive
├── app.js              # Logic SPA + Firebase + đồng bộ
├── assets/             # Logo và hình ảnh liên quan
├── config.example.js   # Mẫu cấu hình Firebase/GAS
└── package.json        # Đặt chế độ ES module cho kiểm tra cú pháp
```

Sao chép `config.example.js` thành `config.js` và KHÔNG commit file chứa secret.

## Kiểm thử khuyến nghị

- Đăng nhập bằng hai trình duyệt khác nhau, tạo khách hàng → thiết bị kia cập nhật realtime.
- Tạo checklist mới, chọn “Báo cáo” để thấy danh sách nhiệm vụ đã định sẵn.
- Xuất sao lưu Drive sau khi có dữ liệu → kiểm tra trong thư mục Drive mục tiêu.
- Thử bật “Chế độ chỉnh bố cục” ở trang chủ và kéo thả để xác nhận bố cục được nhớ theo user.

Chúc bạn triển khai thành công hệ thống quản trị đa thiết bị cho KLC Bến Lức! 💪

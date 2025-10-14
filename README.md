 codex/create-internal-website-for-klc-ben-luc-ju2m25

 codex/create-internal-website-for-klc-ben-luc-bain40
 codex/build-internal-website-for-klc-ben-luc-b5jncf
# KLC Bến Lức – Hướng dẫn kết nối Google Sheets/Apps Script

Trang nội bộ hiện đã được chuyển sang kiến trúc sử dụng **Google Sheets** làm cơ sở dữ liệu và **Google Apps Script Web App** làm API. Làm theo các bước dưới đây để dữ liệu đồng bộ thời gian thực giữa các thiết bị và luôn có bản sao lưu an toàn.

> ❗️Tất cả các hướng dẫn được viết bằng ngôn ngữ đời thường, phù hợp cho người mới bắt đầu.

---

## 1. Chuẩn bị Google Sheets
1. Mở bảng mẫu: <https://docs.google.com/spreadsheets/d/1cKC8lJsnQnmKGXqycnLXkBP1DC_9LzICEgRtwr8P7rc/edit?gid=2041664873>.
2. Chọn **Tệp → Tạo bản sao** để lưu về Google Drive của bạn.
3. Đặt tên ví dụ **KLC Ben Luc CRM** rồi ghi chú lại **ID bảng tính** (chuỗi giữa `.../d/` và `/edit`).
4. Trong bảng mới, giữ nguyên các trang (sheet) đã tạo sẵn: `users`, `customers`, `care`, `support`, `checklists`, `inventory`, `finance`.

## 2. Tạo Apps Script làm API
1. Ngay trong Google Sheets vừa sao chép, chọn **Tiện ích mở rộng → Apps Script**.
2. Xóa toàn bộ mã mặc định và dán đoạn script dưới đây:

```javascript
const SHEET_MAP = {
  users: 'users',
  customers: 'customers',
  care: 'care',
  support: 'support',
  checklists: 'checklists',
  inventory: 'inventory',
  finance: 'finance'
};

const DEFAULT_USERS = [
  { username: 'admin', displayName: 'Quản trị viên', role: 'admin', passwordHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' },
  { username: 'nhanvien', displayName: 'Nhân viên', role: 'staff', passwordHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' }
];

function doPost(e) {
  try {
    const { resource, action, payload } = JSON.parse(e.postData.contents || '{}');
    const result = handleRequest(resource, action, payload || {});
    return buildResponse({ success: true, data: result });
  } catch (error) {
    return buildResponse({ success: false, message: error.message }, 400);
  }
}

function handleRequest(resource, action, payload) {
  if (resource === 'auth' && action === 'login') {
    return login(payload);
  }
  if (resource === 'users' && action === 'seedDefaults') {
    seedDefaultUsers();
    return { ok: true };
  }
  if (resource === 'users' && action === 'create') {
    return createUser(payload);
  }
  if (resource === 'users' && action === 'list') {
    return listSheet('users');
  }
  if (resource === 'support' && action === 'update') {
    return updateRow('support', payload.id, payload.changes || {});
  }
  if (SHEET_MAP[resource]) {
    if (action === 'list') {
      return listSheet(resource);
    }
    if (action === 'create') {
      return appendRow(resource, payload);
    }
  }
  throw new Error('Không hỗ trợ yêu cầu này.');
}

function login(payload) {
  const { username, passwordHash } = payload;
  const sheet = getSheet('users');
  const rows = sheet.getDataRange().getValues();
  const header = rows.shift();
  const idxUser = header.indexOf('username');
  const idxPass = header.indexOf('passwordHash');
  const idxName = header.indexOf('displayName');
  const idxRole = header.indexOf('role');
  const found = rows.find((row) => row[idxUser] === username);
  if (!found) throw new Error('Tài khoản không tồn tại.');
  if (found[idxPass] !== passwordHash) throw new Error('Sai mật khẩu.');
  return {
    username,
    displayName: found[idxName],
    role: found[idxRole]
  };
}

function seedDefaultUsers() {
  const existing = listSheet('users');
  const missing = DEFAULT_USERS.filter((user) => !existing.find((item) => item.username === user.username));
  missing.forEach((user) => appendRow('users', { ...user, active: true, createdAt: new Date().toISOString() }));
}

function createUser(payload) {
  const existing = listSheet('users');
  if (existing.find((user) => user.username === payload.username)) {
    throw new Error('Tài khoản đã tồn tại.');
  }
  appendRow('users', { ...payload, active: payload.active !== false, createdAt: new Date().toISOString() });
  return { ok: true };
}

function appendRow(resource, payload) {
  const sheet = getSheet(resource);
  const header = sheet.getDataRange().getValues()[0];
  if (!payload.id) {
    payload.id = Utilities.getUuid();
  }
  payload.createdAt = payload.createdAt || new Date().toISOString();
  const row = header.map((key) => payload[key] ?? '');
  sheet.appendRow(row);
  return { id: payload.id };
}

function listSheet(resource) {
  const sheet = getSheet(resource);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const header = values.shift();
  return values.map((row) => {
    const item = {};
    header.forEach((key, index) => {
      if (!key) return;
      item[key] = row[index];
    });
    return item;
  });
}

function updateRow(resource, id, changes) {
  const sheet = getSheet(resource);
  const values = sheet.getDataRange().getValues();
  const header = values.shift();
  const idIndex = header.indexOf('id');
  const map = header.reduce((acc, key, idx) => ({ ...acc, [key]: idx }), {});
  for (let i = 0; i < values.length; i++) {
    if (values[i][idIndex] === id) {
      Object.keys(changes || {}).forEach((key) => {
        if (key in map) {
          values[i][map[key]] = changes[key];
        }
      });
      sheet.getRange(i + 2, 1, 1, header.length).setValues([values[i]]);
      return { id };
    }
  }
  throw new Error('Không tìm thấy bản ghi.');
}

function getSheet(resource) {
  const sheetName = SHEET_MAP[resource] || resource;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Không tìm thấy sheet ${sheetName}`);
  return sheet;
}

function buildResponse(payload, code) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
    .setResponseCode(code || 200);
}
```

3. Nhấn **Lưu** và đặt tên dự án Apps Script (ví dụ `klc-ben-luc-api`).
4. Chọn **Triển khai → Triển khai dưới dạng ứng dụng web**:
   - **Execute as:** Me (chính bạn).
   - **Who has access:** Anyone.
5. Nhấn **Triển khai**, chấp thuận các quyền nếu được hỏi và sao chép **URL Web App**.

 codex/create-internal-website-for-klc-ben-luc-ju2m25
> 💡 Nếu sau khi triển khai bạn vẫn gặp thông báo "Missing or insufficient permissions" khi đăng nhập, hãy mở lại **Triển khai → Quản lý phiên bản**, chọn bản triển khai hiện tại và đảm bảo mục **Ai có quyền truy cập** được đặt thành **Bất kỳ ai**. Đường dẫn phải kết thúc bằng `/exec` (ví dụ `https://script.google.com/macros/s/.../exec`).


 codex/build-internal-website-for-klc-ben-luc-b5jncf
## 3. Kết nối trang web với Apps Script
1. Mở trang `index.html` (hoặc bản GitHub Pages của bạn).
2. Đăng nhập bằng tài khoản quản trị mặc định: `admin / 123456`.
3. Vào **Thiết lập hệ thống → Kết nối** và nhập:
   - **Đường dẫn Web App Google Apps Script:** dán URL ở bước 2.
   - **Thư mục Google Drive sao lưu:** nhập ID thư mục sẽ chứa file backup (phần cuối URL thư mục).
   - **Webhook Apps Script nhận sao lưu:** có thể dùng cùng URL ở bước trên nếu muốn xử lý sao lưu trong cùng script.
4. Nhấn **Lưu cấu hình** → trạng thái chuyển sang “Đã kết nối Apps Script”.
5. Từ bây giờ mọi thao tác thêm mới, cập nhật trạng thái sẽ ghi trực tiếp vào Google Sheets và đồng bộ qua các thiết bị.

 codex/create-internal-website-for-klc-ben-luc-ju2m25
> ℹ️ Trong trường hợp Web App chưa truy cập được, trang sẽ tự động cho phép đăng nhập bằng hai tài khoản mặc định ở chế độ ngoại tuyến để bạn vào phần Thiết lập hệ thống và cập nhật lại đường dẫn Apps Script.


codex/build-internal-website-for-klc-ben-luc-b5jncf
## 4. (Tuỳ chọn) Nhận sao lưu vào Google Drive
Để bật nút "Sao lưu lên Drive", bạn có thể dùng Apps Script riêng với đoạn mã tối giản:

```javascript
function doPost(e) {
  const { folderId, payload, timestamp } = JSON.parse(e.postData.contents);
  const folder = DriveApp.getFolderById(folderId);
  const fileName = `klc-backup-${timestamp || new Date().toISOString()}.json`;
  folder.createFile(fileName, JSON.stringify(payload, null, 2), MimeType.JSON);
  return ContentService.createTextOutput(JSON.stringify({ success: true }));
}
```

Triển khai web app ở chế độ **Anyone** và dán URL vào ô **Webhook Apps Script nhận sao lưu**.

## 5. Những việc nên kiểm tra sau khi kết nối
- **Đăng nhập & phân quyền:** đăng nhập thử bằng `admin` và `nhanvien` trên hai thiết bị khác nhau → dữ liệu nên xuất hiện giống nhau.
- **Biểu mẫu khách hàng, CSKH, bảo hành:** điền một bản ghi → chuyển sang tab khác và nhấn làm mới (hoặc đợi ~15 giây) để thấy dữ liệu.
- **Tồn kho & Thu/Chi:** kiểm tra bảng tổng kết tự động tăng/giảm sau mỗi lần nhập dữ liệu.
- **Sao lưu:** nhấn "Tải về máy" để lấy file `.json`, sau đó thử "Sao lưu lên Drive" nếu đã cấu hình webhook.
- **Tuỳ chỉnh giao diện:** thay đổi màu chủ đạo, tải logo mới, quan sát giao diện đổi ngay lập tức.

## 6. Một số lưu ý vận hành
- Ứng dụng gọi API mỗi 15 giây, vì vậy khi chỉnh sửa trực tiếp trên Google Sheets hãy giữ nguyên tiêu đề cột.
- Nếu bạn đổi tên sheet hoặc thêm cột mới, nhớ cập nhật lại phần script (biến `SHEET_MAP` và dòng tạo dữ liệu) cho khớp.
- Khi cần thêm chức năng mới, chỉ việc mở Apps Script và bổ sung case cho `resource`/`action` rồi nhấn triển khai lại.
- Bản sao lưu `.json` có thể được nhập ngược vào Sheets bằng cách viết script nhỏ hoặc copy thủ công.

## 7. Triển khai lại lên GitHub Pages
1. Sau khi chỉnh sửa xong, commit và đẩy (push) mã nguồn lên GitHub.
2. Trong phần **Settings → Pages** chọn branch đúng (`main`) và thư mục `/`.
3. Đợi vài phút để GitHub build, sau đó mở `https://dat150802.github.io/Dat150802/` để kiểm tra.

Hoàn tất! Từ giờ trang KLC Bến Lức sẽ chạy trên nền Google, đồng bộ ổn định giữa các tài khoản và luôn có bản sao lưu trên Drive.
 codex/create-internal-website-for-klc-ben-luc-ju2m25


 codex/create-internal-website-for-klc-ben-luc-pen74o
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

## Hi there 👋

<!--
**Dat150802/Dat150802** is a ✨ _special_ ✨ repository because its `README.md` (this file) appears on your GitHub profile.

Here are some ideas to get you started:

- 🔭 I’m currently working on ...
- 🌱 I’m currently learning ...
- 👯 I’m looking to collaborate on ...
- 🤔 I’m looking for help with ...
- 💬 Ask me about ...
- 📫 How to reach me: ...
- 😄 Pronouns: ...
- ⚡ Fun fact: ...
-->
 codex/build-internal-website-for-klc-ben-luc-b5jncf
 codex/build-internal-website-for-klc-ben-luc-b5jncf
 codex/build-internal-website-for-klc-ben-luc-b5jncf

# KLC Bến Lức – Hệ thống quản trị nội bộ

Giao diện web nội bộ dành cho doanh nghiệp KLC Bến Lức. Toàn bộ dữ liệu được lưu trữ ở phía trình duyệt bằng `localStorage` nên có thể triển khai ngay trên GitHub Pages hoặc bất kỳ máy chủ tĩnh nào.

## Chức năng chính

- **Đăng nhập & phân quyền**: tài khoản quản trị viên (`admin`/`123456`) và nhân viên (`nhanvien`/`1234`). Ghi nhớ đăng nhập và duy trì phiên trên cùng thiết bị.
- **Trang chủ**: hiển thị biểu đồ Chart.js, bộ lọc báo cáo và kéo thả bố cục (quản trị viên).
- **Khách hàng**: form nhập chi tiết nguồn khách, tình trạng mua hàng, danh sách tìm kiếm, liên kết tới CSKH.
- **CSKH**: lịch sử chăm sóc, đánh giá tiềm năng, liên kết khách hàng.
- **Bảo hành/Bảo dưỡng**: theo dõi hỗ trợ, gửi linh kiện, lọc trạng thái.
- **CheckList công việc**: quản lý hạng mục và báo cáo công việc liên kết với nhau.
- **Tồn kho**: nhập/xuất, thống kê tồn cuối, bộ lọc nhanh.
- **Thu & Chi**: quản lý thu chi theo ngày/tháng, xuất báo cáo CSV.
- **Tùy chỉnh & phê duyệt**: đổi logo/màu sắc, thêm nhân sự, duyệt yêu cầu xóa từ nhân viên.

## Hướng dẫn sử dụng

1. **Cài đặt/triển khai**
   - Đặt toàn bộ thư mục lên GitHub và bật GitHub Pages (Branch `main`, thư mục `/`).
   - Hoặc chạy cục bộ bằng `npx serve` hoặc `python -m http.server` trong thư mục dự án.

2. **Đăng nhập**
   - Quản trị viên: `admin` / `123456`
   - Nhân viên: `nhanvien` / `1234`
   - Chọn “Nhớ mật khẩu” để lưu thông tin, chọn “Duy trì đăng nhập” để lần sau vào sẽ tự đăng nhập trên cùng thiết bị.

3. **Sử dụng chung**
   - Mọi hành động Lưu/Xóa đều hiển thị vòng tròn “Đang xử lý”.
   - Nhân viên chỉ có quyền thêm/cập nhật dữ liệu. Khi xóa sẽ gửi yêu cầu để quản trị viên duyệt.
   - Quản trị viên truy cập mục “Tùy chỉnh” để duyệt yêu cầu, quản lý nhân sự và đổi màu/logo.
   - Kéo thả các widget ở Trang chủ khi bật “chế độ chỉnh sửa”.

4. **Đồng bộ & sao lưu**
   - Dữ liệu lưu trên `localStorage`. Để đồng bộ nhiều thiết bị, quản trị viên xuất báo cáo CSV định kỳ và nhập thủ công khi cần. Có thể tích hợp thêm API hoặc cơ sở dữ liệu khác bằng cách thay thế các hàm đọc/ghi trong `app.js`.

5. **Truy cập nhanh CheckList**
   - Sử dụng đường dẫn `checklist.html` để vào thẳng module CheckList công việc (vẫn yêu cầu đăng nhập theo phân quyền).

## Cấu trúc thư mục

```
index.html
styles.css
app.js
assets/
  logo.svg (có thể thay bằng logo chính thức của bạn)
```

Đặt logo vào `assets/logo.svg` (hoặc cập nhật qua mục Tùy chỉnh).

## Góp ý/Phát triển thêm

- Tích hợp cơ sở dữ liệu trung tâm (Firebase, Supabase, …) để đồng bộ đa thiết bị.
- Bổ sung phân tích nâng cao, xuất Excel/PDF.
- Kết nối API gửi SMS/email CSKH.

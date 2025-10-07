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
   - Vào mục **Tùy chỉnh → Sao lưu & đồng bộ dữ liệu** để bật đồng bộ đám mây cho toàn bộ hệ thống.
   - Điền địa chỉ API đích (REST endpoint hỗ trợ `PUT` hoặc `POST`) và mã bảo mật nếu có. Hệ thống sẽ tự động đẩy dữ liệu khi có thay đổi và kiểm tra dữ liệu mới theo chu kỳ đã cấu hình.
   - Có thể bấm **Tải dữ liệu về máy này** hoặc **Gửi dữ liệu lên máy chủ** để đồng bộ thủ công bất kỳ lúc nào.
   - Ngoài ra vẫn có thể **Xuất file sao lưu** (JSON) và **Nhập từ file sao lưu** để chuyển dữ liệu nhanh giữa các thiết bị hoàn toàn ngoại tuyến.

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

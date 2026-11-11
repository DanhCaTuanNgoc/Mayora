# Hướng dẫn Tiêu chuẩn & Quy tắc Agent — eSales Mayora Mockup

Tài liệu này định nghĩa các tiêu chuẩn kỹ thuật, kiến trúc và quy trình làm việc cho các Agent khi phát triển, bảo trì và kiểm thử các mockup/simulator trong dự án **eSales BackOffice Mayora**.

---

## 1. Tổng quan Kiến trúc Mockup

Dự án mô phỏng hệ thống BackOffice eSales ISE cho khách hàng Mayora, tuân theo mô hình 3 thành phần tách biệt:

| Tệp tin | Vai trò | Nguyên tắc |
| :--- | :--- | :--- |
| `ise-backoffice-mayora.html` | File ứng dụng chính chứa dữ liệu mẫu (`sim-data`), cấu hình (`BO_CONFIG`), đăng ký các màn hình (`sim-screens`) và dock navigator (`sim-dock`). | Không code cứng CSS/JS khung lõi vào đây. Dùng `reg({...})` để khai báo màn. |
| `mockup-bo-core.js` | Runtime Engine của simulator: điều hướng (`route`, `nav`), quản lý trạng thái (`S`), render CRUD view, bảng, modal, toast, event delegation. | Chứa logic dùng chung; hạn chế sửa nếu không nâng cấp kiến trúc nền tảng. |
| `mockup-bo-kit.css` | Hệ thống Design System: theme enterprise (HQSOFT / DevExpress), biến CSS, grid, form, badge, KPI, responsive components. | Tuân thủ biến màu `:root` (`--dx-primary`, `--dx-success`, `--dx-danger`, v.v.). |

---

## 2. Tiêu chuẩn Phát triển Màn hình Mockup

Mỗi màn hình mới khi bổ sung vào hệ thống bắt buộc phải tuân theo các quy chuẩn sau:

### 2.1. Đăng ký màn hình (`reg`)
Mỗi màn hình phải được đăng ký qua hàm `reg({...})` với cấu trúc chuẩn:

```javascript
reg({
  link: '/SalesDistribution/Ise/TenManHinh',
  code: 'MA_MAN_HINH',
  title: 'Tiêu đề hiển thị tiếng Việt',
  group: G_MT0,          // Nhóm workspace tương ứng
  type: 'crud',           // 'crud' hoặc 'page'
  blankId: 'ID_MAU',      // ID bản ghi mẫu dùng cho nút Thêm mới (nếu là crud)
  master: 'TenBangMaster',
  details: 'TenBangDetails',
  tpl: 'CRUD pair',
  spec: {                 // BẮT BUỘC đủ 6 mục spec cho simTest()
    biz: ['Mô tả nghiệp vụ tổng quan...'],
    flow: ['Các bước thao tác chính...'],
    data: [['Tên thực thể', 'Bảng CSDL', 'Mô tả nguồn']],
    rules: ['Các quy tắc nghiệp vụ, ràng buộc, validate...'],
    links: [{ to: '/Duong/Dan/Lien/Ket', label: 'Tên liên kết' }],
    api: [['METHOD /api/...', 'Mô tả', 'Params', 'Response', 'Permission', 'Trạng thái']]
  },
  list: { ... },          // Dành cho màn CRUD list view
  edit: id => { ... }     // Dành cho màn CRUD edit view
});
```

### 2.2. Dữ liệu giả lập (`sim-data`)
- Mọi dữ liệu mẫu phải lấy từ `window.MOCK` (các chuỗi siêu thị, vùng, nhân viên, sản phẩm Mayora: Kopiko, Roma, Beng-Beng, Le Minerale, v.v.).
- Sử dụng hàm tạo số giả ngẫu nhiên có hạt giống (`seedN`) để dữ liệu luôn hiển thị nhất quán giữa các lần mở trang.
- Trạng thái nghiệp vụ phát sinh trong quá trình tương tác phải lưu qua helper `X(key, default)` vào `S.x` để tự động lưu vào `localStorage`.

### 2.3. Tương tác và Sự kiện
- **Click**: Gắn `data-act="tenAction"` và `data-arg="giaTriThamSo"`. Handler đăng ký vào `ACT.tenAction = (arg, el) => { ... }`.
- **Change / Input**: Gắn `data-chg="tenAction"` (và `data-k="..."` nếu cần). Handler nhận `(value, el)`.
- Luôn gọi `save(); render();` sau khi cập nhật dữ liệu để đồng bộ giao diện.

---

## 3. Tiêu chuẩn Tự kiểm tra (`simTest`)

Mọi thay đổi code hoặc thêm màn hình mới **bắt buộc phải vượt qua bài kiểm tra tự động `simTest()` với 0 lỗi**:
- Chạy `simTest()` trên console hoặc bấm nút **🧪 Tự kiểm tra** ở dock simulator.
- `simTest()` sẽ tự động duyệt qua tất cả `ORDER`:
  1. Render từng màn hình danh sách.
  2. Mở dòng đầu tiên và mở trạng thái Thêm mới (`/new`).
  3. Quét phát hiện xem có lỗi runtime hoặc thẻ cảnh báo nguy cấp (`.note.dan`) hay không.
  4. Xác thực đủ 6 phần tử trong `spec` (`biz`, `flow`, `data`, `rules`, `links`, `api`).
  5. Xác thực các đường dẫn trong `spec.links` phải trỏ đến các màn hình có thật.

---

## 4. Tiêu chuẩn & Tối ưu Token khi Sử dụng Playwright

Playwright MCP Server là công cụ mạnh mẽ để kiểm thử thực tế và chụp màn hình, nhưng có thể gây **lãng phí token nghiêm trọng** nếu sử dụng sai cách. Áp dụng nghiêm ngặt các quy tắc sau:

### 4.1. Quy trình chạy Playwright trên môi trường Local
Trình duyệt chặn truy cập giao thức `file://`. Khi cần kiểm thử:
1. **Khởi chạy Local HTTP Server chạy nền (daemon)**:
   ```powershell
   python -m http.server 8088 --directory "d:\HQSOFT\Mayora"
   ```
2. **Truy cập qua URL localhost**:
   `http://127.0.0.1:8088/ise-backoffice-mayora.html`
3. **Dọn dẹp bắt buộc sau khi hoàn thành**:
   - Đóng tab/browser bằng tool `browser_close`.
   - Hủy task daemon python server (`manage_task` với action `kill`).
   - Xóa thư mục tạm `.playwright-mcp` nếu có sinh ra.

### 4.2. Quy tắc tối ưu Token khi dùng Playwright

> [!CAUTION]
> **TUYỆT ĐỐI TRÁNH:**
> - **KHÔNG gọi `browser_snapshot`** trên các ứng dụng SPA/Mockup lớn: Một snapshot DOM của trang 49 màn hình có thể tốn từ **15.000 – 40.000 tokens** cho một lần gọi duy nhất.
> - **KHÔNG dump toàn bộ `document.body.innerHTML`** vào kết quả trả về.

> [!TIP]
> **THỰC HÀNH TỐI ƯU TOKEN ĐƯỢC KHUYẾN NGHỊ:**
> 1. **Dùng `browser_evaluate` có cấu trúc trả về tinh gọn:**
>    Chỉ trả về các trường dữ liệu JSON cần thiết (boolean, số lượng dòng, mã lỗi, tiêu đề):
>    ```javascript
>    // TỐT (Chỉ tốn ~50 tokens):
>    () => ({
>      title: document.title,
>      rowCount: document.querySelectorAll('.g tbody tr').length,
>      hasError: !!document.querySelector('.note.dan')
>    })
>    ```
> 2. **Chạy kiểm thử hàng loạt qua hàm tự kiểm tra (`simTest`):**
>    Thay vì navigate qua từng màn hình (tốn hàng chục tool calls), hãy gọi trực tiếp 1 lần:
>    ```javascript
>    () => window.simTest()
>    ```
>    Kết quả trả về chỉ là một JSON nhỏ gọn: `{ screens: 49, errors: 0, bad: [] }` (tiết kiệm 99% token).
> 3. **Kiểm tra lỗi qua `browser_console_messages`:**
>    Chỉ đọc log lỗi khi có sự cố, không quét lại DOM.
> 4. **Sử dụng `browser_take_screenshot` cho xác minh trực quan:**
>    Khi cần xem layout hoặc giao diện, chụp ảnh màn hình bằng `browser_take_screenshot`. Dữ liệu ảnh được offload ra ổ đĩa và không làm tăng text tokens của ngữ cảnh hội thoại.

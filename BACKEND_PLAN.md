# Kế hoạch xây dựng Backend quản lý chuỗi cung ứng

## Trạng thái hiện tại

- Đã tạo scaffold backend Express + TypeScript.
- Đã tạo lớp kết nối MongoDB và script seed.
- Đã hoàn thành các endpoint authentication cơ bản.
- Đã chuyển sang MongoDB native driver để tận dụng MongoDB local và rút ngắn thời
  gian seed/deploy MVP.
- Đã seed thành công dữ liệu kho, sản phẩm, lô FEFO và tài khoản admin.
- Đã hoàn thành API đọc state, sản phẩm, lô FEFO, tạo đơn và giữ hàng FEFO.

## 1. Mục tiêu

Chuyển backend prototype hiện tại từ lưu dữ liệu trong file JSON sang backend có
database, API rõ ràng, phân quyền và xử lý an toàn nghiệp vụ FEFO.

Stack triển khai:

- Node.js
- Express
- TypeScript
- MongoDB
- MongoDB Node.js Driver
- Zod để validate request
- Session hoặc JWT cho authentication
- Vitest/Supertest để kiểm thử

## 2. Phạm vi nghiệp vụ

- Đăng ký, đăng nhập, đăng xuất và kiểm tra phiên.
- Quản lý sản phẩm, kho, nhà cung cấp và khách hàng.
- Quản lý lô hàng và tồn kho theo FEFO.
- Tạo đơn bán hàng và giữ hàng theo lô.
- Tạo phiếu mua bổ sung khi thiếu tồn.
- Nhập hàng vào kho.
- Điều phối giao hàng theo các chặng.
- Phê duyệt tách giao hoặc hủy đơn.
- Dashboard tổng quan và lịch sử thao tác.

## 3. Kiến trúc dự kiến

```text
Frontend React
    |
    | REST API / JSON
    v
Express + TypeScript
    |
    +-- Auth
    +-- Sales Orders
    +-- Inventory / FEFO
    +-- Purchasing
    +-- Dispatch
    +-- Approval
    +-- Dashboard
    |
    v
MongoDB
```

## 4. Database dự kiến

### Người dùng và phân quyền

- `users`
- `roles`
- `user_roles`
- `sessions`

Vai trò ban đầu:

- Admin
- Nhân viên bán hàng
- Nhân viên kho
- Điều phối giao hàng
- Quản lý phê duyệt

### Danh mục

- `products`
- `warehouses`
- `suppliers`
- `customers`

### Kho và FEFO

- `inventory_lots`
- `inventory_transactions`
- `inventory_reservations`

Thông tin chính của một lô:

- Mã lô
- Sản phẩm
- Kho
- Hạn sử dụng
- Số lượng đạt điều kiện
- Số lượng đã giữ
- Đơn giá
- Trạng thái

### Đơn hàng và mua hàng

- `sales_orders`
- `sales_order_items`
- `order_status_histories`
- `purchase_orders`
- `purchase_order_items`
- `purchase_receipts`

### Điều phối và phê duyệt

- `dispatches`
- `dispatch_waypoints`
- `delivery_proofs`
- `approval_requests`
- `approval_actions`
- `audit_logs`

## 5. API dự kiến

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
GET  /api/auth/preview
```

### Kho và FEFO

```http
GET   /api/products
GET   /api/warehouses
GET   /api/inventory/lots
GET   /api/inventory/lots/:lotId
PATCH /api/inventory/lots/:lotId/adjust
```

### Đơn bán hàng

```http
GET  /api/sales-orders
GET  /api/sales-orders/:id
POST /api/sales-orders
POST /api/sales-orders/:id/check-fefo
POST /api/sales-orders/:id/reserve-fefo
POST /api/sales-orders/:id/cancel
```

### Mua bổ sung

```http
GET  /api/purchase-orders
POST /api/purchase-orders
POST /api/purchase-orders/:id/receive
```

### Điều phối

```http
GET  /api/dispatches
POST /api/dispatches/:orderId/advance
GET  /api/dispatches/:orderId/barcode
GET  /api/dispatches/:orderId/qr
POST /api/dispatches/:orderId/delivery-proof
```

### Phê duyệt và dashboard

```http
GET  /api/approvals
POST /api/approvals/:id/approve
POST /api/approvals/:id/reject
GET  /api/dashboard/summary
GET  /api/dashboard/inventory
GET  /api/dashboard/orders
GET  /api/dashboard/dispatches
```

## 6. Quy tắc nghiệp vụ quan trọng

### FEFO

1. Lọc các lô cùng SKU.
2. Loại lô hết hạn hoặc không đạt điều kiện.
3. Sắp xếp theo hạn sử dụng tăng dần.
4. Tính khả dụng bằng số lượng đạt điều kiện trừ số lượng đã giữ.
5. Phân bổ từ lô hết hạn sớm nhất.
6. Nếu thiếu, tạo yêu cầu mua bù hoặc yêu cầu phê duyệt tách giao.

Các request giữ hàng phải chạy trong database transaction để tránh hai người
cùng giữ vượt quá tồn khả dụng.

### Nhập kho

- Chỉ nhận phiếu chưa ở trạng thái `RECEIVED`.
- Ghi transaction nhập kho.
- Tạo hoặc cập nhật lô hàng.
- Cập nhật trạng thái phiếu mua.
- Ghi lịch sử thao tác.

### Điều phối

Chỉ cho phép điều phối khi đơn đã giữ FEFO và đủ điều kiện xuất kho. Mỗi lần
chuyển chặng phải lưu người thực hiện, thời gian, trạng thái cũ và trạng thái mới.

## 7. Lộ trình triển khai

### Giai đoạn 1 — Chuẩn hóa nghiệp vụ

- Chốt actor, quyền hạn và trạng thái.
- Chốt ERD database.
- Chốt quy tắc FEFO.
- Chốt request/response cho từng API.
- Đối chiếu API với frontend hiện tại.

### Giai đoạn 2 — Khởi tạo backend

- Tạo thư mục backend.
- Tách Express server khỏi frontend.
- Tạo cấu hình môi trường.
- Cài MongoDB driver và kết nối MongoDB.
- Tạo migration và seed dữ liệu mẫu.

### Giai đoạn 3 — Authentication

- Đăng ký và đăng nhập.
- Hash mật khẩu.
- Middleware xác thực.
- Middleware kiểm tra role.
- Logout và thu hồi phiên.

### Giai đoạn 4 — Kho và FEFO

- CRUD sản phẩm, kho và lô hàng.
- API kiểm tra tồn.
- Thuật toán phân bổ FEFO.
- Reservation transaction.
- Điều chỉnh kiểm kê.

### Giai đoạn 5 — Đơn hàng và mua hàng

- Tạo đơn bán.
- Kiểm tra và giữ FEFO.
- Tạo phiếu mua bù.
- Nhập kho.
- Cập nhật trạng thái và lịch sử đơn.

### Giai đoạn 6 — Điều phối và phê duyệt

- Tạo dispatch.
- Chuyển trạng thái từng chặng.
- Sinh mã vạch/QR.
- Lưu bằng chứng giao hàng.
- Xử lý yêu cầu tách giao hoặc hủy đơn.

### Giai đoạn 7 — Tích hợp frontend

- Thay API prototype bằng API database.
- Giữ các type dùng chung trong `frontend/src/types/logistics.ts`.
- Bổ sung loading, validation và error state.
- Kiểm tra flow từ tạo đơn đến giao hàng.

### Giai đoạn 8 — Kiểm thử và triển khai

- Unit test thuật toán FEFO.
- Integration test API.
- Test phân quyền.
- Test đồng thời khi giữ cùng một lô.
- Backup, migration và deploy staging.

## 8. Thứ tự ưu tiên MVP

1. MongoDB và seed dữ liệu.
2. Authentication.
3. Sản phẩm, kho và lô hàng.
4. Giữ tồn FEFO.
5. Đơn bán hàng.
6. Phiếu mua và nhập kho.
7. Điều phối.
8. Phê duyệt.
9. Dashboard.
10. Audit log và báo cáo nâng cao.

## 9. Tiêu chí hoàn thành MVP

- Người dùng đăng nhập được theo role.
- Tạo được đơn bán hàng.
- Hệ thống tự chọn lô theo FEFO.
- Không thể giữ vượt tồn trong các request đồng thời.
- Có thể tạo và nhận phiếu mua bổ sung.
- Có thể chuyển đơn qua các chặng giao hàng.
- Mọi thay đổi tồn kho và trạng thái đều có lịch sử.
- Frontend hiện tại gọi được backend mới mà không cần thay đổi lớn về UI.

# Kế hoạch phân tích Problem 6 - Architecture (Scoreboard Live Update)

> Ghi chú: file này phục vụ phân tích nội bộ, chưa phải tài liệu giao chính thức cho team implement.

## 1) Tóm tắt bài toán

Cần đặc tả một module backend cho API service với các yêu cầu chính:

1. Website có bảng xếp hạng top 10 người dùng.
2. Bảng xếp hạng cần cập nhật theo thời gian thực (live update).
3. Khi user hoàn thành một action hợp lệ, điểm user tăng lên.
4. Action completion sẽ gọi API lên application server để cập nhật điểm.
5. Phải ngăn chặn việc user gian lận gọi API tăng điểm trái phép.

## 2) Mục tiêu module

- Cập nhật điểm an toàn, nhất quán, chống gian lận.
- Phát sự kiện realtime cho client để cập nhật top 10 ngay khi điểm thay đổi.
- Đảm bảo module có khả năng scale theo lượng user lớn.
- Đặc tả rõ contract để team backend implement không mơ hồ.

## 3) Phạm vi & giả định

### Trong phạm vi

- API cập nhật điểm từ action hợp lệ.
- API đọc top 10 scoreboard.
- Kênh realtime (WebSocket/SSE) phát bản tin scoreboard đã cập nhật.
- Cơ chế xác thực + chống replay/abuse cơ bản ở tầng API.

### Ngoài phạm vi (để tránh lan man)

- UI/Frontend rendering chi tiết.
- Logic game/action cụ thể (đề bài nói không cần quan tâm action là gì).
- Hệ thống thanh toán hoặc domain khác ngoài scoreboard.

### Giả định kỹ thuật

- Có hệ thống identity user (userId đã xác định).
- Có nguồn sự kiện action completion hợp lệ (API call hoặc event bus).
- Có DB quan hệ (PostgreSQL) làm nguồn dữ liệu chính cho write/read và leaderboard snapshot.

## 4) Rủi ro chính cần giải quyết

1. **Gian lận tăng điểm**: user tự forge request, replay request cũ, spam API.
2. **Race condition**: nhiều request đồng thời làm sai điểm.
3. **Realtime fan-out**: nhiều client cùng subscribe top 10, phải tối ưu broadcast.
4. **Tính nhất quán**: API write thành công nhưng client realtime không nhận update.

## 5) Định hướng kiến trúc đề xuất

### 5.1 Thành phần module

- **Score Command API**: nhận yêu cầu tăng điểm từ action đã verify.
- **Score Service (domain logic)**: kiểm tra điều kiện hợp lệ + cộng điểm idempotent.
- **Score Repository**: cập nhật DB theo transaction/atomic increment.
- **Leaderboard Query Service**: lấy top 10 trực tiếp từ DB với index phù hợp.
- **Realtime Gateway**: push scoreboard update tới client qua WS/SSE.
- **Anti-abuse layer**: authN, authZ, signature/nonce, rate limiting, idempotency key.

### 5.2 Luồng write (tăng điểm)

1. Client/producer gửi request `complete-action` kèm token xác thực.
2. API verify identity + quyền + chữ ký/timestamp + idempotency key.
3. Service thực thi tăng điểm theo transaction (atomic update).
4. Sau commit, phát event `score.updated`.
5. Realtime gateway nhận event, lấy top 10 mới (hoặc incremental update), broadcast cho subscribers.

### 5.3 Luồng read (top 10)

- API `GET /leaderboard/top?limit=10` trả snapshot ban đầu.
- Client mở kênh realtime `subscribe leaderboard` để nhận update tiếp theo.

## 6) Thiết kế dữ liệu sơ bộ

### Bảng `user_scores`

- `user_id` (PK)
- `score` (bigint, not null, default 0)
- `updated_at`

### Bảng `score_events` (đảm bảo idempotency/audit)

- `event_id` (unique) — idempotency key từ action completion
- `user_id`
- `delta`
- `source`
- `created_at`

### Chỉ mục

- Index trên `score desc` để truy vấn top 10 nhanh.
- Unique index `event_id` để chống replay duplicate.

## 7) Bảo mật & chống gian lận (phần bắt buộc)

1. **Auth bắt buộc**: JWT/session token hợp lệ.
2. **Không tin client delta điểm**: server tự quyết định `delta` theo rule/action type.
3. **Idempotency key**: mỗi action chỉ cộng điểm một lần.
4. **Signature + timestamp/nonce** (nếu dùng service-to-service hoặc client ký request).
5. **Rate limit** theo user/IP/device.
6. **Audit log** cho score update bất thường.
7. **Rule validation**: action completion phải có bằng chứng hợp lệ (không chỉ gọi API là cộng điểm).

## 8) Realtime strategy

- Có thể dùng WebSocket (ưu tiên cho hai chiều) hoặc SSE (đơn giản một chiều).
- Scale nhiều instance: dùng message broker do hạ tầng cung cấp (Kafka/RabbitMQ/NATS) hoặc event bus nội bộ để fan-out sự kiện giữa instances .
- Payload realtime nên nhỏ gọn:
  - `type: leaderboard.updated`
  - `version`
  - `top10` (hoặc diff)
  - `serverTime`

## 9) API contract sơ bộ (để đưa vào README chính)

1. `POST /api/v1/actions/complete`
   - Input: action metadata + idempotency key
   - Output: score hiện tại + trạng thái xử lý
2. `GET /api/v1/leaderboard?limit=10`
   - Output: top 10 snapshot
3. `WS /realtime/leaderboard` hoặc `GET /sse/leaderboard`
   - Event push leaderboard update

## 10) NFR / vận hành

- Latency write p95 mục tiêu (ví dụ < 200ms, tùy hạ tầng).
- Throughput theo peak action rate.
- Observability: metrics (`score_update_success`, `realtime_broadcast_latency`), structured logs, trace id.
- Backpressure và retry strategy cho realtime publish.

## 11) Nội dung cần có trong tài liệu README giao team (ở bước triển khai chính thức)

1. Mục tiêu module + scope.
2. Component diagram + sequence diagram luồng write/read.
3. API specs (request/response/error codes).
4. Data model + migration.
5. Security model + anti-cheat controls.
6. Failure modes + retry/idempotency semantics.
7. Test strategy (unit/integration/load/security).
8. Các đề xuất cải tiến tiếp theo.

## 12) Đề xuất cải tiến (ghi trước để dùng cho mục #3 của đề)

- Tối ưu truy vấn top 10 bằng index và materialized view/snapshot table cập nhật theo chu kỳ phù hợp.
- Thêm anomaly detection cho pattern tăng điểm bất thường.
- Tách command/query (CQRS nhẹ) nếu traffic tăng cao.
- Snapshot + event stream để replay lịch sử khi cần audit.


## 13) Frontend tối giản (mock UI để kiểm thử luồng)

Mặc dù bài toán tập trung backend, có thể bổ sung một mock UI rất nhẹ để demo end-to-end và giúp team kiểm thử nhanh.

### Mục tiêu mock UI

- Gọi API hoàn thành action để tăng điểm.
- Hiển thị bảng top 10 hiện tại.
- Nhận và render cập nhật realtime khi điểm thay đổi.

### Thành phần tối thiểu

1. **Action Panel**
   - Nút `Complete Action` (hoặc form action đơn giản).
   - Khi click: gọi endpoint command (ví dụ `POST /api/v1/actions/complete`).

2. **Leaderboard Panel**
   - Render danh sách top 10: hạng, user, điểm.
   - Lấy snapshot ban đầu từ `GET /api/v1/leaderboard?limit=10`.

3. **Realtime Connector**
   - Mở WS/SSE subscribe leaderboard update.
   - Khi nhận event `leaderboard.updated`: cập nhật UI ngay.

### Kịch bản kiểm thử nhanh với mock UI

1. Load trang -> gọi API lấy top 10 ban đầu.
2. User bấm `Complete Action` -> request lên backend.
3. Backend cộng điểm thành công -> publish event.
4. Mock UI nhận event realtime -> scoreboard đổi thứ hạng/điểm tức thì.

### Gợi ý triển khai mock UI

- Dùng static page (HTML + JS thuần) hoặc React/Vite tối giản.
- Không cần auth flow đầy đủ; chỉ dùng token mock để test API contract.
- Tập trung vào tính đúng của luồng call API + update realtime, không ưu tiên UI đẹp.

### Giá trị của mock UI trong tài liệu đặc tả

- Giúp backend team và QA verify behavior theo đúng execution flow.
- Làm rõ contract giữa API response và dữ liệu realtime.
- Hỗ trợ demo chống regression sau này khi đổi kiến trúc nội bộ.

# Kế hoạch: Problem 4 — `sum_to_n` (TypeScript)

## Phân tích theo mô tả công việc (`jobdescription.txt`)

- **Ngôn ngữ / nền tảng**: JavaScript/TypeScript trên **Node.js** (backend).
- **Framework & dữ liệu**: **Express.js**, **PostgreSQL** — phù hợp API và lưu trữ; bài 4 cụ thể chỉ yêu cầu **TypeScript** thuần cho hàm tính tổng.
- **Chất lượng**: Code rõ ràng, có nhận xét độ phức tạp (phù hợp tinh thần “code craftsmanship” trong JD).

## Yêu cầu bài toán (`problem4.txt`)

- Viết **3 cách triển khai khác nhau** (unique) cho hàm tính tổng tương đương ví dụ:  
  `sum_to_n(5) === 1 + 2 + 3 + 4 + 5 === 15`.
- **Đầu vào**: `n` — số nguyên bất kỳ; giả thiết kết quả luôn nhỏ hơn `Number.MAX_SAFE_INTEGER`.
- **Đầu ra**: một số — tổng các số nguyên theo quy ước “từ 1 lên đến n” khi `n > 0`, bằng `0` khi `n === 0`, và khi `n < 0` là tổng từ `n` đến `-1` (chuỗi liên tiếp về phía 0, nhất quán với định nghĩa có hướng).
- **Bắt buộc**: ghi chú (comment) về **độ phức tạp thời gian / không gian** (hoặc hiệu quả) của **từng** hàm.

## Hướng xử lý

1. **`sum_to_n_a` — vòng lặp (iterative)**  
   - Duyệt và cộng dồn theo `n` (nhánh `n > 0`, `n < 0`, `n === 0`).  
   - **Thời gian**: O(|n|). **Không gian phụ**: O(1).

2. **`sum_to_n_b` — công thức (closed form)**  
   - `n > 0`: `n * (n + 1) / 2`.  
   - `n < 0`: đặt `m = -n`, tổng từ `n` đến `-1` bằng `-m * (m + 1) / 2` (tương đương đối xứng qua 0).  
   - **Thời gian**: O(1). **Không gian phụ**: O(1) — hiệu quả nhất về số phép tính.

3. **`sum_to_n_c` — đệ quy**  
   - `n > 0`: `n + sum_to_n_c(n - 1)`; `n < 0`: `n + sum_to_n_c(n + 1)`; `n === 0`: `0`.  
   - **Thời gian**: O(|n|). **Không gian phụ**: O(|n|) do stack call — kém hơn vòng lặp về bộ nhớ khi |n| lớn, nhưng minh họa rõ mô hình đệ quy.

## Triển khai

- Mã nguồn: `services/sum_to_n.ts` (ba hàm export); CLI đo thời gian: `tasks/debug/run.ts`. Comment trong code **100% tiếng Anh** theo quy ước dự án.

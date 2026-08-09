# Telegram Money Bot - Multi-Tenant / Multi-Group Money Management

Hệ thống Telegram Bot hoàn chỉnh dùng chung (Multi-Tenant / Multi-Group) để quản lý & tính toán nạp/rút tiền cho Operator và Customer trong từng Telegram Group riêng biệt.

---

## 🌟 Tính Năng Nổi Bật

1. **Multi-Group Data Isolation:** Mỗi Telegram Group là một không gian dữ liệu hoàn toàn độc lập. Phí nạp %, Tỷ giá nạp/rút, Lịch sử giao dịch và Số dư của Group A không ảnh hưởng tới Group B.
2. **Quản lý Nạp Tiền (Deposit):** Tự động tính phí dịch vụ ($F_{vnd} = A_{vnd} \times \frac{P_{fee}}{100}$), tính thực nhận ($N_{vnd} = A_{vnd} - F_{vnd}$) và quy đổi ra USDT ($U_{dep} = \frac{N_{vnd}}{R_{dep}}$). Hiển thị **5 giao dịch nạp gần nhất**.
3. **Quản lý Rút Tiền (Withdrawal):** Kiểm tra dư nợ USDT khả dụng nguyên tử trong Database Transaction. Từ chối giao dịch nếu $Withdraw > Balance$.
4. **Giao dịch Điều chỉnh (Adjustment):** Hỗ trợ số tiền nạp âm cho các trường hợp hoàn tiền/điều chỉnh số dư.
5. **Độ chính xác tài chính tuyệt đối:** Sử dụng `decimal.js` và `DECIMAL` trong PostgreSQL, tuyệt đối không dùng Floating Point (`Number` trong JavaScript) để tránh sai số tiền tệ.
6. **Strict Phân quyền (Authorization):** Chỉ Operator/Admin có quyền nạp/rút/sửa cấu hình. Customer chỉ có quyền tra cứu số dư cá nhân `/balance`.
7. **Báo cáo & Lịch sử đầy đủ:** Tra cứu báo cáo thu chi toàn Group (`/report`) và lịch sử giao dịch chi tiết (`/history`).

---

## 🛠️ Công Nghệ Sử Dụng

- **Backend:** Node.js + TypeScript (ESM)
- **Telegram Framework:** Telegraf
- **Database:** PostgreSQL
- **ORM:** Prisma ORM
- **Financial Math:** Decimal.js
- **Testing:** Jest + Ts-Jest

---

## 📁 Cấu Trúc Thư Mục

```text
src/
├── bot/                # Khởi tạo Telegraf Bot & Launch
│   ├── bot.ts
│   └── index.ts
├── commands/           # Xử lý các câu lệnh Telegram UI
│   ├── start.command.ts       # /start & /help (Inline Keyboard UI)
│   ├── deposit.command.ts     # /deposit & /nap
│   ├── withdraw.command.ts    # /withdraw & /rut
│   ├── balance.command.ts     # /balance & /sodu
│   ├── config.command.ts      # /setfee, /setdepositrate, /setwithdrawrate
│   └── report.command.ts      # /report & /history
├── database/           # Prisma Client Instance & Serialization
│   └── prisma.ts
├── middleware/         # Middleware phân quyền & khởi tạo Context
│   ├── auth.middleware.ts     # Kiểm tra quyền Operator
│   └── group-context.middleware.ts # Isolate Group & Customer Context
├── repositories/       # Tầng truy vấn dữ liệu Database (Prisma)
│   ├── customer.repository.ts
│   ├── group.repository.ts
│   ├── operator.repository.ts
│   └── transaction.repository.ts
├── services/           # Tầng nghiệp vụ tài chính
│   ├── balance.service.ts     # Tính số dư USDT từ Transaction Log
│   ├── deposit.service.ts     # Logic Nạp & Điều chỉnh
│   ├── fee-rate.service.ts    # Độ ưu tiên Phí & Tỷ giá
│   ├── withdrawal-calc.service.ts # Module tính toán rút tiền độc lập (Requirement #13)
│   └── withdrawal.service.ts  # Logic Rút tiền & Atomic Check
├── types/              # Domain Types & Interfaces
│   └── index.ts
└── utils/              # Utilities
    ├── decimal.ts             # Định dạng & tính toán Decimal
    ├── formatter.ts           # Format tin nhắn Telegram
    └── telegram-helpers.ts    # Trích xuất Customer từ Reply Message
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### 1. Cấu hình Môi trường `.env`
Tạo file `.env` từ file mẫu `.env.example`:

```env
BOT_TOKEN=your_telegram_bot_token_from_botfather
ADMIN_TELEGRAM_IDS=123456789,987654321
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/telegram_money_bot?schema=public"
PORT=3000
```

### 2. Cài Đặt Package & Database Migration
```bash
# Cài đặt npm dependencies
npm install

# Tạo Prisma Client
npx prisma generate

# Chạy migration database PostgreSQL
npx prisma migrate dev --name init
```

### 3. Chạy Automated Tests
```bash
npm test
```
Tất cả 8 test cases bắt buộc (Case 1 - 6 + Adjustment + Multi-group) sẽ được kiểm tra thành công.

### 4. Khởi Chạy Server
```bash
# Chạy ở môi trường Development
npm run dev

# Build sản phẩm
npm run build

# Chạy sản phẩm Production
npm start
```

---

## 💬 Danh Sách Lệnh Telegram Bot

### Cho Operator:
- `/deposit <số_tiền_vnd>`: Nạp tiền cho khách (Reply tin nhắn của Customer trong Group).
- `/withdraw <số_usdt>`: Rút USDT cho khách (Reply tin nhắn của Customer trong Group).
- `/setfee <phí_%>`: Thiết lập % phí dịch vụ mặc định cho Group (Hoặc reply tin nhắn khách để chỉnh phí riêng).
- `/setdepositrate <tỷ_giá>`: Cài đặt tỷ giá Nạp VND/USDT cho Group (Ví dụ: `26859`).
- `/setwithdrawrate <tỷ_giá>`: Cài đặt tỷ giá Rút VND/USDT cho Group (Ví dụ: `26309`).
- `/report`: Xem tổng quan báo cáo doanh thu, thu/chi và dư nợ của Group.
- `/history`: Xem lịch sử giao dịch nạp/rút gần nhất.

### Cho Customer:
- `/balance`: Xem số dư USDT khả dụng hiện tại của chính mình trong Group.
- `/start` hoặc `/help`: Xem hướng dẫn và menu nút bấm.

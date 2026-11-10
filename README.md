# PoC: Tấn công Tái sử dụng Nonce trong ECDSA trên BSC Testnet

Dự án thực nghiệm Bài tập lớn môn **Mật mã học cơ sở** — Học viện Công nghệ Bưu chính Viễn thông (PTIT).  
Giảng viên hướng dẫn: **PGS.TS. Đỗ Xuân Chợ**

---

## 1. Cấu trúc thư mục

```
poc/
├── package.json               # Cấu hình dependency (viem v2, @noble/curves)
├── run_data.json              # Lưu khoanh vùng khối [blockStart, blockEnd] (không chứa dữ liệu tx)
├── README.md                  # Hướng dẫn chạy thực nghiệm
└── src/
    ├── config.mjs             # Cấu hình mạng BSC Testnet & Ví nạn nhân
    ├── math.mjs               # Giải thuật Euclid mở rộng & Nghịch đảo Modulo (Native BigInt)
    ├── signer.mjs             # Module tuần tự hóa giao dịch EVM & Ký số chuẩn EIP-155 / EIP-2
    ├── exploit.mjs            # Lõi thám mã đại số khôi phục Private Key từ 2 chữ ký va chạm r
    ├── check_balance.mjs      # Kiểm tra số dư tBNB trên chuỗi thật
    ├── victim_wallet.mjs      # Kịch bản 1: Ví nạn nhân gửi chuỗi giao dịch on-chain thật
    └── scanner_exploit.mjs    # Kịch bản 2: Scanner Bot quét block, tự decode dữ liệu & thám mã
```

---

## 2. Hướng dẫn chạy kịch bản thực nghiệm

### Bước 1: Cài đặt thư viện
Yêu cầu Node.js phiên bản 18+ (khuyến nghị Node.js v20 hoặc v22 LTS):

```bash
cd poc
npm install
```

### Bước 2: Kiểm tra số dư ví trên BSC Testnet
```bash
node src/check_balance.mjs
```
Ví demo đã được cấp sẵn tBNB để chi trả phí gas trên BSC Testnet.

### Bước 3: Chạy Kịch bản 1 — Ví Nạn Nhân (Gửi giao dịch on-chain thật)
```bash
node src/victim_wallet.mjs
```
Chương trình ký và gửi chuỗi giao dịch thật lên BSC Testnet. Lỗi tái sử dụng Nonce xảy ra tại Tx #2 và Tx #4. Các giao dịch được thợ đào đóng vào các Block thật trên mạng lưới. Sau khi hoàn tất, file `run_data.json` chỉ lưu phạm vi khối `[blockStart, blockEnd]`, hoàn toàn không lưu dữ liệu giao dịch hay chữ ký nào.

### Bước 4: Chạy Kịch bản 2 — On-chain Scanner Bot (Quét khối, Decode & Thám mã)
```bash
node src/scanner_exploit.mjs
```
Scanner Bot hoạt động như một crawler độc lập: Gọi RPC kéo từng block từ mạng BSC Testnet, tự động giải mã cấu trúc giao dịch trong block, lọc theo địa chỉ ví mục tiêu, bóc tách chữ ký $(r, s, v)$ và tính digest $e = H(m)$. Khi phát hiện va chạm $r$ tại Tx #4 (Block #141854299) trùng với Tx #2 (Block #141854287), bot kích hoạt giải thuật Euclid mở rộng và khôi phục chính xác 100% Private Key trong $< 0.3$ mili-giây.

---

## 3. Kết quả ghi nhận thực tế

- **Mạng kết nối:** Binance Smart Chain Testnet (Chain ID: 97)
- **Phương thức thu thập:** Quét và giải mã trực tiếp từ các Block trên chuỗi qua RPC công khai
- **Khối chứa giao dịch va chạm:** Block #141854287 và Block #141854299
- **Độ chính xác:** Khôi phục Private Key khớp $100\%$ Bit-exact match với Khóa gốc ban đầu.
- **Thời gian giải thuật Euclid:** $< 0.3\text{ ms}$ ($< 0.0003$ giây).

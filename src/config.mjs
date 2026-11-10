/**
 * CẤU HÌNH DỰ ÁN THỰC NGHIỆM TẤN CÔNG NONCE REUSE (BSC TESTNET)
 * Môn học: Mật mã học cơ sở - PTIT 2026
 */

export const CONFIG = {
  // RPC Endpoint công khai của Binance Smart Chain Testnet
  rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  chainId: 97,

  // Địa chỉ ví và Khóa bí mật thử nghiệm (Được tạo mới cho phiên thực nghiệm)
  victimAddress: '0xcB1dbfcDe253c9f969DBA3E039AeCA094461e8F5',
  victimPrivateKey: '0x9d7eb0a5e962e48f70f84e3aab314c57b722d7497f0a08c5eee8b20c9dff26f3',

  // Tham số Nonce k bị cố định (Mô phỏng lỗi Broken PRNG)
  fixedNonceK: 0x5a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1bn
};


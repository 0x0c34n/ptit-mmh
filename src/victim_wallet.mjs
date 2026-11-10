/**
 * KỊCH BẢN 1: PHÍA VÍ NẠN NHÂN (VICTIM WALLET)
 * - Khởi tạo ví thử nghiệm
 * - Kiểm tra số dư tBNB trên mạng Binance Smart Chain Testnet (Chain ID: 97)
 * - Ký và gửi chuỗi giao dịch thật lên mạng BSC Testnet với Account Nonce tuần tự
 * - Mô phỏng lỗi PRNG cạn kiệt entropy: 2 giao dịch bị tái sử dụng cùng một tham số Nonce k
 * - Giao dịch được xác nhận trong các khối thật trên chuỗi
 * - Chỉ lưu phạm vi khối [blockStart, blockEnd] và địa chỉ ví vào run_data.json
 *   (KHÔNG lưu bất kỳ dữ liệu chữ ký hay giao dịch nào vào file JSON)
 */
import { createPublicClient, http, hexToBigInt, formatEther, parseEther, keccak256, stringToHex } from 'viem';
import { bscTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.mjs';
import { signTransactionWithFixedNonce } from './signer.mjs';
import { SECP256K1_N } from './math.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('================================================================');
  console.log('  KỊCH BẢN 1: VÍ NẠN NHÂN GỬI CHUỖI GIAO DỊCH ON-CHAIN          ');
  console.log('  Phía Ví Nạn Nhân (Victim Wallet Node - BSC Testnet)           ');
  console.log('================================================================\n');

  // 1. Kết nối RPC BSC Testnet
  const client = createPublicClient({
    chain: bscTestnet,
    transport: http(CONFIG.rpcUrl)
  });

  const currentBlock = await client.getBlockNumber();
  console.log(`[+] Kết nối mạng BSC Testnet thành công:`);
  console.log(`    - RPC Endpoint : ${CONFIG.rpcUrl}`);
  console.log(`    - Chain ID     : ${CONFIG.chainId}`);
  console.log(`    - Block hiện tại: #${currentBlock}\n`);

  // 2. Thiết lập Ví Nạn Nhân từ cấu hình
  const victimAccount = privateKeyToAccount(CONFIG.victimPrivateKey);
  const victimPrivateKey = hexToBigInt(CONFIG.victimPrivateKey);

  console.log(`[+] Khởi tạo Ví Nạn Nhân:`);
  console.log(`    - Địa chỉ ví (Address) : ${victimAccount.address}`);
  console.log(`    - Khóa bí mật (PrivKey): ${CONFIG.victimPrivateKey}`);

  // 3. Kiểm tra số dư tBNB
  const balance = await client.getBalance({ address: victimAccount.address });
  console.log(`    - Số dư hiện tại        : ${formatEther(balance)} tBNB\n`);

  if (balance < parseEther('0.005')) {
    console.error(`[!] Số dư ví quá thấp để gửi giao dịch on-chain. Cần ít nhất 0.005 tBNB.`);
    process.exit(1);
  }

  // 4. Lấy Account Nonce hiện tại trên chuỗi
  const baseAccountNonce = await client.getTransactionCount({ address: victimAccount.address });
  console.log(`[*] Account Nonce khởi đầu trên chuỗi: ${baseAccountNonce}\n`);

  // 5. Cấu hình chuỗi giao dịch gửi on-chain (ví dụ 4 giao dịch liên tiếp)
  // Giao dịch #2 và #4 dùng cùng tham số Nonce k (tái sử dụng k)
  const txConfigs = [
    { id: 1, isCollision: false, label: 'Tx #1 (Nonce k ngẫu nhiên an toàn)' },
    { id: 2, isCollision: true,  label: 'Tx #2 [!] TÁI SỬ DỤNG NONCE k' },
    { id: 3, isCollision: false, label: 'Tx #3 (Nonce k ngẫu nhiên an toàn)' },
    { id: 4, isCollision: true,  label: 'Tx #4 [!] TÁI SỬ DỤNG NONCE k (Trùng với Tx #2)' }
  ];

  console.log(`[+] Chuẩn bị ký và gửi ${txConfigs.length} giao dịch thật lên BSC Testnet...`);
  console.log(`    - Nonce k bị va chạm: 0x${CONFIG.fixedNonceK.toString(16)}\n`);

  const confirmedBlocks = [];
  const submittedTxs = [];

  for (let idx = 0; idx < txConfigs.length; idx++) {
    const cfg = txConfigs[idx];
    const accNonce = baseAccountNonce + idx;

    // Xác định Nonce k
    let nonceK;
    if (cfg.isCollision) {
      nonceK = CONFIG.fixedNonceK;
    } else {
      const seedHex = keccak256(stringToHex(`session_safe_k_${idx}_${Date.now()}`));
      nonceK = (hexToBigInt(seedHex) % (SECP256K1_N - 2n)) + 1n;
    }

    const txPayload = {
      chainId: CONFIG.chainId,
      nonce: accNonce,
      gas: 21000n,
      gasPrice: 10000000000n, // 10 Gwei
      to: `0x000000000000000000000000000000000000${(idx + 1).toString(16).padStart(4, '0')}`,
      value: parseEther('0.00001')
    };

    const signed = signTransactionWithFixedNonce(txPayload, victimPrivateKey, nonceK);

    console.log(`[+] Đang gửi ${cfg.label} (Account Nonce: ${accNonce})...`);
    console.log(`    - Thành phần r : ${signed.r.slice(0, 18)}...`);
    console.log(`    - Thành phần s : ${signed.s.slice(0, 18)}...`);

    const txHash = await client.sendRawTransaction({ serializedTransaction: signed.rawSignedTx });
    console.log(`    -> TxHash: ${txHash}`);
    console.log(`    -> Đang chờ thợ đào đóng khối BSC...`);

    const receipt = await client.waitForTransactionReceipt({ hash: txHash });
    const blockNum = Number(receipt.blockNumber);
    confirmedBlocks.push(blockNum);
    submittedTxs.push({ hash: txHash, blockNumber: blockNum, nonce: accNonce, r: signed.r, s: signed.s });

    console.log(`    [✔] Đã xác nhận tại Block #${blockNum} (Gas used: ${receipt.gasUsed})\n`);
  }

  // 6. Khoanh vùng khối thực tế
  const minBlock = Math.min(...confirmedBlocks);
  const maxBlock = Math.max(...confirmedBlocks);
  const blockStart = minBlock - 1;
  const blockEnd = maxBlock + 1;

  console.log(`================================================================`);
  console.log(`  TẤT CẢ GIAO DỊCH ĐÃ ĐƯỢC XÁC NHẬN TRÊN BSC TESTNET            `);
  console.log(`================================================================`);
  console.log(`- Phạm vi khối chứa giao dịch: #${minBlock} đến #${maxBlock}`);
  console.log(`- Khoanh vùng cho Scanner Bot : Từ Block #${blockStart} đến #${blockEnd}\n`);

  // 7. Ghi duy nhất thông tin khối vào run_data.json (KHÔNG LƯU DỮ LIỆU GIAO DỊCH)
  const runData = {
    network: 'BSC Testnet',
    chainId: CONFIG.chainId,
    victimAddress: victimAccount.address,
    blockStart,
    blockEnd
  };

  const dataPath = path.join(__dirname, '../run_data.json');
  fs.writeFileSync(dataPath, JSON.stringify(runData, null, 2));

  console.log(`[✔] Đã lưu thông số khoanh vùng khối vào: ${dataPath}`);
  console.log(`    (Tệp run_data.json chỉ chứa blockStart & blockEnd; không lưu dữ liệu giao dịch)`);
  console.log(`================================================================`);
  console.log(`  KỊCH BẢN 1 HOÀN TẤT. BẠN CÓ THỂ CHẠY KỊCH BẢN 2 ĐỂ QUÉT KHỐI! `);
  console.log(`================================================================\n`);
}

main().catch(console.error);


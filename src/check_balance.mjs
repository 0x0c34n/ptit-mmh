/**
 * Công cụ kiểm tra số dư tBNB của ví thử nghiệm trên BSC Testnet
 */
import { createPublicClient, http, formatEther } from 'viem';
import { bscTestnet } from 'viem/chains';
import { CONFIG } from './config.mjs';

async function main() {
  const client = createPublicClient({
    chain: bscTestnet,
    transport: http(CONFIG.rpcUrl)
  });

  const blockNumber = await client.getBlockNumber();
  const balance = await client.getBalance({ address: CONFIG.victimAddress });

  console.log('================================================================');
  console.log('  KIỂM TRA SỐ DƯ VÍ DEMO TRÊN BINANCE SMART CHAIN TESTNET      ');
  console.log('================================================================');
  console.log(`- Địa chỉ ví (Address) : ${CONFIG.victimAddress}`);
  console.log(`- Block hiện tại chuỗi : #${blockNumber}`);
  console.log(`- Số dư (Balance)      : ${formatEther(balance)} tBNB`);

  if (balance === 0n) {
    console.log('\n[!] Ví chưa có tBNB! Vui lòng Faucet tại:');
    console.log('    1. Web: https://www.bnbchain.org/en/testnet-faucet');
    console.log('    2. Discord BNB Chain (#testnet-faucet): /faucet ' + CONFIG.victimAddress);
  } else {
    console.log('\n[✔] Ví đã có tBNB! Bạn có thể chạy: node src/victim_wallet.mjs');
  }
  console.log('================================================================\n');
}

main().catch(console.error);


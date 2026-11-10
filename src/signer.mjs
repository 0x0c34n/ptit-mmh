/**
 * Module Ký số EVM Transaction can thiệp tham số Nonce k
 * Chuẩn hóa EIP-2 (Low-S rule) cho phép gửi thực tế trên EVM/BSC
 */
import { serializeTransaction, keccak256, hexToBigInt } from 'viem';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { SECP256K1_N, modInverse, modNorm } from './math.mjs';

export function signTransactionWithFixedNonce(tx, privateKey, fixedK) {
  // 1. Serialization giao dịch chưa ký theo chuẩn EIP-155
  const unsignedSerialized = serializeTransaction(tx);
  
  // 2. Băm Keccak-256 nội dung giao dịch để tạo Digest e = H(m)
  const msgHashHex = keccak256(unsignedSerialized);
  const e = hexToBigInt(msgHashHex);

  // 3. Tính tọa độ điểm R = k * G trên đường cong secp256k1
  const R = secp256k1.Point.BASE.multiply(fixedK).toAffine();
  const r = modNorm(R.x, SECP256K1_N);

  if (r === 0n) {
    throw new Error('Gia tri r = 0, can chon lai k khac');
  }

  // 4. Tính s = k^(-1) * (e + d * r) mod n
  const kInv = modInverse(fixedK, SECP256K1_N);
  let s = modNorm(kInv * (e + privateKey * r), SECP256K1_N);

  if (s === 0n) {
    throw new Error('Gia tri s = 0, can chon lai k khac');
  }

  // 5. Chuẩn hóa EIP-2 (Bắt buộc trên EVM/BSC: s <= n/2 để chống tính dẻo chữ ký - Signature Malleability)
  let yParity = (R.y % 2n === 0n) ? 0 : 1;
  if (s > SECP256K1_N / 2n) {
    s = SECP256K1_N - s;
    yParity = 1 - yParity;
  }

  // 6. Xác định thành phần phục hồi v (EIP-155: v = chainId * 2 + 35 + yParity)
  const v = BigInt(tx.chainId * 2 + 35 + yParity);

  // 7. Đóng gói chuỗi giao dịch đã ký chuẩn RLP (Raw Transaction)
  const rawSignedTx = serializeTransaction(tx, {
    r: '0x' + r.toString(16).padStart(64, '0'),
    s: '0x' + s.toString(16).padStart(64, '0'),
    v
  });

  return {
    rawSignedTx,
    r: '0x' + r.toString(16).padStart(64, '0'),
    s: '0x' + s.toString(16).padStart(64, '0'),
    v,
    yParity,
    rBigInt: r,
    sBigInt: s,
    eBigInt: e,
    msgHash: msgHashHex
  };
}

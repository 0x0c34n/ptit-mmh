/**
 * Module Toán học Mật mã Modulo & Giải thuật Euclid mở rộng
 * Tham chiếu học liệu: [1] Bài giảng Mật mã học cơ sở - PTIT 2021 (Mục 1.5.2)
 */

// Bậc nguyên tố n của đường cong chuẩn secp256k1
export const SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;

// Tham số trường hữu hạn Fp
export const SECP256K1_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;

/**
 * Thuật toán Euclid mở rộng (Extended Euclidean Algorithm)
 * Tìm nghiệm (x, y) thỏa mãn đồng nhất thức Bézout: a * x + b * y = gcd(a, b)
 */
export function extGCD(a, b) {
  if (b === 0n) {
    return [1n, 0n, a];
  }
  const [x1, y1, gcd] = extGCD(b, a % b);
  const x = y1;
  const y = x1 - (a / b) * y1;
  return [x, y, gcd];
}

/**
 * Tính nghịch đảo modulo m: a^(-1) mod m
 * Áp dụng: Tính k^(-1) mod n, (s1 - s2)^(-1) mod n, r^(-1) mod n
 */
export function modInverse(a, m) {
  const aNorm = ((a % m) + m) % m;
  const [x, , gcd] = extGCD(aNorm, m);
  if (gcd !== 1n) {
    throw new Error(`Khong ton tai nghich dao modulo do gcd(${a}, ${m}) = ${gcd} != 1`);
  }
  return ((x % m) + m) % m;
}

/**
 * Chuẩn hóa số học modulo dương trong vành Z_m
 */
export function modNorm(val, m) {
  return ((val % m) + m) % m;
}


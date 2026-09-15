import crypto from 'node:crypto';

/**
 * Self-contained TOTP (RFC 6238) implementation using only Node's crypto.
 *
 * Fully OFFLINE: the server derives the 6-digit code from a shared secret and
 * the current time; an authenticator app (Google Authenticator, Aegis, etc.)
 * derives the same code independently on the user's device. No network calls
 * happen on either side, which keeps HomeLedger local-first.
 *
 * Defaults follow the near-universal authenticator conventions:
 *   - HMAC-SHA1
 *   - 6 digits
 *   - 30-second time step
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DEFAULT_DIGITS = 6;
const DEFAULT_STEP_SECONDS = 30;

/**
 * Encode raw bytes as RFC 4648 base32 (no padding), the format authenticator
 * apps expect in the otpauth secret.
 */
export function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decode an RFC 4648 base32 string (case-insensitive, padding/spaces ignored)
 * back into raw bytes.
 */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a new random base32 TOTP secret.
 * @param byteLength number of random bytes (20 => 160 bits, RFC 4226 recommendation)
 */
export function generateSecret(byteLength = 20): string {
  return base32Encode(crypto.randomBytes(byteLength));
}

/**
 * Build the otpauth:// URI that authenticator apps consume (usually via QR).
 * Example: otpauth://totp/HomeLedger:alice@x.com?secret=...&issuer=HomeLedger
 */
export function buildOtpauthUri(secret: string, account: string, issuer = 'HomeLedger'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DEFAULT_DIGITS),
    period: String(DEFAULT_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Compute the HOTP/TOTP code for a given counter value.
 */
function generateHotp(secret: Buffer, counter: number, digits = DEFAULT_DIGITS): string {
  const counterBuf = Buffer.alloc(8);
  // Write the counter as a 64-bit big-endian integer.
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secret).update(counterBuf).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
  const binary =
    (((hmac[offset] ?? 0) & 0x7f) << 24) |
    (((hmac[offset + 1] ?? 0) & 0xff) << 16) |
    (((hmac[offset + 2] ?? 0) & 0xff) << 8) |
    ((hmac[offset + 3] ?? 0) & 0xff);

  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

/**
 * Generate the current TOTP code for a base32 secret.
 * @param forTime epoch milliseconds (defaults to now) — useful for testing.
 */
export function generateTotp(secret: string, forTime: number = Date.now()): string {
  const counter = Math.floor(forTime / 1000 / DEFAULT_STEP_SECONDS);
  return generateHotp(base32Decode(secret), counter);
}

/**
 * Verify a user-supplied TOTP code against the secret.
 *
 * @param window how many 30s steps of clock skew to tolerate on each side
 *   (1 => accepts the previous, current, and next code). Constant-time compare.
 */
export function verifyTotp(
  secret: string,
  code: string,
  window = 1,
  forTime: number = Date.now(),
): boolean {
  const normalized = (code ?? '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;

  let key: Buffer;
  try {
    key = base32Decode(secret);
  } catch {
    return false;
  }

  const currentCounter = Math.floor(forTime / 1000 / DEFAULT_STEP_SECONDS);
  for (let offset = -window; offset <= window; offset++) {
    const candidate = generateHotp(key, currentCounter + offset);
    if (timingSafeEqualStr(candidate, normalized)) {
      return true;
    }
  }
  return false;
}

/**
 * Constant-time string comparison to avoid leaking timing information.
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate one-time backup codes (recovery when the phone is unavailable).
 * Returns the plaintext codes (shown to the user ONCE) and their sha256 hashes
 * (persisted). A code is formatted as XXXX-XXXX for readability.
 */
export function generateBackupCodes(count = 10): { plaintext: string[]; hashes: string[] } {
  const plaintext: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 hex chars
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    plaintext.push(formatted);
    hashes.push(hashBackupCode(formatted));
  }
  return { plaintext, hashes };
}

/**
 * Hash a backup code for storage/comparison. Normalizes case and dashes so the
 * user can type it either way.
 */
export function hashBackupCode(code: string): string {
  const normalized = (code ?? '').replace(/[\s-]/g, '').toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

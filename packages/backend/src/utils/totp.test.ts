import { describe, it, expect } from 'vitest';
import {
  base32Encode,
  base32Decode,
  generateSecret,
  buildOtpauthUri,
  generateTotp,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
} from './totp.js';

describe('totp utils', () => {
  describe('base32', () => {
    it('round-trips arbitrary bytes', () => {
      const bytes = Buffer.from('12345678901234567890', 'ascii');
      const encoded = base32Encode(bytes);
      expect(base32Decode(encoded).equals(bytes)).toBe(true);
    });

    it('decodes case-insensitively and ignores spaces/padding', () => {
      const bytes = Buffer.from('hello world', 'ascii');
      const encoded = base32Encode(bytes);
      const spaced = encoded.toLowerCase().replace(/(.{4})/g, '$1 ').trim() + '===';
      expect(base32Decode(spaced).equals(bytes)).toBe(true);
    });

    it('throws on invalid characters', () => {
      expect(() => base32Decode('!!!!')).toThrow();
    });
  });

  describe('generateTotp (RFC 6238 vectors, SHA1)', () => {
    // RFC 6238 Appendix B uses ASCII secret "12345678901234567890".
    const secret = base32Encode(Buffer.from('12345678901234567890', 'ascii'));

    // (epoch seconds -> expected 8-digit code); we take the last 6 digits (digits=6).
    const vectors: Array<[number, string]> = [
      [59, '94287082'],
      [1111111109, '07081804'],
      [1111111111, '14050471'],
      [1234567890, '89005924'],
      [2000000000, '69279037'],
    ];

    for (const [seconds, eightDigit] of vectors) {
      it(`matches at T=${seconds}s`, () => {
        const expected6 = eightDigit.slice(-6);
        expect(generateTotp(secret, seconds * 1000)).toBe(expected6);
      });
    }
  });

  describe('verifyTotp', () => {
    const secret = generateSecret();

    it('accepts the current code', () => {
      const now = Date.now();
      const code = generateTotp(secret, now);
      expect(verifyTotp(secret, code, 1, now)).toBe(true);
    });

    it('accepts a code within the ±1 step window', () => {
      const now = 1_000_000_000_000;
      const prevStepCode = generateTotp(secret, now - 30_000);
      const nextStepCode = generateTotp(secret, now + 30_000);
      expect(verifyTotp(secret, prevStepCode, 1, now)).toBe(true);
      expect(verifyTotp(secret, nextStepCode, 1, now)).toBe(true);
    });

    it('rejects a code outside the window', () => {
      const now = 1_000_000_000_000;
      const farCode = generateTotp(secret, now - 120_000);
      expect(verifyTotp(secret, farCode, 1, now)).toBe(false);
    });

    it('rejects malformed input', () => {
      const now = Date.now();
      expect(verifyTotp(secret, '', 1, now)).toBe(false);
      expect(verifyTotp(secret, 'abcdef', 1, now)).toBe(false);
      expect(verifyTotp(secret, '12345', 1, now)).toBe(false);
      expect(verifyTotp(secret, '1234567', 1, now)).toBe(false);
    });

    it('tolerates spaces in the entered code', () => {
      const now = Date.now();
      const code = generateTotp(secret, now);
      const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
      expect(verifyTotp(secret, spaced, 1, now)).toBe(true);
    });
  });

  describe('buildOtpauthUri', () => {
    it('produces a valid otpauth:// URI', () => {
      const uri = buildOtpauthUri('JBSWY3DPEHPK3PXP', 'alice@example.com', 'HomeLedger');
      expect(uri.startsWith('otpauth://totp/')).toBe(true);
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
      expect(uri).toContain('issuer=HomeLedger');
      expect(uri).toContain(encodeURIComponent('HomeLedger:alice@example.com'));
    });
  });

  describe('backup codes', () => {
    it('generates the requested count with matching hashes', () => {
      const { plaintext, hashes } = generateBackupCodes(10);
      expect(plaintext).toHaveLength(10);
      expect(hashes).toHaveLength(10);
      plaintext.forEach((code, i) => {
        expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
        expect(hashBackupCode(code)).toBe(hashes[i]);
      });
    });

    it('hashes normalize case and dashes', () => {
      expect(hashBackupCode('ab12-CD34')).toBe(hashBackupCode('AB12CD34'));
      expect(hashBackupCode('ab12 cd34')).toBe(hashBackupCode('AB12CD34'));
    });

    it('produces unique codes', () => {
      const { plaintext } = generateBackupCodes(20);
      expect(new Set(plaintext).size).toBe(20);
    });
  });
});

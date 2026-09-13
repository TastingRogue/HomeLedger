import { describe, it, expect } from 'vitest';
import { roundMoney, sumMoney, hasAtMostTwoDecimals } from './money.js';

describe('money utils', () => {
  describe('roundMoney', () => {
    it('rounds to 2 decimals', () => {
      expect(roundMoney(1.005)).toBe(1.01);
      expect(roundMoney(1.004)).toBe(1.0);
      expect(roundMoney(2.675)).toBe(2.68);
    });

    it('corrects classic float drift', () => {
      expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    });

    it('handles negatives and zero', () => {
      expect(roundMoney(-1.005)).toBe(-1);
      expect(roundMoney(0)).toBe(0);
    });

    it('returns 0 for non-finite input', () => {
      expect(roundMoney(NaN)).toBe(0);
      expect(roundMoney(Infinity)).toBe(0);
    });
  });

  describe('sumMoney', () => {
    it('sums drift-prone amounts to an exact cent total', () => {
      // Naive reduce would give 0.30000000000000004
      const total = sumMoney([0.1, 0.2]);
      expect(total).toBe(0.3);
    });

    it('sums many small amounts without accumulating drift', () => {
      const amounts = Array.from({ length: 100 }, () => 0.1); // 100 x 0.10
      expect(sumMoney(amounts)).toBe(10);
    });

    it('handles a realistic mixed ledger to an exact total', () => {
      // 19.99 + 5.55 + 0.01 + 100.10 - 0.01 = 125.64
      expect(sumMoney([19.99, 5.55, 0.01, 100.1, -0.01])).toBe(125.64);
    });
  });

  describe('hasAtMostTwoDecimals', () => {
    it('accepts whole numbers and 1-2 decimals', () => {
      expect(hasAtMostTwoDecimals(100)).toBe(true);
      expect(hasAtMostTwoDecimals(100.5)).toBe(true);
      expect(hasAtMostTwoDecimals(100.55)).toBe(true);
    });

    it('rejects more than 2 decimals', () => {
      expect(hasAtMostTwoDecimals(100.555)).toBe(false);
      expect(hasAtMostTwoDecimals(0.001)).toBe(false);
    });
  });
});

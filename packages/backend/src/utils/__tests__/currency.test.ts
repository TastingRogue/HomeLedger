import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../currency.js';

describe('formatCurrency', () => {
  it('formats a standard positive amount with thousands separator', () => {
    expect(formatCurrency(1234.56)).toBe('MX$1,234.56');
  });

  it('formats zero as MX$0.00', () => {
    expect(formatCurrency(0)).toBe('MX$0.00');
  });

  it('formats negative amounts with "-" prefix before MX$', () => {
    expect(formatCurrency(-1500)).toBe('-MX$1,500.00');
  });

  it('formats large amounts with multiple comma separators', () => {
    expect(formatCurrency(1000000.99)).toBe('MX$1,000,000.99');
  });

  it('always shows exactly 2 decimal places', () => {
    expect(formatCurrency(100)).toBe('MX$100.00');
    expect(formatCurrency(99.9)).toBe('MX$99.90');
    expect(formatCurrency(0.5)).toBe('MX$0.50');
  });

  it('formats small amounts without thousands separator', () => {
    expect(formatCurrency(5.99)).toBe('MX$5.99');
    expect(formatCurrency(999.99)).toBe('MX$999.99');
  });

  it('formats negative amounts with decimals', () => {
    expect(formatCurrency(-1500.50)).toBe('-MX$1,500.50');
    expect(formatCurrency(-0.01)).toBe('-MX$0.01');
  });

  it('handles the maximum allowed value', () => {
    expect(formatCurrency(999999999.99)).toBe('MX$999,999,999.99');
  });

  it('handles the minimum allowed value (most negative)', () => {
    expect(formatCurrency(-999999999.99)).toBe('-MX$999,999,999.99');
  });
});

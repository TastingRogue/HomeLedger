import { describe, it, expect, afterEach } from 'vitest';
import {
  formatCurrency,
  formatPercentage,
  formatDateShort,
  formatDaysRemaining,
  toDatetimeLocal,
} from './format';

describe('formatCurrency', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('formats a positive amount with the MXN default and comma grouping', () => {
    expect(formatCurrency(1234.56)).toBe('MX$1,234.56');
    expect(formatCurrency(1000000)).toBe('MX$1,000,000.00');
  });

  it('prefixes negatives with a minus sign before the symbol', () => {
    expect(formatCurrency(-1500)).toBe('-MX$1,500.00');
  });

  it('renders zero as MX$0.00', () => {
    expect(formatCurrency(0)).toBe('MX$0.00');
  });

  it('always shows two decimal places', () => {
    expect(formatCurrency(5)).toBe('MX$5.00');
    expect(formatCurrency(0.1)).toBe('MX$0.10');
    expect(formatCurrency(1.5)).toBe('MX$1.50');
    // Rounds to 2dp via toFixed (subject to IEEE-754, same as the app).
    expect(formatCurrency(2.499)).toBe('MX$2.50');
  });

  it('does not group amounts below 1000', () => {
    expect(formatCurrency(999.99)).toBe('MX$999.99');
  });

  it('uses the symbol from the persisted currency preference', () => {
    localStorage.setItem('sf_preferences', JSON.stringify({ currency: 'USD' }));
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    localStorage.setItem('sf_preferences', JSON.stringify({ currency: 'EUR' }));
    expect(formatCurrency(10)).toBe('€10.00');
  });

  it('falls back to MXN when preferences are unreadable', () => {
    localStorage.setItem('sf_preferences', 'not-json');
    expect(formatCurrency(42)).toBe('MX$42.00');
  });

  it('falls back to a generic $ for an unknown currency code', () => {
    localStorage.setItem('sf_preferences', JSON.stringify({ currency: 'JPY' }));
    expect(formatCurrency(100)).toBe('$100.00');
  });
});

describe('formatPercentage', () => {
  it('renders with one decimal place and a % suffix', () => {
    expect(formatPercentage(50)).toBe('50.0%');
    expect(formatPercentage(33.333)).toBe('33.3%');
    expect(formatPercentage(0)).toBe('0.0%');
  });
});

describe('formatDateShort', () => {
  it('parses a YYYY-MM-DD string as a local date without a UTC shift', () => {
    // The whole point of the string branch: 2024-01-05 must stay Jan 5,
    // never slip to Jan 4 due to timezone offset.
    expect(formatDateShort('2024-01-05')).toBe('05/01/2024');
    expect(formatDateShort('2024-12-31')).toBe('31/12/2024');
  });

  it('handles an ISO datetime string by taking the date part', () => {
    expect(formatDateShort('2024-03-09T23:30:00.000Z')).toBe('09/03/2024');
  });

  it('formats a Date object as dd/MM/yyyy with zero padding', () => {
    expect(formatDateShort(new Date(2024, 0, 5))).toBe('05/01/2024');
  });
});

describe('formatDaysRemaining', () => {
  it('labels today, tomorrow, and future days', () => {
    expect(formatDaysRemaining(0)).toBe('Hoy');
    expect(formatDaysRemaining(1)).toBe('Mañana');
    expect(formatDaysRemaining(5)).toBe('5 días');
  });

  it('labels overdue days with the absolute count', () => {
    expect(formatDaysRemaining(-3)).toBe('Vencido (3 días)');
  });
});

describe('toDatetimeLocal', () => {
  it('produces a 16-char datetime-local value (YYYY-MM-DDTHH:mm)', () => {
    const out = toDatetimeLocal('2024-06-15T10:30:00.000Z');
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(out).toHaveLength(16);
  });
});

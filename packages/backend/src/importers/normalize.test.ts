import { describe, it, expect } from 'vitest';
import { normalizeMerchant, normalizeDate, parseAmount } from './normalize.js';

describe('normalizeMerchant', () => {
  it('returns empty for nullish/empty input', () => {
    expect(normalizeMerchant(null)).toBe('');
    expect(normalizeMerchant(undefined)).toBe('');
    expect(normalizeMerchant('   ')).toBe('');
  });

  it('strips store numbers and dates, title-cases', () => {
    expect(normalizeMerchant('OXXO GAS #4821 15/03/2024')).toBe('Oxxo Gas');
    expect(normalizeMerchant('WALMART SUPERCENTER 12345')).toBe('Walmart Supercenter');
  });

  it('drops noise words (compra/pago/pos/ref)', () => {
    expect(normalizeMerchant('COMPRA POS AMAZON MX')).toBe('Amazon Mx');
    expect(normalizeMerchant('PAGO TARJETA NETFLIX')).toBe('Netflix');
  });

  it('removes reference/authorization tokens', () => {
    expect(normalizeMerchant('STARBUCKS REF:998877')).toBe('Starbucks');
    expect(normalizeMerchant('UBER AUT 123456')).toBe('Uber');
    // (Uber is title-cased consistently; no acronym special-casing.)
    expect(normalizeMerchant('SPEI FOLIO 55512 SANTANDER')).toBe('Santander');
  });

  it('title-cases consistently (no acronym special-casing)', () => {
    expect(normalizeMerchant('HEB TIENDA')).toBe('Heb Tienda');
  });

  it('collapses whitespace and separators', () => {
    expect(normalizeMerchant('COSTCO___MEXICO   |  TIENDA')).toBe('Costco Mexico Tienda');
  });

  it('returns empty when only noise remains', () => {
    expect(normalizeMerchant('COMPRA POS 12345 15/03')).toBe('');
  });
});

describe('normalizeDate', () => {
  it('returns null for empty', () => {
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate('')).toBeNull();
  });

  it('passes through ISO dates at noon', () => {
    expect(normalizeDate('2024-03-15')).toBe('2024-03-15T12:00:00.000Z');
  });

  it('keeps ISO datetimes', () => {
    expect(normalizeDate('2024-03-15T08:30:00.000Z')).toBe('2024-03-15T08:30:00.000Z');
  });

  it('parses DD/MM/YYYY (MX default)', () => {
    expect(normalizeDate('15/03/2024')).toBe('2024-03-15T12:00:00.000Z');
  });

  it('parses DD-MM-YYYY', () => {
    expect(normalizeDate('15-03-2024')).toBe('2024-03-15T12:00:00.000Z');
  });

  it('disambiguates when day > 12 as DD/MM', () => {
    expect(normalizeDate('25/03/2024')).toBe('2024-03-25T12:00:00.000Z');
  });

  it('disambiguates MM/DD when second part > 12', () => {
    expect(normalizeDate('03/25/2024')).toBe('2024-03-25T12:00:00.000Z');
  });

  it('honors preferDMY=false for ambiguous dates', () => {
    expect(normalizeDate('04/05/2024', false)).toBe('2024-04-05T12:00:00.000Z');
    expect(normalizeDate('04/05/2024', true)).toBe('2024-05-04T12:00:00.000Z');
  });

  it('handles two-digit years', () => {
    expect(normalizeDate('15/03/24')).toBe('2024-03-15T12:00:00.000Z');
  });

  it('parses YYYY/MM/DD', () => {
    expect(normalizeDate('2024/03/15')).toBe('2024-03-15T12:00:00.000Z');
  });

  it('parses textual month (es abbreviations)', () => {
    expect(normalizeDate('15 mar 2024')).toBe('2024-03-15T12:00:00.000Z');
    expect(normalizeDate('15-Mar-2024')).toBe('2024-03-15T12:00:00.000Z');
  });

  it('parses "Month DD, YYYY"', () => {
    expect(normalizeDate('March 15, 2024')).toBe('2024-03-15T12:00:00.000Z');
  });

  it('returns null for garbage', () => {
    expect(normalizeDate('not a date')).toBeNull();
    expect(normalizeDate('99/99/2024')).toBeNull();
  });
});

describe('parseAmount', () => {
  it('returns zero for empty', () => {
    expect(parseAmount(null)).toEqual({ amount: 0, sign: 0 });
    expect(parseAmount('')).toEqual({ amount: 0, sign: 0 });
    expect(parseAmount('-')).toEqual({ amount: 0, sign: 0 });
  });

  it('parses US-formatted amounts', () => {
    expect(parseAmount('$1,234.56')).toEqual({ amount: 1234.56, sign: 0 });
    expect(parseAmount('1,234.56')).toEqual({ amount: 1234.56, sign: 0 });
  });

  it('parses EU/LA-formatted amounts (comma decimal)', () => {
    expect(parseAmount('1.234,56')).toEqual({ amount: 1234.56, sign: 0 });
    expect(parseAmount('599,00')).toEqual({ amount: 599.0, sign: 0 });
  });

  it('detects negative sign', () => {
    expect(parseAmount('-599.00')).toEqual({ amount: 599.0, sign: -1 });
  });

  it('detects positive sign', () => {
    expect(parseAmount('+3000.00')).toEqual({ amount: 3000.0, sign: 1 });
  });

  it('detects accounting-style negatives', () => {
    expect(parseAmount('(1,234.56)')).toEqual({ amount: 1234.56, sign: -1 });
  });

  it('strips currency codes', () => {
    expect(parseAmount('1,234.56 MXN')).toEqual({ amount: 1234.56, sign: 0 });
    expect(parseAmount('USD 89.99')).toEqual({ amount: 89.99, sign: 0 });
  });

  it('rounds to 2 decimals', () => {
    expect(parseAmount('10.005').amount).toBe(10.01);
  });
});

import { describe, it, expect } from 'vitest';
import { formatDate, formatTime, formatDateShort } from '../dates.js';

describe('formatDate', () => {
  it('formats January 1st correctly in Spanish', () => {
    const date = new Date(2024, 0, 1); // January 1, 2024
    expect(formatDate(date)).toBe('1 de enero de 2024');
  });

  it('formats December 25th correctly in Spanish', () => {
    const date = new Date(2024, 11, 25); // December 25, 2024
    expect(formatDate(date)).toBe('25 de diciembre de 2024');
  });

  it('formats all months correctly', () => {
    const expectedMonths = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];

    expectedMonths.forEach((monthName, index) => {
      const date = new Date(2024, index, 15);
      expect(formatDate(date)).toBe(`15 de ${monthName} de 2024`);
    });
  });

  it('does not pad single-digit days', () => {
    const date = new Date(2024, 5, 5); // June 5, 2024
    expect(formatDate(date)).toBe('5 de junio de 2024');
  });

  it('handles the last day of the month', () => {
    const date = new Date(2024, 0, 31); // January 31, 2024
    expect(formatDate(date)).toBe('31 de enero de 2024');
  });
});

describe('formatTime', () => {
  it('formats time in HH:mm using America/Mexico_City timezone', () => {
    // January is CST (UTC-6), so 20:30 UTC = 14:30 CST
    const date = new Date('2024-01-15T20:30:00Z');
    expect(formatTime(date)).toBe('14:30');
  });

  it('formats midnight correctly', () => {
    // 06:00 UTC = 00:00 CST in winter (UTC-6)
    const date = new Date('2024-01-15T06:00:00Z');
    expect(formatTime(date)).toBe('00:00');
  });

  it('pads single-digit hours and minutes', () => {
    // 09:05 UTC = 03:05 CST in winter (UTC-6)
    const date = new Date('2024-01-15T09:05:00Z');
    expect(formatTime(date)).toBe('03:05');
  });

  it('handles summer dates (Mexico abolished DST in 2022, stays UTC-6)', () => {
    // Since 2022, America/Mexico_City stays at UTC-6 year-round
    // 20:30 UTC = 14:30 CST
    const date = new Date('2024-07-15T20:30:00Z');
    expect(formatTime(date)).toBe('14:30');
  });
});

describe('formatDateShort', () => {
  it('formats date as dd/MM/yyyy', () => {
    const date = new Date(2024, 0, 1); // January 1, 2024
    expect(formatDateShort(date)).toBe('01/01/2024');
  });

  it('pads single-digit days and months', () => {
    const date = new Date(2024, 2, 5); // March 5, 2024
    expect(formatDateShort(date)).toBe('05/03/2024');
  });

  it('formats December 25th correctly', () => {
    const date = new Date(2024, 11, 25); // December 25, 2024
    expect(formatDateShort(date)).toBe('25/12/2024');
  });

  it('formats last day of month correctly', () => {
    const date = new Date(2024, 9, 31); // October 31, 2024
    expect(formatDateShort(date)).toBe('31/10/2024');
  });
});

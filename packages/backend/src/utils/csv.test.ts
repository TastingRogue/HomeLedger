import { describe, it, expect } from 'vitest';
import { toCsv, escapeCsvField } from './csv.js';

describe('escapeCsvField', () => {
  it('leaves plain values untouched', () => {
    expect(escapeCsvField('hello')).toBe('hello');
    expect(escapeCsvField('with space')).toBe('with space');
  });

  it('stringifies numbers', () => {
    expect(escapeCsvField(42)).toBe('42');
    expect(escapeCsvField(3.14)).toBe('3.14');
    expect(escapeCsvField(0)).toBe('0');
    expect(escapeCsvField(-5)).toBe('-5');
  });

  it('renders null/undefined as an empty field', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });

  it('quotes fields containing a comma', () => {
    expect(escapeCsvField('Rent, monthly')).toBe('"Rent, monthly"');
  });

  it('quotes and doubles internal double-quotes', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes fields containing newlines or carriage returns', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvField('a\r\nb')).toBe('"a\r\nb"');
  });
});

describe('toCsv', () => {
  it('emits the header row first, then data rows, separated by CRLF', () => {
    const csv = toCsv(['A', 'B'], [['1', '2'], ['3', '4']]);
    expect(csv).toBe('A,B\r\n1,2\r\n3,4');
  });

  it('returns just the header when there are no rows', () => {
    expect(toCsv(['A', 'B'], [])).toBe('A,B');
  });

  it('escapes cells needing quotes and stringifies mixed cell types', () => {
    const csv = toCsv(
      ['Name', 'Amount', 'Notes'],
      [['Café, MX', 1234.5, 'has "quotes"'], ['Plain', 0, null]]
    );
    expect(csv).toBe(
      'Name,Amount,Notes\r\n' +
        '"Café, MX",1234.5,"has ""quotes"""\r\n' +
        'Plain,0,'
    );
  });

  it('does not add a trailing newline', () => {
    const csv = toCsv(['X'], [['y']]);
    expect(csv.endsWith('\n')).toBe(false);
    expect(csv).toBe('X\r\ny');
  });
});

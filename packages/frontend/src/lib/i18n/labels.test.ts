import { describe, it, expect } from 'vitest';
import { es } from './es';
import { en } from './en';
import { enumLabel, hasEnumLabel, daysRemainingLabel, type Translate } from './labels';

// Issue #15: with the UI in English, stored Spanish enum values (Gasto, Mensual,
// Débito, ...) leaked into the interface. These pin the display mapping while
// the stored values themselves stay untouched.

const makeTr = (dict: Record<string, string>): Translate => (key, params) => {
  let text = dict[key] ?? key;
  for (const [k, v] of Object.entries(params ?? {})) text = text.replace(`{${k}}`, String(v));
  return text;
};
const trEn = makeTr(en);
const trEs = makeTr(es);

describe('enumLabel', () => {
  it('translates stored Spanish values into English', () => {
    expect(enumLabel(trEn, 'Gasto')).toBe('Expense');
    expect(enumLabel(trEn, 'Ingreso')).toBe('Income');
    expect(enumLabel(trEn, 'Ambos')).toBe('Both');
    expect(enumLabel(trEn, 'Débito')).toBe('Debit');
    expect(enumLabel(trEn, 'Crédito')).toBe('Credit');
    expect(enumLabel(trEn, 'Inversión')).toBe('Investment');
    expect(enumLabel(trEn, 'Vales')).toBe('Vouchers');
    expect(enumLabel(trEn, 'Efectivo')).toBe('Cash');
    expect(enumLabel(trEn, 'Mensual')).toBe('Monthly');
    expect(enumLabel(trEn, 'Semanal')).toBe('Weekly');
    expect(enumLabel(trEn, 'Activa')).toBe('Active');
    expect(enumLabel(trEn, 'Inactiva')).toBe('Inactive');
    expect(enumLabel(trEn, 'Completada')).toBe('Completed');
  });

  it('keeps Spanish labels in the Spanish UI', () => {
    expect(enumLabel(trEs, 'Gasto')).toBe('Gasto');
    expect(enumLabel(trEs, 'Débito')).toBe('Débito');
    expect(enumLabel(trEs, 'Mensual')).toBe('Mensual');
  });

  it('maps both goal-type spellings (UI "Lista de Deseos" and DB "ListaDeseos")', () => {
    expect(enumLabel(trEn, 'Lista de Deseos')).toBe('Wishlist');
    expect(enumLabel(trEn, 'ListaDeseos')).toBe('Wishlist');
    expect(enumLabel(trEn, 'Deuda')).toBe('Debt');
  });

  it('returns unknown values unchanged and empty input as an empty string', () => {
    expect(enumLabel(trEn, 'Mi cuenta rara')).toBe('Mi cuenta rara');
    expect(enumLabel(trEn, null)).toBe('');
    expect(enumLabel(trEn, undefined)).toBe('');
    expect(enumLabel(trEn, '')).toBe('');
  });

  it('knows which values it can translate', () => {
    expect(hasEnumLabel('Gasto')).toBe(true);
    expect(hasEnumLabel('nope')).toBe(false);
  });

  it('never resolves to a missing key (every mapped label exists in both dictionaries)', () => {
    const values = ['Gasto', 'Ingreso', 'Ambos', 'Débito', 'Crédito', 'Inversión', 'Vales', 'Efectivo',
      'Mensual', 'Semanal', 'Lista de Deseos', 'ListaDeseos', 'Deuda', 'Activa', 'Activo', 'Inactiva', 'Inactivo', 'Completada'];
    for (const v of values) {
      // A missing key makes the translator echo the key itself (contains a dot).
      expect(enumLabel(trEn, v), `en label for ${v}`).not.toMatch(/^(enum|goals)\./);
      expect(enumLabel(trEs, v), `es label for ${v}`).not.toMatch(/^(enum|goals)\./);
    }
  });
});

describe('daysRemainingLabel', () => {
  it('formats in English and Spanish', () => {
    expect(daysRemainingLabel(trEn, 0)).toBe('Today');
    expect(daysRemainingLabel(trEn, 1)).toBe('Tomorrow');
    expect(daysRemainingLabel(trEn, 7)).toBe('7 days');
    expect(daysRemainingLabel(trEn, -2)).toBe('Overdue (2 days)');
    expect(daysRemainingLabel(trEs, 0)).toBe('Hoy');
    expect(daysRemainingLabel(trEs, -2)).toBe('Vencido (2 días)');
  });
});

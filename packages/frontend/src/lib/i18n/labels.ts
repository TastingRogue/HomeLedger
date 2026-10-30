/**
 * Display labels for enum-like values that are STORED (and compared in logic)
 * in Spanish: transaction/category type, account type, budget period,
 * subscription cycle, goal type, and the various status values.
 *
 * The stored values must never change (they are persisted in the DB, sent over
 * the API and compared throughout the app). Only what the user SEES is
 * translated, through this one lookup, so an English UI never shows `Gasto`,
 * `Mensual`, `Débito`, etc.
 *
 * Usage in a template (reactive to the active language because `$t` is passed):
 *   {enumLabel($t, account.type)}
 */

export type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Stored value → translation key. */
const ENUM_KEYS: Record<string, string> = {
  // Transaction type / category type
  Gasto: 'enum.tx.expense',
  Ingreso: 'enum.tx.income',
  Ambos: 'enum.category.both',

  // Account type
  'Débito': 'enum.account.debit',
  'Crédito': 'enum.account.credit',
  'Inversión': 'enum.account.investment',
  Vales: 'enum.account.vouchers',
  Efectivo: 'enum.account.cash',

  // Budget period (API/UI values) and subscription cycle
  Mensual: 'enum.period.monthly',
  Semanal: 'enum.period.weekly',

  // Goal type (UI value, and the DB value without spaces)
  'Lista de Deseos': 'goals.type_wishlist',
  ListaDeseos: 'goals.type_wishlist',
  Deuda: 'goals.type_debt',

  // Status values (subscriptions, goals, accounts)
  Activa: 'enum.status.active',
  Activo: 'enum.status.active',
  Inactiva: 'enum.status.inactive',
  Inactivo: 'enum.status.inactive',
  Completada: 'enum.status.completed',
};

/**
 * Returns the translated label for a stored enum value. Unknown values (for
 * example user-defined text) are returned unchanged rather than hidden.
 */
export function enumLabel(tr: Translate, value: string | null | undefined): string {
  if (value == null || value === '') return '';
  const key = ENUM_KEYS[value];
  return key ? tr(key) : value;
}

/** True when `value` has a known translation (useful for tests). */
export function hasEnumLabel(value: string): boolean {
  return value in ENUM_KEYS;
}

/**
 * Localized "days remaining" label (replaces the old Spanish-only strings).
 * Negative = overdue.
 */
export function daysRemainingLabel(tr: Translate, days: number): string {
  if (days < 0) return tr('days.overdue', { n: Math.abs(days) });
  if (days === 0) return tr('days.today');
  if (days === 1) return tr('days.tomorrow');
  return tr('days.n', { n: days });
}

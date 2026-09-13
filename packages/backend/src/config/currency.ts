import { SettingsService } from '../services/settings.service.js';

/**
 * Instance currency (single-currency-per-install model, P1.13 Option A).
 *
 * HomeLedger v1 is single-currency: all amounts are stored as plain numbers and
 * every total sums them directly, so the whole install shares ONE currency.
 * That currency is an instance setting (admin-chosen), not per-account — mixing
 * currencies is intentionally not supported (there is no FX conversion). True
 * multi-currency is a post-1.0 feature.
 *
 * The value is stored in `app_settings`, seeded on first run from the
 * `DISPLAY_CURRENCY` env var, and editable by an admin at runtime.
 */
export const SUPPORTED_CURRENCIES = ['MXN', 'USD', 'EUR', 'COP', 'ARS', 'CLP', 'PEN', 'BRL'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const SETTING_INSTANCE_CURRENCY = 'instance_currency';
const DEFAULT_CURRENCY: SupportedCurrency = 'MXN';

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Seeds the instance currency from `DISPLAY_CURRENCY` on first run only. */
export function seedCurrencySettingFromEnv(): void {
  const env = process.env['DISPLAY_CURRENCY']?.trim().toUpperCase();
  SettingsService.setIfAbsent(SETTING_INSTANCE_CURRENCY, isSupportedCurrency(env) ? env : DEFAULT_CURRENCY);
}

/** The single currency used across the whole install. */
export function getInstanceCurrency(): SupportedCurrency {
  const stored = SettingsService.get(SETTING_INSTANCE_CURRENCY);
  return isSupportedCurrency(stored) ? stored : DEFAULT_CURRENCY;
}

export function setInstanceCurrency(currency: SupportedCurrency): void {
  SettingsService.set(SETTING_INSTANCE_CURRENCY, currency);
}

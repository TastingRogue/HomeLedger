import { SettingsService } from '../services/settings.service.js';

/**
 * Base currency for consolidated reports. Individual accounts may use another
 * supported currency and a manually configured exchange rate to this base.
 */
export const SUPPORTED_CURRENCIES = ['MXN', 'USD', 'EUR', 'GBP', 'COP', 'ARS', 'CLP', 'PEN', 'BRL'] as const;
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

/** The base currency used for consolidated totals. */
export function getInstanceCurrency(): SupportedCurrency {
  const stored = SettingsService.get(SETTING_INSTANCE_CURRENCY);
  return isSupportedCurrency(stored) ? stored : DEFAULT_CURRENCY;
}

export function setInstanceCurrency(currency: SupportedCurrency): void {
  SettingsService.set(SETTING_INSTANCE_CURRENCY, currency);
}

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from '../i18n/registry';

export type { SupportedLocale };
export type SupportedCurrency = 'MXN' | 'USD' | 'EUR' | 'COP' | 'ARS' | 'CLP' | 'PEN' | 'BRL';

export interface UserPreferences {
  locale: SupportedLocale;
  currency: SupportedCurrency;
}

const STORAGE_KEY = 'sf_preferences';

const DEFAULTS: UserPreferences = { locale: DEFAULT_LOCALE, currency: 'MXN' };

function loadFromStorage(): UserPreferences {
  if (!browser) return { ...DEFAULTS };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<UserPreferences>;
      // Validate the stored locale against the registry so a removed/renamed
      // language (or corrupted storage) can never leave the app in a bad state.
      const locale = isSupportedLocale(parsed.locale) ? parsed.locale : DEFAULT_LOCALE;
      return { ...DEFAULTS, ...parsed, locale };
    }
  } catch {
    /* localStorage unavailable or corrupt — fall back to defaults */
  }
  return { ...DEFAULTS };
}

function saveToStorage(prefs: UserPreferences) {
  if (!browser) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export const preferences = writable<UserPreferences>(loadFromStorage());

// Auto-save to localStorage on change
preferences.subscribe((value) => {
  saveToStorage(value);
});

// Helper to update a single preference
export function setLocale(locale: SupportedLocale) {
  preferences.update(p => ({ ...p, locale }));
}

export function setCurrency(currency: SupportedCurrency) {
  preferences.update(p => ({ ...p, currency }));
}

export function getPreferences(): UserPreferences {
  return get(preferences);
}

// Currency display config
export const currencyConfig: Record<SupportedCurrency, { symbol: string; name: string; locale: string }> = {
  MXN: { symbol: 'MX$', name: 'Peso Mexicano', locale: 'es-MX' },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  COP: { symbol: 'COL$', name: 'Peso Colombiano', locale: 'es-CO' },
  ARS: { symbol: 'AR$', name: 'Peso Argentino', locale: 'es-AR' },
  CLP: { symbol: 'CL$', name: 'Peso Chileno', locale: 'es-CL' },
  PEN: { symbol: 'S/', name: 'Sol Peruano', locale: 'es-PE' },
  BRL: { symbol: 'R$', name: 'Real Brasileño', locale: 'pt-BR' },
};

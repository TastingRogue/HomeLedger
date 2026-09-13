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

/**
 * Whether the user had an explicit locale stored at startup. Captured BEFORE the
 * auto-save subscription writes anything, so we can tell "user chose a language"
 * apart from "we fell back to a default". Used by `applyHostDefaultLocale` so the
 * host default only applies on a genuine first run, never overriding a real choice.
 */
let localeWasStored = false;

function loadFromStorage(): UserPreferences {
  if (!browser) return { ...DEFAULTS };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<UserPreferences>;
      // Validate the stored locale against the registry so a removed/renamed
      // language (or corrupted storage) can never leave the app in a bad state.
      const locale = isSupportedLocale(parsed.locale) ? parsed.locale : DEFAULT_LOCALE;
      localeWasStored = isSupportedLocale(parsed.locale);
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

const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['MXN', 'USD', 'EUR', 'COP', 'ARS', 'CLP', 'PEN', 'BRL'];

/**
 * Applies instance config from GET /api/v1/config at startup:
 *  - `locale`: the host's default language, adopted only on a genuine first run
 *    (stored user choice → host DEFAULT_LOCALE → English). A user's choice wins.
 *  - `currency`: the INSTANCE currency. HomeLedger v1 is single-currency per
 *    install, so this is authoritative and always applied (it is not a per-user
 *    override). Amounts are displayed with this one currency.
 *
 * Failures (offline, endpoint missing) are ignored so the app keeps its defaults.
 */
export async function applyInstanceConfig(): Promise<void> {
  if (!browser) return;
  try {
    const res = await fetch('/api/v1/config');
    if (!res.ok) return;
    const body = await res.json().catch(() => ({}));
    const data = body?.data ?? body;

    const hostLocale = data?.defaultLocale as unknown;
    if (isSupportedLocale(hostLocale) && !localeWasStored) {
      preferences.update((p) => ({ ...p, locale: hostLocale }));
    }

    const instanceCurrency = data?.instanceCurrency as unknown;
    if (typeof instanceCurrency === 'string' && (SUPPORTED_CURRENCIES as string[]).includes(instanceCurrency)) {
      preferences.update((p) => ({ ...p, currency: instanceCurrency as SupportedCurrency }));
    }
  } catch {
    /* offline or endpoint unavailable — keep defaults */
  }
}

/** @deprecated use applyInstanceConfig */
export const applyHostDefaultLocale = applyInstanceConfig;

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

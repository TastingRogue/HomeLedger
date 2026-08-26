import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export type SupportedLocale = 'es' | 'en';
export type SupportedCurrency = 'MXN' | 'USD' | 'EUR' | 'COP' | 'ARS' | 'CLP' | 'PEN' | 'BRL';

export interface UserPreferences {
  locale: SupportedLocale;
  currency: SupportedCurrency;
}

const STORAGE_KEY = 'sf_preferences';

function loadFromStorage(): UserPreferences {
  if (!browser) return { locale: 'es', currency: 'MXN' };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { locale: 'es', currency: 'MXN' };
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

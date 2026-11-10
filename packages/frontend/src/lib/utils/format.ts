/**
 * Currency and number formatting utilities for the frontend.
 * Numeric separators follow the active interface language.
 */
import { get } from 'svelte/store';
import { preferences } from '../stores/preferences';
import { getIntlTag } from '../i18n/registry';
import { t } from '../i18n';
import { daysRemainingLabel, type Translate } from '../i18n/labels';

/**
 * Format a number as MXN currency: "MX$1,234.56"
 * Negative values are prefixed with "-": "-MX$1,500.00"
 * Zero is shown as "MX$0.00"
 */
export function formatCurrency(amount: number): string {
  // Dynamic currency from preferences (reads synchronously from localStorage)
  let symbol = 'MX$';
  if (typeof window !== 'undefined') {
    try {
      const prefs = JSON.parse(localStorage.getItem('sf_preferences') ?? '{}');
      if (prefs.currency) {
        const currency = prefs.currency;
        const symbols: Record<string, string> = { MXN: 'MX$', USD: '$', EUR: '€', GBP: '£', COP: 'COL$', ARS: 'AR$', CLP: 'CL$', PEN: 'S/', BRL: 'R$' };
        symbol = symbols[currency] ?? '$';
      }
    } catch {
      /* preferences unreadable — use MXN default */
    }
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const locale = getIntlTag(get(preferences).locale);
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(absAmount);
  const space = locale === 'pt-BR' ? '\u00a0' : '';
  return `${isNegative ? '-' : ''}${symbol}${space}${number}`;
}

/**
 * Format a percentage value with up to 1 decimal place.
 */
export function formatPercentage(value: number): string {
  return `${new Intl.NumberFormat(getIntlTag(get(preferences).locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
}

/**
 * Alias for formatPercentage (backward compat).
 */
export const formatPercent = formatPercentage;

/**
 * Format a long date in the selected interface language.
 * Accepts Date object or ISO string.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date) : date;
  return new Intl.DateTimeFormat(getIntlTag(get(preferences).locale), { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/**
 * Format time as "HH:mm" in America/Mexico_City timezone.
 * Accepts Date object or ISO string.
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(getIntlTag(get(preferences).locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Mexico_City'
  });
}

/**
 * Format date as "dd/MM/yyyy".
 * Accepts Date object or ISO string.
 */
export function formatDateShort(date: Date | string): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // Parse YYYY-MM-DD as local date (avoid UTC shift)
    const parts = date.split('T')[0]!.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}


/**
 * Format days remaining as a human-readable label in the active language.
 * Pass `$t` from a template so the label re-renders when the language changes;
 * without it the label uses the language active at call time.
 */
export function formatDaysRemaining(days: number, tr: Translate = get(t)): string {
  return daysRemainingLabel(tr, days);
}

/**
 * Convert an ISO date string to a datetime-local input value.
 */
export function toDatetimeLocal(isoString: string): string {
  if(/^\d{4}-\d{2}-\d{2}$/.test(isoString))return `${isoString}T00:00`;
  const d = new Date(isoString);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

/** Today's calendar date in the browser's local timezone, for date-only forms. */
export function localDateString(date=new Date()):string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

/**
 * Get the current datetime as a datetime-local input value.
 */
export function nowDatetimeLocal(): string {
  return toDatetimeLocal(new Date().toISOString());
}

/** Format a numeric value using the selected interface language. */
export function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat(getIntlTag(get(preferences).locale), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(getIntlTag(get(preferences).locale));
}

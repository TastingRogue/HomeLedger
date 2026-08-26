/**
 * Currency and number formatting utilities for the frontend.
 * Format: "MX$X,XXX.XX" with comma thousands separator and dot decimal.
 */

/**
 * Format a number as MXN currency: "MX$1,234.56"
 * Negative values are prefixed with "-": "-MX$1,500.00"
 * Zero is shown as "MX$0.00"
 */
export function formatCurrency(amount: number): string {
  // Dynamic currency from preferences (reads synchronously from localStorage)
  let currency = 'MXN';
  let symbol = 'MX$';
  if (typeof window !== 'undefined') {
    try {
      const prefs = JSON.parse(localStorage.getItem('sf_preferences') ?? '{}');
      if (prefs.currency) {
        currency = prefs.currency;
        const symbols: Record<string, string> = { MXN: 'MX$', USD: '$', EUR: '€', COP: 'COL$', ARS: 'AR$', CLP: 'CL$', PEN: 'S/', BRL: 'R$' };
        symbol = symbols[currency] ?? '$';
      }
    } catch {}
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const fixed = absAmount.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = `${symbol}${withCommas}.${decPart}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format a percentage value with up to 1 decimal place.
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Alias for formatPercentage (backward compat).
 */
export const formatPercent = formatPercentage;

/**
 * Format a date in Spanish: "d de MMMM de yyyy"
 * Accepts Date object or ISO string.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} de ${month} de ${year}`;
}

/**
 * Format time as "HH:mm" in America/Mexico_City timezone.
 * Accepts Date object or ISO string.
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('es-MX', {
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
  if (typeof date === 'string') {
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
 * Format days remaining as a human-readable label.
 */
export function formatDaysRemaining(days: number): string {
  if (days < 0) return `Vencido (${Math.abs(days)} días)`;
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `${days} días`;
}

/**
 * Convert an ISO date string to a datetime-local input value.
 */
export function toDatetimeLocal(isoString: string): string {
  const d = new Date(isoString);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

/**
 * Get the current datetime as a datetime-local input value.
 */
export function nowDatetimeLocal(): string {
  return toDatetimeLocal(new Date().toISOString());
}

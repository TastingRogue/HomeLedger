/**
 * Date and time formatting utilities for HomeLedger.
 * All dates are displayed in Spanish, using the America/Mexico_City timezone.
 */

const SPANISH_MONTHS: readonly string[] = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Formats a Date as a long Spanish date string.
 * Format: "d de MMMM de yyyy"
 *
 * @param date - The Date object to format
 * @returns Formatted date string in Spanish
 *
 * @example
 * formatDate(new Date('2024-01-01')) // "1 de enero de 2024"
 * formatDate(new Date('2024-12-25')) // "25 de diciembre de 2024"
 */
export function formatDate(date: Date): string {
  const day = date.getDate();
  const month = SPANISH_MONTHS[date.getMonth()];
  const year = date.getFullYear();

  return `${day} de ${month} de ${year}`;
}

/**
 * Formats a Date as a time string in HH:mm format using America/Mexico_City timezone.
 *
 * @param date - The Date object to format
 * @returns Formatted time string "HH:mm"
 *
 * @example
 * formatTime(new Date('2024-01-15T20:30:00Z')) // "14:30" (UTC-6 in winter)
 */
export function formatTime(date: Date): string {
  const formatter = new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Mexico_City',
  });

  return formatter.format(date);
}

/**
 * Formats a Date as a short date string in dd/MM/yyyy format.
 *
 * @param date - The Date object to format
 * @returns Formatted short date string
 *
 * @example
 * formatDateShort(new Date('2024-01-01')) // "01/01/2024"
 * formatDateShort(new Date('2024-12-25')) // "25/12/2024"
 */
export function formatDateShort(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

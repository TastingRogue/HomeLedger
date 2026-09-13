/**
 * Minimal RFC 4180 CSV serializer.
 *
 * - Fields containing a comma, double-quote, CR, or LF are wrapped in double
 *   quotes, with any internal double-quotes doubled ("" ).
 * - Rows are separated by CRLF (the RFC line ending; spreadsheet apps expect it).
 * - `null`/`undefined` become empty fields; numbers are stringified.
 *
 * Kept pure and dependency-free so it's trivially unit-testable and reusable.
 */

export type CsvCell = string | number | null | undefined;

/** Escapes a single CSV field per RFC 4180. */
export function escapeCsvField(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'number' ? String(value) : value;
  // Quote only when needed: contains a comma, quote, CR, or LF.
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds a CSV document from a header row and data rows.
 *
 * @param headers - column headers (the first output line)
 * @param rows - data rows; each is an array of cells aligned to the headers
 * @returns the CSV text (CRLF-separated, no trailing newline)
 */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(','));
  return lines.join('\r\n');
}

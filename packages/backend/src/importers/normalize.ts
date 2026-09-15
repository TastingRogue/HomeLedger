/**
 * Normalization helpers for the smart importer (P4.4).
 *
 * All pure, dependency-free, and offline — they operate only on the strings the
 * bank file already contains. No network, no locale service.
 *
 * Three concerns:
 *  - normalizeMerchant: turn a noisy bank description into a stable merchant name
 *    so dedupe + rules matching are reliable ("OXXO GAS #4821 15/03" → "Oxxo Gas").
 *  - normalizeDate: parse the many date shapes banks emit into an ISO-8601 string.
 *  - parseAmount: parse a currency-formatted amount ("$1,234.56", "1.234,56")
 *    into a number, plus detect the debit/credit sign when present.
 */

// ============================================
// Merchant normalization
// ============================================

/**
 * Tokens that are pure noise in a bank description and never part of a real
 * merchant name. Matched as whole words, case-insensitively.
 */
const MERCHANT_NOISE_WORDS = new Set([
  'compra', 'pago', 'cargo', 'abono', 'tarjeta', 'debito', 'débito',
  'credito', 'crédito', 'tdc', 'tdd', 'spei', 'transferencia', 'transf',
  'domiciliacion', 'domiciliación', 'mov', 'movimiento', 'ref', 'referencia',
  'aut', 'autorizacion', 'autorización', 'clave', 'folio', 'op', 'operacion',
  'operación', 'purchase', 'payment', 'pos', 'card', 'terminal',
]);

/**
 * Normalize a raw bank description into a stable, human-friendly merchant name.
 *
 * Steps (all conservative — never invents text):
 *  1. Uppercase-strip diacritics-insensitive cleanup of surrounding whitespace.
 *  2. Remove trailing/embedded reference noise: long digit runs, `#1234`,
 *     `REF:...`, `AUT 123456`, dates (DD/MM, DD/MM/YYYY, YYYY-MM-DD), times.
 *  3. Drop standalone noise words (compra/pago/pos/…).
 *  4. Collapse whitespace and Title-Case the remaining words.
 *
 * Returns '' when nothing meaningful is left (caller falls back to the raw name).
 */
export function normalizeMerchant(raw: string | null | undefined): string {
  if (!raw) return '';

  let s = String(raw).trim();
  if (s === '') return '';

  // Normalize separators to spaces early so word logic is uniform.
  s = s.replace(/[_|]+/g, ' ');

  // Remove ISO dates, DD/MM[/YYYY], DD-MM[-YYYY] and clock times.
  s = s.replace(/\b\d{4}-\d{2}-\d{2}([ t]\d{2}:\d{2}(:\d{2})?)?\b/gi, ' ');
  s = s.replace(/\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/g, ' ');
  s = s.replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, ' ');

  // Remove explicit reference tokens: REF:..., AUT 123456, FOLIO 123, OP 987,
  // CLAVE ABC123 — the keyword plus the code that follows it.
  s = s.replace(
    /\b(ref|referencia|aut|autorizaci[oó]n|folio|op|operaci[oó]n|clave|no)\b[:.#]?\s*[a-z0-9-]+/gi,
    ' ',
  );

  // Remove `#1234` style tokens (store/terminal numbers).
  s = s.replace(/#\s*\d+/g, ' ');

  // Remove standalone long digit runs (5+ digits: card fragments, refs, phone).
  s = s.replace(/\b\d{5,}\b/g, ' ');

  // Remove currency symbols/markers left inline.
  s = s.replace(/\b(mxn|usd|eur)\b/gi, ' ');

  // Tokenize, drop noise words and leftover short numeric tokens.
  const tokens = s
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')) // trim punctuation
    .filter((t) => t.length > 0)
    .filter((t) => !MERCHANT_NOISE_WORDS.has(t.toLowerCase()))
    // drop tokens that are just digits (store numbers, small refs)
    .filter((t) => !/^\d+$/.test(t));

  if (tokens.length === 0) return '';

  return tokens.map(titleCaseWord).join(' ');
}

/**
 * Title-case a single word.
 *
 * We intentionally do NOT try to preserve "acronyms" — telling `OXXO`/`HEB`
 * (keep caps) apart from `GAS`/`UBER` (don't) can't be done reliably without a
 * dictionary, and inconsistent casing would fragment dedupe. Consistent
 * Title-Case is predictable and good enough for matching + display.
 */
function titleCaseWord(word: string): string {
  if (word.length === 0) return word;
  const lower = word.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// ============================================
// Date normalization
// ============================================

const MONTH_NAMES: Record<string, number> = {
  ene: 1, enero: 1, jan: 1, january: 1,
  feb: 2, febrero: 2, february: 2,
  mar: 3, marzo: 3, march: 3,
  abr: 4, abril: 4, apr: 4, april: 4,
  may: 5, mayo: 5,
  jun: 6, junio: 6, june: 6,
  jul: 7, julio: 7, july: 7,
  ago: 8, agosto: 8, aug: 8, august: 8,
  sep: 9, sept: 9, septiembre: 9, september: 9,
  oct: 10, octubre: 10, october: 10,
  nov: 11, noviembre: 11, november: 11,
  dic: 12, diciembre: 12, dec: 12, december: 12,
};

/** Build an ISO string at noon UTC for a Y/M/D (avoids TZ day-shift). */
function isoAtNoon(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}T12:00:00.000Z`;
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2200) return false;
  return true;
}

/**
 * Normalize a date string from a bank file into an ISO-8601 timestamp.
 *
 * Handles: already-ISO (`YYYY-MM-DD[...]`), `DD/MM/YYYY`, `DD-MM-YYYY`,
 * `MM/DD/YYYY` (disambiguated when day>12), `DD/MM/YY`, `DD Mon YYYY` /
 * `DD-Mon-YYYY` textual months (es/en), and a JS `Date` fallback.
 *
 * `preferDMY` (default true — most MX/EU banks) decides ambiguous `a/b/YYYY`
 * where both parts are <= 12.
 *
 * Returns null when the string can't be parsed (caller decides the fallback).
 */
export function normalizeDate(dateStr: string | null | undefined, preferDMY = true): string | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (s === '') return null;

  // Already ISO (YYYY-MM-DD...).
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    if (s.length === 10) return `${s}T12:00:00.000Z`;
    const d = new Date(s);
    return isNaN(d.getTime()) ? `${s.substring(0, 10)}T12:00:00.000Z` : d.toISOString();
  }

  // Numeric a/b/c with / or - separators.
  const numeric = /^(\d{1,4})[/-](\d{1,2})[/-](\d{2,4})$/.exec(s);
  if (numeric) {
    const p1 = parseInt(numeric[1]!, 10);
    const p2 = parseInt(numeric[2]!, 10);
    let p3 = parseInt(numeric[3]!, 10);

    // YYYY/MM/DD (first part is a 4-digit year).
    if (numeric[1]!.length === 4) {
      if (isValidYmd(p1, p2, p3)) return isoAtNoon(p1, p2, p3);
      return null;
    }

    // Two-digit year → 2000-based.
    if (numeric[3]!.length === 2) p3 += 2000;

    // Disambiguate day vs month.
    let day: number;
    let month: number;
    if (p1 > 12 && p2 <= 12) {
      day = p1; month = p2; // clearly DD/MM
    } else if (p2 > 12 && p1 <= 12) {
      day = p2; month = p1; // clearly MM/DD
    } else {
      // Ambiguous: honor the preference.
      if (preferDMY) { day = p1; month = p2; } else { day = p2; month = p1; }
    }

    if (isValidYmd(p3, month, day)) return isoAtNoon(p3, month, day);
    return null;
  }

  // Textual month: "15 mar 2024", "15-Mar-2024", "Mar 15 2024".
  const textual = /^(\d{1,2})[\s-]+([a-záéíóú]+)[\s-]+(\d{2,4})$/i.exec(s)
    ?? /^([a-záéíóú]+)[\s-]+(\d{1,2})[,\s-]+(\d{2,4})$/i.exec(s);
  if (textual) {
    let day: number;
    let monthName: string;
    let year: number;
    if (/^\d/.test(textual[1]!)) {
      day = parseInt(textual[1]!, 10);
      monthName = textual[2]!.toLowerCase();
      year = parseInt(textual[3]!, 10);
    } else {
      monthName = textual[1]!.toLowerCase();
      day = parseInt(textual[2]!, 10);
      year = parseInt(textual[3]!, 10);
    }
    if (year < 100) year += 2000;
    const month = MONTH_NAMES[monthName] ?? MONTH_NAMES[monthName.substring(0, 3)];
    if (month && isValidYmd(year, month, day)) return isoAtNoon(year, month, day);
    return null;
  }

  // Fallback: let the JS Date parser try.
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();

  return null;
}

// ============================================
// Amount / currency parsing
// ============================================

export interface ParsedAmount {
  /** Absolute value, rounded to 2 decimals. */
  amount: number;
  /** Sign detected from the raw string: -1 (debit), 1 (credit), or 0 (none). */
  sign: number;
}

/**
 * Parse a currency-formatted amount string into `{ amount, sign }`.
 *
 * Handles: `$1,234.56`, `1,234.56`, `1.234,56` (EU/LA grouping), `-599.00`,
 * `(599.00)` accounting negatives, trailing `MXN`/`USD`. `amount` is always the
 * absolute value; `sign` reports the detected direction (-1/0/1).
 */
export function parseAmount(raw: string | null | undefined): ParsedAmount {
  if (raw == null) return { amount: 0, sign: 0 };
  let s = String(raw).trim();
  if (s === '' || s === '-') return { amount: 0, sign: 0 };

  let sign = 0;
  // Accounting-style negatives: (1,234.56)
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1);
  }
  if (/^-/.test(s.trim())) sign = -1;
  if (/^\+/.test(s.trim())) sign = 1;

  // Strip currency symbols/codes and spaces.
  s = s.replace(/[$€£]/g, '').replace(/\b(mxn|usd|eur)\b/gi, '').replace(/\s/g, '');
  s = s.replace(/[+-]/g, '');

  if (s === '') return { amount: 0, sign };

  // Decide decimal separator. If both '.' and ',' present, the LAST one is the
  // decimal separator; the other is grouping.
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot) {
      // EU/LA: 1.234,56 → comma is decimal
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 1,234.56 → dot is decimal
      s = s.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    // Only comma present. If it looks like a decimal (<=2 digits after), treat
    // as decimal; else grouping.
    const after = s.length - lastComma - 1;
    if (after <= 2) s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
  } else {
    // Only dot(s) or none. Remove all but a decimal-looking last dot.
    const dotCount = (s.match(/\./g) ?? []).length;
    if (dotCount > 1) s = s.replace(/\.(?=.*\.)/g, ''); // strip all but last dot
  }

  const num = parseFloat(s);
  if (isNaN(num)) return { amount: 0, sign };
  return { amount: Math.round(Math.abs(num) * 100) / 100, sign };
}

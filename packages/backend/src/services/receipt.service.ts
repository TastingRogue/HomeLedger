import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { getSqlite } from '../db/connection.js';
import { AttachmentService, type AttachmentRecord } from './attachment.service.js';
import { TransactionService } from './transaction.service.js';
import { TransactionType } from '@homeledger/shared';

export type ReceiptSourceType = 'cfdi_xml' | 'pdf_text' | 'ocr' | 'unknown';

export interface ReceiptItem { id: number; analysisId: number; description: string; quantity: number | null; unitPrice: number | null; total: number | null; categoryId: number | null; }
export interface ReceiptAnalysis {
  id: number; attachmentId: number; userId: number; transactionId: number | null;
  merchant: string | null; receiptDate: string | null; subtotal: number | null; tax: number | null; total: number | null;
  currency: string; documentType: 'receipt' | 'invoice' | 'cfdi' | 'unknown'; sourceType: ReceiptSourceType;
  status: 'pending' | 'processing' | 'completed' | 'failed'; confidence: number; rawText: string | null;
  uuid: string | null; issuerRfc: string | null; issuerName: string | null; error: string | null;
  filename: string | null; mimeType: string; transactionName: string | null; transactionAmount: number | null;
  createdAt: string; updatedAt: string; items: ReceiptItem[];
}
export interface ParsedReceipt extends Omit<ReceiptAnalysis, 'id' | 'attachmentId' | 'userId' | 'transactionId' | 'status' | 'error' | 'filename' | 'mimeType' | 'transactionName' | 'transactionAmount' | 'createdAt' | 'updatedAt' | 'items'> { items: Omit<ReceiptItem, 'id' | 'analysisId'>[]; }

function ensureTables(): void {
  getSqlite().exec(`
    CREATE TABLE IF NOT EXISTS receipt_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT, attachment_id INTEGER NOT NULL UNIQUE REFERENCES attachments(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, transaction_id INTEGER, merchant TEXT, receipt_date TEXT,
      subtotal REAL, tax REAL, total REAL, currency TEXT NOT NULL DEFAULT 'MXN', document_type TEXT NOT NULL DEFAULT 'unknown',
      source_type TEXT NOT NULL DEFAULT 'unknown',
      status TEXT NOT NULL DEFAULT 'pending', confidence REAL NOT NULL DEFAULT 0, raw_text TEXT, uuid TEXT, issuer_rfc TEXT,
      issuer_name TEXT, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS receipt_analyses_user_id_idx ON receipt_analyses(user_id);
    CREATE INDEX IF NOT EXISTS receipt_analyses_transaction_id_idx ON receipt_analyses(transaction_id);
    CREATE TABLE IF NOT EXISTS receipt_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, analysis_id INTEGER NOT NULL REFERENCES receipt_analyses(id) ON DELETE CASCADE,
      description TEXT NOT NULL, quantity REAL, unit_price REAL, total REAL, category_id INTEGER
    );
    CREATE INDEX IF NOT EXISTS receipt_items_analysis_id_idx ON receipt_items(analysis_id);
  `);
  // Additive migrations for tables created before these columns existed.
  const columns = (getSqlite().prepare('PRAGMA table_info(receipt_analyses)').all() as { name: string }[]).map(c => c.name);
  if (!columns.includes('source_type')) getSqlite().exec("ALTER TABLE receipt_analyses ADD COLUMN source_type TEXT NOT NULL DEFAULT 'unknown'");
  if (!columns.includes('error')) getSqlite().exec('ALTER TABLE receipt_analyses ADD COLUMN error TEXT');
  // P4.6: per-item category for item-level categorization of receipts.
  const itemColumns = (getSqlite().prepare('PRAGMA table_info(receipt_items)').all() as { name: string }[]).map(c => c.name);
  if (!itemColumns.includes('category_id')) getSqlite().exec('ALTER TABLE receipt_items ADD COLUMN category_id INTEGER');
}

export function numberValue(value: string | null | undefined): number | null {
  if (!value) return null;
  // Strip currency symbols and spaces, keep digits and separators.
  let cleaned = value.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  // Decide which symbol is the decimal separator: whichever appears last.
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      // "1.234,56" -> dot is thousands, comma is decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // "1,234.56" -> comma is thousands, dot is decimal
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (lastComma > -1) {
    // Only commas present. Treat as decimal if it looks like "114,75";
    // otherwise as thousands separators ("1,234").
    cleaned = /,\d{1,2}$/.test(cleaned) ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');
  }
  // Only dots (or none): remove thousands dots like "1.234" but keep "114.75".
  else if (lastDot > -1 && !/\.\d{1,2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '');
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) { const match = pattern.exec(text); if (match?.[1]) return match[1].trim(); }
  return null;
}

/**
 * Parses a monetary amount. When `assumeCents` is true (used for OCR output that
 * dropped decimal separators, e.g. "11475" instead of "114.75"), a separator-less
 * integer with 3+ digits is treated as having its last 2 digits as cents.
 */
export function moneyValue(value: string | null | undefined, assumeCents: boolean): number | null {
  if (!value) return null;
  const hasSeparator = /[.,]/.test(value);
  const base = numberValue(value);
  if (base === null) return null;
  if (assumeCents && !hasSeparator && Number.isInteger(base) && Math.abs(base) >= 100) {
    return base / 100;
  }
  return base;
}

/**
 * Detects whether the OCR text lost decimal separators in its amounts. If none of
 * the money-looking tokens carry a decimal separator, we assume last-2-digits cents.
 */
export function ocrDroppedDecimals(text: string): boolean {
  const amountTokens = text.match(/\d[\d.,]*\d|\d/g) ?? [];
  const moneyish = amountTokens.filter(t => /\d{3,}/.test(t.replace(/[.,]/g, '')));
  if (moneyish.length === 0) return false;
  // If none of the sizable numbers has a decimal separator, decimals were likely lost.
  return moneyish.every(t => !/[.,]\d{1,2}$/.test(t));
}
// Month names → month number (1-12) for English + Spanish, including common
// abbreviations. Keys are lowercase and accent-stripped (see stripAccents), so
// "septiembre", "setiembre", "Sept." and "sep" all resolve. Enough coverage for
// receipts/invoices printed in either language.
const MONTH_NAMES: Record<string, number> = {
  // English
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11,
  december: 12, dec: 12,
  // Spanish (accent-stripped)
  enero: 1, ene: 1, febrero: 2, marzo: 3, abril: 4, abr: 4, mayo: 5,
  junio: 6, julio: 7, agosto: 8, ago: 8,
  septiembre: 9, setiembre: 9, set: 9, octubre: 10, noviembre: 11,
  diciembre: 12, dic: 12,
};

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function monthNumber(name: string): number | null {
  const key = stripAccents(name.toLowerCase()).replace(/\./g, '');
  return MONTH_NAMES[key] ?? null;
}

function toIso(year: string, month: number, day: string): string {
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Normalizes a date string to ISO `YYYY-MM-DD`. Handles, in both English and
 * Spanish:
 *   - ISO `2026-02-14[...]`
 *   - numeric `dd/mm/yyyy` and `dd-mm-yyyy` (day-first, the MX/EU convention)
 *   - textual months day-first: `02 June, 2030`, `02 de junio de 2030`, `2 jun 30`
 *   - textual months month-first: `June 2, 2030`, `junio 2 de 2030`
 * Returns the input unchanged when nothing matches (callers treat that as
 * "unparsed" and it stays user-editable).
 */
export function parseDate(value: string | null): string | null {
  if (!value) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return iso[0];

  // Textual month, day-first: "02 June, 2030" / "02 de junio de 2030" / "2 jun 2030".
  const dayFirst = /\b(\d{1,2})\s*(?:de\s+)?([A-Za-zÁÉÍÓÚáéíóúÑñ]{3,})\.?\s*(?:de\s+|,\s*)?(\d{2,4})\b/.exec(value);
  if (dayFirst) {
    const month = monthNumber(dayFirst[2]!);
    if (month) return toIso(dayFirst[3]!, month, dayFirst[1]!);
  }

  // Textual month, month-first: "June 2, 2030" / "junio 2 de 2030".
  const monthFirst = /\b([A-Za-zÁÉÍÓÚáéíóúÑñ]{3,})\.?\s+(\d{1,2})(?:\s*,|\s+de)?\s*(\d{2,4})\b/.exec(value);
  if (monthFirst) {
    const month = monthNumber(monthFirst[1]!);
    if (month) return toIso(monthFirst[3]!, month, monthFirst[2]!);
  }

  // Numeric d/m/y or m/d/y. Order is ambiguous, so we disambiguate by range:
  //  - if the first field > 12 it must be the day (day-first, MX/EU);
  //  - if the second field > 12 it must be the day (month-first, US, e.g. 02/15/16);
  //  - otherwise default to day-first (the app's MX/EU convention).
  // Any combination that isn't a valid calendar date returns null (so callers
  // show an empty, editable field instead of a bogus "NaN/NaN/NaN").
  const local = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(value);
  if (!local) return value;
  const a = Number(local[1]); const b = Number(local[2]); const rawYear = local[3]!;
  let day: number; let month: number;
  if (a > 12 && b <= 12) { day = a; month = b; }
  else if (b > 12 && a <= 12) { month = a; day = b; }
  else { day = a; month = b; } // ambiguous → day-first
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return toIso(rawYear, month, String(day));
}
function decodeXml(value: string): string { return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }

export function parseCfdi(xml: string): ParsedReceipt {
  const comprobante = /<cfdi:Comprobante\b([^>]*)>/i.exec(xml)?.[1] ?? '';
  const emisor = /<cfdi:Emisor\b([^>]*)>/i.exec(xml)?.[1] ?? '';
  const total = firstMatch(comprobante, [/\bTotal="([^"]+)"/i]);
  const subtotal = firstMatch(comprobante, [/\bSubTotal="([^"]+)"/i]);
  const currency = firstMatch(comprobante, [/\bMoneda="([^"]+)"/i]) || 'MXN';
  const date = firstMatch(comprobante, [/\bFecha="([^"]+)"/i]);
  const uuid = firstMatch(xml, [/<tfd:TimbreFiscalDigital\b[^>]*\bUUID="([^"]+)"/i]);
  const issuerRfc = firstMatch(emisor, [/\bRfc="([^"]+)"/i]);
  const issuerName = firstMatch(emisor, [/\bNombre="([^"]+)"/i]);

  // IVA / trasladados: prefer the document-level <cfdi:Impuestos TotalImpuestosTrasladados>,
  // else sum each <cfdi:Traslado Importe="..."> (concepto- and doc-level), else
  // fall back to total − subtotal. All parsed with numberValue.
  const totalNum = numberValue(total);
  const subtotalNum = numberValue(subtotal);
  let taxNum: number | null = null;
  const impuestos = /<cfdi:Impuestos\b([^>]*)>/i.exec(xml)?.[1] ?? '';
  const totalTrasladados = firstMatch(impuestos, [/\bTotalImpuestosTrasladados="([^"]+)"/i]);
  if (totalTrasladados) {
    taxNum = numberValue(totalTrasladados);
  } else {
    const trasladoRegex = /<cfdi:Traslado\b([^>]*)\/?>/gi;
    let tMatch: RegExpExecArray | null;
    let sum = 0;
    let found = false;
    while ((tMatch = trasladoRegex.exec(xml))) {
      const importe = numberValue(firstMatch(tMatch[1] ?? '', [/\bImporte="([^"]+)"/i]));
      if (importe != null) { sum += importe; found = true; }
    }
    if (found) taxNum = Math.round(sum * 100) / 100;
  }
  if (taxNum == null && totalNum != null && subtotalNum != null && totalNum > subtotalNum) {
    taxNum = Math.round((totalNum - subtotalNum) * 100) / 100;
  }
  const items: ParsedReceipt['items'] = [];
  const conceptRegex = /<cfdi:Concepto\b([^>]*)\/?>(?:.*?<\/cfdi:Concepto>)?/gis;
  let match: RegExpExecArray | null;
  while ((match = conceptRegex.exec(xml))) {
    const attrs = match[1];
    if (!attrs) continue;
    const description = firstMatch(attrs, [/\bDescripcion="([^"]+)"/i]);
    if (!description) continue;
    items.push({ description: decodeXml(description), quantity: numberValue(firstMatch(attrs, [/\bCantidad="([^"]+)"/i])), unitPrice: numberValue(firstMatch(attrs, [/\bValorUnitario="([^"]+)"/i])), total: numberValue(firstMatch(attrs, [/\bImporte="([^"]+)"/i])), categoryId: null });
  }
  return { merchant: issuerName ? decodeXml(issuerName) : null, receiptDate: parseDate(date), subtotal: subtotalNum, tax: taxNum, total: totalNum, currency: decodeXml(currency), documentType: 'cfdi', sourceType: 'cfdi_xml', confidence: 1, rawText: xml, uuid, issuerRfc, issuerName: issuerName ? decodeXml(issuerName) : null, items };
}

// A "money-looking" token after normalization: optional currency prefix and a
// number with a decimal or thousands separator ("125.00", "1,234.56"), or a
// bare integer of 2+ digits. Ordered so the richer decimal form wins first.
const MONEY_TOKEN = /(?:MX\$|US\$|\$|€)?\s*\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b|(?:MX\$|US\$|\$|€)?\s*\d+[.,]\d{2}\b|(?:MX\$|US\$|\$|€)?\s*\d{2,}\b/g;

/**
 * Repairs the OCR habit of dropping/spacing decimal points in amounts. Real
 * OCR output for this app looks like "SUB TOTAL 125 00" (meant 125.00) and
 * "IMPUESTOS 475" — the cents got split off or lost. On a single line we join a
 * trailing "<digits> <2 digits>" pair into "<digits>.<2 digits>" so the cents
 * are recovered before token extraction. We only touch the amount region (after
 * the label text) to avoid mangling things like a "123 45" street number in the
 * label itself. Returns the line with decimals normalized.
 */
function repairSpacedDecimals(amountRegion: string): string {
  // "125 00" -> "125.00", "1 234 56" -> "1 234.56" (last space before 2 digits).
  return amountRegion.replace(/(\d)\s+(\d{2})\b/g, '$1.$2');
}

/**
 * Extracts an amount from the line that contains a label. Invoice layouts put
 * the value in a far right-aligned column on the same row as its label, often
 * with decoy numbers in between (rates, quantities). Strategy:
 *   1. Find the first line matching any label pattern.
 *   2. Take only the text AFTER the label match (the value column region).
 *   3. Drop parenthesised groups like "(3.8 %)" so rates can't be picked.
 *   4. Repair OCR-spaced decimals ("125 00" -> "125.00").
 *   5. Take the LAST money-looking token in that region (the right column).
 * Falls back to null when no money token is present.
 */
function amountOnLabelLine(text: string, labels: RegExp[]): string | null {
  const lines = text.split(/\r?\n/);
  for (const label of labels) {
    for (const line of lines) {
      const m = label.exec(line);
      if (!m) continue;
      // Region after the matched label — where the value column lives.
      const region = line.slice((m.index ?? 0) + m[0].length);
      const cleaned = repairSpacedDecimals(region.replace(/\([^)]*\)/g, ' ')); // strip "(3.8 %)" then fix decimals
      const tokens = cleaned.match(MONEY_TOKEN);
      if (tokens && tokens.length > 0) return tokens[tokens.length - 1]!.trim();
    }
  }
  return null;
}

/**
 * Scans the text for date-shaped substrings (using the given global patterns)
 * and returns the first one that parseDate can normalize to a valid ISO
 * `YYYY-MM-DD`. Returns null if none is parseable — better an empty, editable
 * date than a bogus value scraped from an unrelated line.
 */
function firstParsableDate(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (!matches) continue;
    for (const candidate of matches) {
      const parsed = parseDate(candidate);
      if (parsed && /^\d{4}-\d{2}-\d{2}$/.test(parsed)) return parsed;
    }
  }
  return null;
}

export function parsePlainText(text: string, sourceType: ReceiptSourceType): ParsedReceipt {
  // Match TOTAL but not:
  //  - the "TOTAL" inside "SUBTOTAL" (require a non-letter or line start before it), or
  //  - item-count lines like "TOTAL ARTICULOS: 3" / "TOTAL DE PIEZAS 5" (a plain
  //    "TOTAL" must NOT be followed by a count noun before the number).
  // Amount extraction is LINE-scoped: on invoices the label ("TOTAL") and its
  // value sit on the same row but in a far right-aligned column, with decoy
  // numbers in between (e.g. "IMPUESTOS (3.8 %)  4.75" — the 3.8 is a rate, 4.75
  // is the amount). So we find the label's line and take the LAST money-looking
  // token on it, ignoring parenthesised rates like "(3.8 %)". amountOnLabelLine
  // returns that token (or null). `avoidCountNoun`/lookahead concerns are kept
  // via the label regexes below.
  const totalText = amountOnLabelLine(text, [
    /(?:TOTAL\s+A\s+PAGAR|IMPORTE\s+TOTAL|GRAN\s+TOTAL|GRAND\s+TOTAL|TOTAL\s+DUE|AMOUNT\s+DUE|BALANCE\s+DUE)/i,
    // Plain TOTAL that is NOT "SUBTOTAL"/"SUB TOTAL" (OCR often splits it) and
    // not an item-count line. Require the start of line or a non-letter that is
    // not the "B" of SUB right before it.
    /(?:^|(?<![A-Za-z])(?<!SUB\s))TOTAL(?!\s*(?:ART[IÍ]CULOS|ITEMS|PIEZAS|PRODUCTOS|QTY|QUANTITY|DE\s+ART[IÍ]CULOS|DE\s+PIEZAS))/i,
  ]);
  const subtotalText = amountOnLabelLine(text, [/SUB[\s-]?TOTAL/i]);
  // Tax: ES "IVA"/"I.V.A."/"impuesto(s)"; EN "TAX"/"VAT"/"GST"/"sales tax".
  const taxText = amountOnLabelLine(text, [/IVA|I\.V\.A\.|IMPUESTOS?|SALES\s+TAX|VAT|GST|TAX/i]);
  // Date: try a labeled "Date:"/"Fecha:" line first (highest signal), then any
  // numeric or textual (EN/ES month-name) date anywhere in the text. We collect
  // every candidate and keep the FIRST one that parseDate can turn into a valid
  // ISO date — so garbage like "46 Próximas 37 días" (a client-id/terms line
  // that happens to fit a loose pattern) is rejected rather than shown raw.
  const receiptDate = firstParsableDate(text, [
    /\d{4}-\d{2}-\d{2}/g,
    /\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/g,
    /\d{1,2}\s+(?:de\s+)?[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,}\.?\s*(?:de\s+|,\s*)?\d{2,4}/g,
    /[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,}\.?\s+\d{1,2}(?:\s*,|\s+de)?\s*\d{2,4}/g,
  ]);
  // Mexican RFC (tax id): 3-4 letters + 6 date digits + 3 alphanumeric homoclave.
  // Persons use 4 leading letters, companies 3. Match on a word boundary.
  const issuerRfc = firstMatch(text, [
    /\bRFC\s*[:.]?\s*([A-ZÑ&]{3,4}\d{6}[A-Z\d]{3})\b/i,
    /\b([A-ZÑ&]{3,4}\d{6}[A-Z\d]{3})\b/,
  ]);
  // CFDI fiscal folio (UUID), sometimes labeled "Folio Fiscal".
  const uuid = firstMatch(text, [/\b([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})\b/i]);
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  // Merchant: the first "name-like" line. Skip document titles/labels
  // ("FACTURA", "INVOICE", "PLANTILLA…"), blank-template placeholders
  // ("Nombre de la empresa", "Your Logo", "Calle…", "Dirección…"), and lines
  // that are mostly non-letters (addresses, phone numbers, code columns). This
  // reduces picking a heading or placeholder as the store name.
  // Reject a line if it CONTAINS any document label/keyword (anywhere, not just
  // at the start) — OCR often merges a header row like "... N.° DE FACTURA FECHA".
  const LABEL_ANY = /\b(total|subtotal|iva|tax|vat|fecha|date|ticket|factura|invoice|receipt|plantilla|descripci|monto|cliente|client|condiciones|gracias)\b/i;
  const PLACEHOLDER = /^(your\s+logo|logo|nombre\s+de\s+la\s+empresa|nombre\s+de\s+la\s+compa|company\s+name|your\s+company|calle\b|street\b|direcci[oó]n|address|tel[eé]fono|phone|a\s*[\/.]\s*a\b|a\s+a\b|attn\b|facturar\s+a|enviar\s+a|bill\s+to|ship\s+to)/i;
  const merchant = lines.map(line => line.replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+/, '').trim()) // strip leading junk like "» "
    .find(line => {
      if (line.length < 3 || line.length > 80) return false;
      if (LABEL_ANY.test(line) || PLACEHOLDER.test(line)) return false;
      // Reject lines with digits (addresses, phones, code rows).
      if (/\d/.test(line)) return false;
      // Reject OCR-garble: require a high ratio of letters+spaces and few stray
      // symbols like ] * = ~ that mark misrecognized regions.
      const letters = (line.match(/[A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g) ?? []).length;
      const junk = (line.match(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s.,&'-]/g) ?? []).length;
      return letters >= Math.ceil(line.length * 0.75) && junk === 0;
    }) ?? null;
  // Currency: default MXN, but recognize an explicit US$ / plain-$ (USD) or € (EUR) hint.
  const currency = /\bUS\$|\bUSD\b/i.test(text) ? 'USD' : /€|\bEUR\b/i.test(text) ? 'EUR' : 'MXN';

  // Amounts are read at face value. We deliberately do NOT "recover cents" by
  // dividing separator-less integers by 100: a bare "755" is genuinely
  // ambiguous (could be $755 or an OCR-mangled $7.55), and a real whole-dollar
  // total like $755 is far more common than a lost-decimal one. Dividing a
  // correct total by 100 is a silent, hard-to-notice error, whereas an OCR that
  // truly dropped a decimal is easy for the user to fix in the editable field.
  // So we prefer the literal reading and let the user correct the rare miss.
  const assumeCents = false;
  const subtotal = moneyValue(subtotalText, assumeCents);
  let tax = moneyValue(taxText, assumeCents);
  const total = moneyValue(totalText, assumeCents);
  // receiptDate is computed above via firstParsableDate.

  // OCR sometimes drops the decimal point in the tax amount with no space to
  // repair (e.g. "IMPUESTOS (3.8 %) 4.75" read as "475"). Tax is normally a
  // small fraction of the subtotal, so a separator-less integer tax that is
  // *larger* than the subtotal is almost certainly a lost decimal — divide by
  // 100. Guarded tightly (no separator in the raw token, tax > subtotal > 0) to
  // avoid touching legitimate values.
  if (
    tax !== null && subtotal !== null && subtotal > 0 &&
    taxText !== null && !/[.,]/.test(taxText) &&
    Number.isInteger(tax) && tax > subtotal
  ) {
    tax = tax / 100;
  }

  // Confidence reflects how much we actually extracted. Start from a per-source
  // base (OCR text is noisier than embedded PDF text), require a TOTAL to clear
  // the floor, and nudge up for each additional recovered field (date, tax,
  // subtotal, tax id). Capped so OCR never claims CFDI-level certainty.
  const base = sourceType === 'ocr' ? 0.4 : 0.55;
  const cap = sourceType === 'ocr' ? 0.85 : 0.9;
  let confidence = 0.2;
  if (total !== null) {
    confidence = base;
    // A date that actually normalized to ISO (not the raw unparsed string).
    if (receiptDate && /^\d{4}-\d{2}-\d{2}$/.test(receiptDate)) confidence += 0.15;
    if (subtotal !== null) confidence += 0.1;
    if (tax !== null) confidence += 0.1;
    if (issuerRfc) confidence += 0.05;
    confidence = Math.min(confidence, cap);
  }
  confidence = Math.round(confidence * 100) / 100;

  return { merchant, receiptDate, subtotal, tax, total, currency, documentType: /factura|cfdi|invoice/i.test(text) ? 'invoice' : 'receipt', sourceType, confidence, rawText: text, uuid, issuerRfc, issuerName: null, items: [] };
}
function extractPdfText(filePath: string): string | null {
  try { return execFileSync('pdftotext', ['-layout', filePath, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
}

/**
 * Runs OCR on an image file with tesseract.js (Spanish + English).
 * Returns the recognized text, or throws if recognition fails.
 */
/**
 * Preprocesses a receipt/invoice image to improve OCR accuracy: Tesseract works
 * best on high-contrast, ~300 DPI, binarized input. We upscale small images,
 * convert to grayscale, normalize contrast, sharpen, and threshold to black &
 * white. Returns a Buffer, or null if preprocessing isn't possible (caller then
 * falls back to the original file so OCR still runs).
 */
async function preprocessForOcr(filePath: string): Promise<Buffer | null> {
  try {
    const { default: sharp } = await import('sharp');
    const image = sharp(filePath, { failOn: 'none' }).rotate(); // auto-orient via EXIF
    const meta = await image.metadata();
    // Upscale so the smaller side is ~1600px (helps small phone photos hit the
    // resolution Tesseract likes); never downscale, and cap to avoid huge work.
    const minSide = Math.min(meta.width ?? 0, meta.height ?? 0);
    let pipeline = image.grayscale().normalize();
    if (minSide > 0 && minSide < 1600) {
      const scale = Math.min(1600 / minSide, 3);
      pipeline = pipeline.resize({
        width: Math.round((meta.width ?? 0) * scale),
        height: Math.round((meta.height ?? 0) * scale),
        fit: 'fill',
      });
    }
    return await pipeline
      .sharpen()
      .threshold(140) // binarize: pixels below → black, above → white
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

/**
 * Runs OCR on an image file with tesseract.js (Spanish + English) after image
 * preprocessing, using a page-segmentation mode suited to receipts/invoices.
 * Returns the recognized text (throws are handled by the caller).
 */
async function ocrImage(filePath: string): Promise<string> {
  // tesseract.js v6 is CommonJS and exposes a worker-based API. When imported
  // from ESM its exports live under `.default`.
  const tesseractModule = await import('tesseract.js');
  const mod = tesseractModule as unknown as {
    default?: { createWorker: typeof import('tesseract.js').createWorker; PSM?: Record<string, string> };
    createWorker?: typeof import('tesseract.js').createWorker;
    PSM?: Record<string, string>;
  };
  const createWorker = mod.default?.createWorker ?? mod.createWorker!;
  // PSM 4 = "assume a single column of text of variable sizes", a good fit for
  // the stacked line layout of receipts/invoices. Fall back to the literal '4'.
  const psmSingleColumn = mod.default?.PSM?.SINGLE_COLUMN ?? mod.PSM?.SINGLE_COLUMN ?? '4';

  const worker = await createWorker('spa+eng');
  try {
    await worker.setParameters({ tessedit_pageseg_mode: psmSingleColumn as never });
    // Prefer the preprocessed buffer; fall back to the raw file path if sharp
    // couldn't process the image for any reason.
    const input = (await preprocessForOcr(filePath)) ?? filePath;
    const { data } = await worker.recognize(input);
    return data.text ?? '';
  } finally {
    await worker.terminate();
  }
}

export class ReceiptService {
  private static readonly SELECT_WITH_JOINS = `
    SELECT ra.*, att.original_name AS att_original_name, att.mime_type AS att_mime_type,
           tx.name AS tx_name, tx.amount AS tx_amount
    FROM receipt_analyses ra
    LEFT JOIN attachments att ON att.id = ra.attachment_id
    LEFT JOIN transactions tx ON tx.id = ra.transaction_id
  `;
  static list(userId: number): ReceiptAnalysis[] { ensureTables(); return (getSqlite().prepare(`${this.SELECT_WITH_JOINS} WHERE ra.user_id = ? ORDER BY ra.created_at DESC`).all(userId) as Record<string, unknown>[]).map(row => this.hydrate(row)); }
  static get(id: number, userId: number): ReceiptAnalysis | null { ensureTables(); const row = getSqlite().prepare(`${this.SELECT_WITH_JOINS} WHERE ra.id = ? AND ra.user_id = ?`).get(id, userId) as Record<string, unknown> | undefined; return row ? this.hydrate(row) : null; }

  /** Fields a user may edit manually to correct or complete OCR output. */
  static update(id: number, userId: number, fields: Partial<Pick<ReceiptAnalysis, 'merchant' | 'receiptDate' | 'subtotal' | 'tax' | 'total' | 'currency' | 'uuid' | 'issuerRfc'>>): ReceiptAnalysis | null {
    ensureTables();
    const sqlite = getSqlite();
    const existing = sqlite.prepare('SELECT id FROM receipt_analyses WHERE id = ? AND user_id = ?').get(id, userId) as { id: number } | undefined;
    if (!existing) return null;
    const sets: string[] = [];
    const values: unknown[] = [];
    const map: Record<string, string> = { merchant: 'merchant', receiptDate: 'receipt_date', subtotal: 'subtotal', tax: 'tax', total: 'total', currency: 'currency', uuid: 'uuid', issuerRfc: 'issuer_rfc' };
    for (const [key, column] of Object.entries(map)) {
      if (key in fields) { sets.push(`${column} = ?`); values.push((fields as Record<string, unknown>)[key] ?? null); }
    }
    if (sets.length > 0) {
      values.push(new Date().toISOString(), id, userId);
      sqlite.prepare(`UPDATE receipt_analyses SET ${sets.join(', ')}, updated_at = ? WHERE id = ? AND user_id = ?`).run(...values);
    }
    return this.get(id, userId);
  }
  /**
   * P4.6: assign (or clear) the category of a single receipt line item, for
   * item-level categorization. Validates that the item belongs to a receipt
   * owned by the user.
   */
  static setItemCategory(receiptId: number, itemId: number, userId: number, categoryId: number | null): ReceiptAnalysis | null {
    ensureTables();
    const sqlite = getSqlite();
    const analysis = sqlite.prepare('SELECT id FROM receipt_analyses WHERE id = ? AND user_id = ?').get(receiptId, userId) as { id: number } | undefined;
    if (!analysis) return null;
    const item = sqlite.prepare('SELECT id FROM receipt_items WHERE id = ? AND analysis_id = ?').get(itemId, receiptId) as { id: number } | undefined;
    if (!item) return null;
    sqlite.prepare('UPDATE receipt_items SET category_id = ? WHERE id = ?').run(categoryId, itemId);
    sqlite.prepare('UPDATE receipt_analyses SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), receiptId);
    return this.get(receiptId, userId);
  }

  /**
   * P4.6: create a transaction from a completed receipt/CFDI and link them.
   * The transaction is an expense with name = merchant, amount = total,
   * date = the receipt date (or now), merchant, and externalId = UUID (so a
   * re-imported/duplicate CFDI is caught by the P4.1 dedupe). If ≥2 items are
   * categorized and their totals sum to the receipt total, the transaction is
   * also split by those categories (item-level categorization → splits).
   *
   * @throws Error on: receipt not found, no total, or already linked.
   */
  static createTransaction(
    receiptId: number,
    userId: number,
    options: { accountId: number; categoryId: number; date?: string },
  ): ReceiptAnalysis {
    ensureTables();
    const sqlite = getSqlite();
    const receipt = this.get(receiptId, userId);
    if (!receipt) throw new Error('Análisis no encontrado');
    if (receipt.transactionId) throw new Error('Este comprobante ya tiene una transacción asociada');
    if (receipt.total == null || receipt.total <= 0) throw new Error('El comprobante no tiene un total válido; corrige el total antes de crear la transacción');

    const name = (receipt.merchant || receipt.issuerName || 'Comprobante').substring(0, 100);
    const date = options.date ?? (receipt.receiptDate ? `${receipt.receiptDate}T12:00:00.000Z` : new Date().toISOString());
    const amount = Math.round(receipt.total * 100) / 100;

    const tx = TransactionService.create(userId, {
      name,
      accountId: options.accountId,
      categoryId: options.categoryId,
      amount,
      type: TransactionType.Gasto,
      date,
      merchant: receipt.merchant ?? receipt.issuerName ?? null,
      externalId: receipt.uuid ?? null,
    });

    // Item-level categorization → splits (best-effort). Only when at least two
    // items carry a category and their totals add up to the receipt total.
    const categorized = receipt.items.filter((i) => i.categoryId != null && i.total != null && i.total > 0);
    if (categorized.length >= 2) {
      const sum = Math.round(categorized.reduce((s, i) => s + (i.total ?? 0), 0) * 100) / 100;
      if (sum === amount) {
        try {
          TransactionService.split(
            tx.id,
            userId,
            categorized.map((i) => ({ categoryId: i.categoryId as number, amount: Math.round((i.total as number) * 100) / 100, note: i.description.substring(0, 200) })),
          );
        } catch {
          // If the split is rejected (rounding / invalid category), keep the
          // single transaction — categorization is a best-effort enhancement.
        }
      }
    }

    sqlite.prepare('UPDATE receipt_analyses SET transaction_id = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(tx.id, new Date().toISOString(), receiptId, userId);
    return this.get(receiptId, userId)!;
  }

  static async analyze(attachmentId: number, userId: number): Promise<ReceiptAnalysis> {
    ensureTables(); const attachment = AttachmentService.getById(attachmentId, userId); if (!attachment) throw new Error('Archivo no encontrado');
    const sqlite = getSqlite(); const existing = sqlite.prepare('SELECT id FROM receipt_analyses WHERE attachment_id = ? AND user_id = ?').get(attachmentId, userId) as { id: number } | undefined;
    const now = new Date().toISOString(); let analysisId = existing?.id;
    if (!analysisId) { const result = sqlite.prepare("INSERT INTO receipt_analyses (attachment_id, user_id, transaction_id, status, created_at, updated_at) VALUES (?, ?, ?, 'processing', ?, ?)").run(attachmentId, userId, attachment.transactionId, now, now); analysisId = Number(result.lastInsertRowid); }
    else { sqlite.prepare("UPDATE receipt_analyses SET status = 'processing', updated_at = ? WHERE id = ? AND user_id = ?").run(now, analysisId, userId); sqlite.prepare('DELETE FROM receipt_items WHERE analysis_id = ?').run(analysisId); }
    try {
      const parsed = await this.parseAttachment(attachment);
      sqlite.prepare("UPDATE receipt_analyses SET merchant = ?, receipt_date = ?, subtotal = ?, tax = ?, total = ?, currency = ?, document_type = ?, source_type = ?, status = 'completed', confidence = ?, raw_text = ?, uuid = ?, issuer_rfc = ?, issuer_name = ?, error = NULL, updated_at = ? WHERE id = ? AND user_id = ?").run(parsed.merchant, parsed.receiptDate, parsed.subtotal, parsed.tax, parsed.total, parsed.currency, parsed.documentType, parsed.sourceType, parsed.confidence, parsed.rawText, parsed.uuid, parsed.issuerRfc, parsed.issuerName, new Date().toISOString(), analysisId, userId);
      const insertItem = sqlite.prepare('INSERT INTO receipt_items (analysis_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)'); for (const item of parsed.items) insertItem.run(analysisId, item.description, item.quantity, item.unitPrice, item.total);
      return this.get(analysisId, userId)!;
    } catch (error) { const message = error instanceof Error ? error.message : 'Error al analizar el archivo'; sqlite.prepare("UPDATE receipt_analyses SET status = 'failed', error = ?, updated_at = ? WHERE id = ? AND user_id = ?").run(message, new Date().toISOString(), analysisId, userId); throw error; }
  }
  private static async parseAttachment(attachment: AttachmentRecord): Promise<ParsedReceipt> {
    const filePath = AttachmentService.getFilePath(attachment);
    if (!fs.existsSync(filePath)) throw new Error('Archivo no encontrado en disco');
    const ext = path.extname(attachment.filename).toLowerCase();

    // CFDI / XML invoices: structured, highest confidence.
    if (attachment.mimeType === 'text/xml' || attachment.mimeType === 'application/xml' || ext === '.xml') {
      return parseCfdi(fs.readFileSync(filePath, 'utf8'));
    }

    // PDF: prefer embedded text (pdftotext); fall back to OCR for scanned PDFs.
    if (attachment.mimeType === 'application/pdf' || ext === '.pdf') {
      const text = extractPdfText(filePath);
      if (text?.trim()) return parsePlainText(text, 'pdf_text');
      throw new Error('No se pudo extraer texto del PDF (¿es un PDF escaneado sin texto?). Sube una imagen del ticket para usar OCR.');
    }

    // Images: run OCR with tesseract.js.
    if (attachment.mimeType.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.bmp'].includes(ext)) {
      const text = await ocrImage(filePath);
      if (!text.trim()) throw new Error('El OCR no reconoció texto en la imagen. Prueba con una foto más nítida y bien iluminada.');
      return parsePlainText(text, 'ocr');
    }

    throw new Error(`Tipo de archivo no soportado para análisis: ${attachment.mimeType || ext}`);
  }
  private static hydrate(row: Record<string, unknown>): ReceiptAnalysis {
    const items = getSqlite().prepare('SELECT id, analysis_id as analysisId, description, quantity, unit_price as unitPrice, total, category_id as categoryId FROM receipt_items WHERE analysis_id = ? ORDER BY id').all(row.id) as ReceiptItem[];
    return { id: Number(row.id), attachmentId: Number(row.attachment_id), userId: Number(row.user_id), transactionId: row.transaction_id == null ? null : Number(row.transaction_id), merchant: row.merchant as string | null, receiptDate: row.receipt_date as string | null, subtotal: row.subtotal == null ? null : Number(row.subtotal), tax: row.tax == null ? null : Number(row.tax), total: row.total == null ? null : Number(row.total), currency: String(row.currency ?? 'MXN'), documentType: String(row.document_type ?? 'unknown') as ReceiptAnalysis['documentType'], sourceType: String(row.source_type ?? 'unknown') as ReceiptSourceType, status: String(row.status ?? 'pending') as ReceiptAnalysis['status'], confidence: Number(row.confidence ?? 0), rawText: row.raw_text as string | null, uuid: row.uuid as string | null, issuerRfc: row.issuer_rfc as string | null, issuerName: row.issuer_name as string | null, error: row.error as string | null, filename: (row.att_original_name as string | null) ?? null, mimeType: String(row.att_mime_type ?? ''), transactionName: (row.tx_name as string | null) ?? null, transactionAmount: row.tx_amount == null ? null : Number(row.tx_amount), createdAt: String(row.created_at), updatedAt: String(row.updated_at), items };
  }
}

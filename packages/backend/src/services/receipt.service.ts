import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { getSqlite } from '../db/connection.js';
import { AttachmentService, type AttachmentRecord } from './attachment.service.js';

export type ReceiptSourceType = 'cfdi_xml' | 'pdf_text' | 'ocr' | 'unknown';

export interface ReceiptItem { id: number; analysisId: number; description: string; quantity: number | null; unitPrice: number | null; total: number | null; }
export interface ReceiptAnalysis {
  id: number; attachmentId: number; userId: number; transactionId: number | null;
  merchant: string | null; receiptDate: string | null; subtotal: number | null; tax: number | null; total: number | null;
  currency: string; documentType: 'receipt' | 'invoice' | 'cfdi' | 'unknown'; sourceType: ReceiptSourceType;
  status: 'pending' | 'processing' | 'completed' | 'failed'; confidence: number; rawText: string | null;
  uuid: string | null; issuerRfc: string | null; issuerName: string | null; error: string | null;
  filename: string | null; mimeType: string; transactionName: string | null; transactionAmount: number | null;
  createdAt: string; updatedAt: string; items: ReceiptItem[];
}
interface ParsedReceipt extends Omit<ReceiptAnalysis, 'id' | 'attachmentId' | 'userId' | 'transactionId' | 'status' | 'error' | 'filename' | 'mimeType' | 'transactionName' | 'transactionAmount' | 'createdAt' | 'updatedAt' | 'items'> { items: Omit<ReceiptItem, 'id' | 'analysisId'>[]; }

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
      description TEXT NOT NULL, quantity REAL, unit_price REAL, total REAL
    );
    CREATE INDEX IF NOT EXISTS receipt_items_analysis_id_idx ON receipt_items(analysis_id);
  `);
  // Additive migrations for tables created before these columns existed.
  const columns = (getSqlite().prepare('PRAGMA table_info(receipt_analyses)').all() as { name: string }[]).map(c => c.name);
  if (!columns.includes('source_type')) getSqlite().exec("ALTER TABLE receipt_analyses ADD COLUMN source_type TEXT NOT NULL DEFAULT 'unknown'");
  if (!columns.includes('error')) getSqlite().exec('ALTER TABLE receipt_analyses ADD COLUMN error TEXT');
}

function numberValue(value: string | null | undefined): number | null {
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
function moneyValue(value: string | null | undefined, assumeCents: boolean): number | null {
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
function ocrDroppedDecimals(text: string): boolean {
  const amountTokens = text.match(/\d[\d.,]*\d|\d/g) ?? [];
  const moneyish = amountTokens.filter(t => /\d{3,}/.test(t.replace(/[.,]/g, '')));
  if (moneyish.length === 0) return false;
  // If none of the sizable numbers has a decimal separator, decimals were likely lost.
  return moneyish.every(t => !/[.,]\d{1,2}$/.test(t));
}
function parseDate(value: string | null): string | null {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value); if (iso) return iso[0];
  const local = /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/.exec(value); if (!local) return value;
  const day = local[1]; const month = local[2]; const rawYear = local[3];
  if (!day || !month || !rawYear) return value;
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
function decodeXml(value: string): string { return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }

function parseCfdi(xml: string): ParsedReceipt {
  const comprobante = /<cfdi:Comprobante\b([^>]*)>/i.exec(xml)?.[1] ?? '';
  const emisor = /<cfdi:Emisor\b([^>]*)>/i.exec(xml)?.[1] ?? '';
  const total = firstMatch(comprobante, [/\bTotal="([^"]+)"/i]);
  const subtotal = firstMatch(comprobante, [/\bSubTotal="([^"]+)"/i]);
  const currency = firstMatch(comprobante, [/\bMoneda="([^"]+)"/i]) || 'MXN';
  const date = firstMatch(comprobante, [/\bFecha="([^"]+)"/i]);
  const uuid = firstMatch(xml, [/<tfd:TimbreFiscalDigital\b[^>]*\bUUID="([^"]+)"/i]);
  const issuerRfc = firstMatch(emisor, [/\bRfc="([^"]+)"/i]);
  const issuerName = firstMatch(emisor, [/\bNombre="([^"]+)"/i]);
  const items: ParsedReceipt['items'] = [];
  const conceptRegex = /<cfdi:Concepto\b([^>]*)\/?>(?:.*?<\/cfdi:Concepto>)?/gis;
  let match: RegExpExecArray | null;
  while ((match = conceptRegex.exec(xml))) {
    const attrs = match[1];
    if (!attrs) continue;
    const description = firstMatch(attrs, [/\bDescripcion="([^"]+)"/i]);
    if (!description) continue;
    items.push({ description: decodeXml(description), quantity: numberValue(firstMatch(attrs, [/\bCantidad="([^"]+)"/i])), unitPrice: numberValue(firstMatch(attrs, [/\bValorUnitario="([^"]+)"/i])), total: numberValue(firstMatch(attrs, [/\bImporte="([^"]+)"/i])) });
  }
  return { merchant: issuerName ? decodeXml(issuerName) : null, receiptDate: parseDate(date), subtotal: numberValue(subtotal), tax: null, total: numberValue(total), currency: decodeXml(currency), documentType: 'cfdi', sourceType: 'cfdi_xml', confidence: 1, rawText: xml, uuid, issuerRfc, issuerName: issuerName ? decodeXml(issuerName) : null, items };
}

function parsePlainText(text: string, sourceType: ReceiptSourceType): ParsedReceipt {
  // Match TOTAL but not the "TOTAL" inside "SUBTOTAL": require a non-letter
  // (or start of line) right before TOTAL. Prefer "TOTAL A PAGAR"/"IMPORTE TOTAL".
  const totalText = firstMatch(text, [/(?:^|[^A-ZÁÉÍÓÚa-záéíóú])(?:TOTAL\s+A\s+PAGAR|IMPORTE\s+TOTAL|TOTAL)[^\d]{0,20}(\$?\s*[\d,]+(?:\.\d{2})?)/im]);
  const subtotalText = firstMatch(text, [/SUBTOTAL[^\d]{0,20}(\$?\s*[\d,]+(?:\.\d{2})?)/i]);
  const taxText = firstMatch(text, [/(?:IVA|I\.V\.A\.)[^\d]{0,20}(\$?\s*[\d,]+(?:\.\d{2})?)/i]);
  const dateText = firstMatch(text, [/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/, /(\d{4}-\d{2}-\d{2})/]);
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const merchant = lines.find(line => line.length >= 3 && line.length <= 80 && !/^(total|subtotal|iva|fecha|ticket|factura)/i.test(line)) ?? null;
  // OCR often drops the decimal point ("114.75" -> "11475"). When we detect that
  // amounts lost their separators, interpret trailing 2 digits as cents.
  const assumeCents = sourceType === 'ocr' && ocrDroppedDecimals(text);
  // OCR text is noisier, so lower the confidence ceiling for that source.
  const baseConfidence = sourceType === 'ocr' ? 0.5 : 0.65;
  return { merchant, receiptDate: parseDate(dateText), subtotal: moneyValue(subtotalText, assumeCents), tax: moneyValue(taxText, assumeCents), total: moneyValue(totalText, assumeCents), currency: 'MXN', documentType: /factura|cfdi/i.test(text) ? 'invoice' : 'receipt', sourceType, confidence: totalText ? baseConfidence : 0.2, rawText: text, uuid: null, issuerRfc: null, issuerName: null, items: [] };
}
function extractPdfText(filePath: string): string | null {
  try { return execFileSync('pdftotext', ['-layout', filePath, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
}

/**
 * Runs OCR on an image file with tesseract.js (Spanish + English).
 * Returns the recognized text, or throws if recognition fails.
 */
async function ocrImage(filePath: string): Promise<string> {
  // tesseract.js v6 is CommonJS and exposes a worker-based API. When imported
  // from ESM its exports live under `.default`.
  const tesseractModule = await import('tesseract.js');
  const createWorker = (tesseractModule as unknown as { default?: { createWorker: typeof import('tesseract.js').createWorker }; createWorker?: typeof import('tesseract.js').createWorker }).default?.createWorker
    ?? (tesseractModule as unknown as { createWorker: typeof import('tesseract.js').createWorker }).createWorker;
  const worker = await createWorker('spa+eng');
  try {
    const { data } = await worker.recognize(filePath);
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
    const items = getSqlite().prepare('SELECT id, analysis_id as analysisId, description, quantity, unit_price as unitPrice, total FROM receipt_items WHERE analysis_id = ? ORDER BY id').all(row.id) as ReceiptItem[];
    return { id: Number(row.id), attachmentId: Number(row.attachment_id), userId: Number(row.user_id), transactionId: row.transaction_id == null ? null : Number(row.transaction_id), merchant: row.merchant as string | null, receiptDate: row.receipt_date as string | null, subtotal: row.subtotal == null ? null : Number(row.subtotal), tax: row.tax == null ? null : Number(row.tax), total: row.total == null ? null : Number(row.total), currency: String(row.currency ?? 'MXN'), documentType: String(row.document_type ?? 'unknown') as ReceiptAnalysis['documentType'], sourceType: String(row.source_type ?? 'unknown') as ReceiptSourceType, status: String(row.status ?? 'pending') as ReceiptAnalysis['status'], confidence: Number(row.confidence ?? 0), rawText: row.raw_text as string | null, uuid: row.uuid as string | null, issuerRfc: row.issuer_rfc as string | null, issuerName: row.issuer_name as string | null, error: row.error as string | null, filename: (row.att_original_name as string | null) ?? null, mimeType: String(row.att_mime_type ?? ''), transactionName: (row.tx_name as string | null) ?? null, transactionAmount: row.tx_amount == null ? null : Number(row.tx_amount), createdAt: String(row.created_at), updatedAt: String(row.updated_at), items };
  }
}

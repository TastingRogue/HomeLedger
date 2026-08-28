import * as fs from 'node:fs';
import * as path from 'node:path';
import { getSqlite } from '../db/connection.js';
import { AttachmentService, type AttachmentRecord } from './attachment.service.js';

export interface ReceiptItem {
  id: number;
  analysisId: number;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
}

export interface ReceiptAnalysis {
  id: number;
  attachmentId: number;
  userId: number;
  transactionId: number | null;
  merchant: string | null;
  receiptDate: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string;
  documentType: 'receipt' | 'invoice' | 'cfdi' | 'unknown';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  confidence: number;
  rawText: string | null;
  uuid: string | null;
  issuerRfc: string | null;
  issuerName: string | null;
  createdAt: string;
  updatedAt: string;
  items: ReceiptItem[];
}

interface ParsedReceipt {
  merchant: string | null;
  receiptDate: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string;
  documentType: ReceiptAnalysis['documentType'];
  confidence: number;
  rawText: string | null;
  uuid: string | null;
  issuerRfc: string | null;
  issuerName: string | null;
  items: Omit<ReceiptItem, 'id' | 'analysisId'>[];
}

function ensureTables(): void {
  const sqlite = getSqlite();
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS receipt_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attachment_id INTEGER NOT NULL UNIQUE REFERENCES attachments(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      transaction_id INTEGER,
      merchant TEXT,
      receipt_date TEXT,
      subtotal REAL,
      tax REAL,
      total REAL,
      currency TEXT NOT NULL DEFAULT 'MXN',
      document_type TEXT NOT NULL DEFAULT 'unknown',
      status TEXT NOT NULL DEFAULT 'pending',
      confidence REAL NOT NULL DEFAULT 0,
      raw_text TEXT,
      uuid TEXT,
      issuer_rfc TEXT,
      issuer_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS receipt_analyses_user_id_idx ON receipt_analyses(user_id);
    CREATE INDEX IF NOT EXISTS receipt_analyses_transaction_id_idx ON receipt_analyses(transaction_id);
    CREATE TABLE IF NOT EXISTS receipt_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id INTEGER NOT NULL REFERENCES receipt_analyses(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL,
      unit_price REAL,
      total REAL
    );
    CREATE INDEX IF NOT EXISTS receipt_items_analysis_id_idx ON receipt_items(analysis_id);
  `);
}

function numberValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(/[$,\s]/g, '').replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function parseDate(value: string | null): string | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const local = value.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (!local) return value;
  const year = local[3].length === 2 ? `20${local[3]}` : local[3];
  return `${year}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}`;
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

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
    const description = firstMatch(attrs, [/\bDescripcion="([^"]+)"/i]);
    if (!description) continue;
    items.push({
      description: decodeXml(description),
      quantity: numberValue(firstMatch(attrs, [/\bCantidad="([^"]+)"/i])),
      unitPrice: numberValue(firstMatch(attrs, [/\bValorUnitario="([^"]+)"/i])),
      total: numberValue(firstMatch(attrs, [/\bImporte="([^"]+)"/i])),
    });
  }

  return {
    merchant: issuerName ? decodeXml(issuerName) : null,
    receiptDate: parseDate(date),
    subtotal: numberValue(subtotal),
    tax: null,
    total: numberValue(total),
    currency: decodeXml(currency),
    documentType: 'cfdi',
    confidence: 1,
    rawText: xml,
    uuid,
    issuerRfc,
    issuerName: issuerName ? decodeXml(issuerName) : null,
    items,
  };
}

function parsePlainText(text: string): ParsedReceipt {
  const totalText = firstMatch(text, [
    /(?:TOTAL(?:\s+A\s+PAGAR)?|IMPORTE\s+TOTAL)[^\d]{0,20}(\$?\s*[\d,]+(?:\.\d{2})?)/i,
  ]);
  const subtotalText = firstMatch(text, [
    /SUBTOTAL[^\d]{0,20}(\$?\s*[\d,]+(?:\.\d{2})?)/i,
  ]);
  const taxText = firstMatch(text, [
    /(?:IVA|I\.V\.A\.)[^\d]{0,20}(\$?\s*[\d,]+(?:\.\d{2})?)/i,
  ]);
  const dateText = firstMatch(text, [
    /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,
    /(\d{4}-\d{2}-\d{2})/,
  ]);
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const merchant = lines.find(line => line.length >= 3 && line.length <= 80 && !/^(total|subtotal|iva|fecha|ticket|factura)/i.test(line)) ?? null;

  return {
    merchant,
    receiptDate: parseDate(dateText),
    subtotal: numberValue(subtotalText),
    tax: numberValue(taxText),
    total: numberValue(totalText),
    currency: 'MXN',
    documentType: /factura|cfdi/i.test(text) ? 'invoice' : 'receipt',
    confidence: totalText ? 0.65 : 0.25,
    rawText: text,
    uuid: null,
    issuerRfc: null,
    issuerName: null,
    items: [],
  };
}

function extractPdfText(filePath: string): string | null {
  // PDF OCR is intentionally optional. If pdftotext is unavailable, callers can
  // still store the attachment and analyze it later with a local OCR engine.
  try {
    const { execFileSync } = require('node:child_process') as typeof import('node:child_process');
    return execFileSync('pdftotext', ['-layout', filePath, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

export class ReceiptService {
  static list(userId: number): ReceiptAnalysis[] {
    ensureTables();
    const rows = getSqlite().prepare(`SELECT * FROM receipt_analyses WHERE user_id = ? ORDER BY created_at DESC`).all(userId) as Record<string, unknown>[];
    return rows.map(row => this.hydrate(row));
  }

  static get(id: number, userId: number): ReceiptAnalysis | null {
    ensureTables();
    const row = getSqlite().prepare(`SELECT * FROM receipt_analyses WHERE id = ? AND user_id = ?`).get(id, userId) as Record<string, unknown> | undefined;
    return row ? this.hydrate(row) : null;
  }

  static async analyze(attachmentId: number, userId: number): Promise<ReceiptAnalysis> {
    ensureTables();
    const attachment = AttachmentService.getById(attachmentId, userId);
    if (!attachment) throw new Error('Archivo no encontrado');

    const sqlite = getSqlite();
    const existing = sqlite.prepare(`SELECT id FROM receipt_analyses WHERE attachment_id = ? AND user_id = ?`).get(attachmentId, userId) as { id: number } | undefined;
    const now = new Date().toISOString();
    let analysisId = existing?.id;
    if (!analysisId) {
      const result = sqlite.prepare(`INSERT INTO receipt_analyses (attachment_id, user_id, transaction_id, status, created_at, updated_at) VALUES (?, ?, ?, 'processing', ?, ?)`).run(attachmentId, userId, attachment.transactionId, now, now);
      analysisId = Number(result.lastInsertRowid);
    } else {
      sqlite.prepare(`UPDATE receipt_analyses SET status = 'processing', updated_at = ? WHERE id = ? AND user_id = ?`).run(now, analysisId, userId);
      sqlite.prepare(`DELETE FROM receipt_items WHERE analysis_id = ?`).run(analysisId);
    }

    try {
      const parsed = this.parseAttachment(attachment);
      sqlite.prepare(`UPDATE receipt_analyses SET merchant = ?, receipt_date = ?, subtotal = ?, tax = ?, total = ?, currency = ?, document_type = ?, status = 'completed', confidence = ?, raw_text = ?, uuid = ?, issuer_rfc = ?, issuer_name = ?, updated_at = ? WHERE id = ? AND user_id = ?`).run(
        parsed.merchant, parsed.receiptDate, parsed.subtotal, parsed.tax, parsed.total, parsed.currency, parsed.documentType, parsed.confidence, parsed.rawText, parsed.uuid, parsed.issuerRfc, parsed.issuerName, new Date().toISOString(), analysisId, userId,
      );
      const insertItem = sqlite.prepare(`INSERT INTO receipt_items (analysis_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)`);
      for (const item of parsed.items) insertItem.run(analysisId, item.description, item.quantity, item.unitPrice, item.total);
      return this.get(analysisId, userId)!;
    } catch (error) {
      sqlite.prepare(`UPDATE receipt_analyses SET status = 'failed', updated_at = ? WHERE id = ? AND user_id = ?`).run(new Date().toISOString(), analysisId, userId);
      throw error;
    }
  }

  private static parseAttachment(attachment: AttachmentRecord): ParsedReceipt {
    const filePath = AttachmentService.getFilePath(attachment);
    if (!fs.existsSync(filePath)) throw new Error('Archivo no encontrado en disco');

    if (attachment.mimeType === 'text/xml' || attachment.mimeType === 'application/xml' || path.extname(attachment.filename).toLowerCase() === '.xml') {
      return parseCfdi(fs.readFileSync(filePath, 'utf8'));
    }

    if (attachment.mimeType === 'application/pdf') {
      const text = extractPdfText(filePath);
      if (text?.trim()) return parsePlainText(text);
      throw new Error('No se pudo extraer texto del PDF. Instala pdftotext o agrega un motor OCR local.');
    }

    throw new Error('El análisis OCR de imágenes requiere un motor OCR local configurado.');
  }

  private static hydrate(row: Record<string, unknown>): ReceiptAnalysis {
    const items = getSqlite().prepare(`SELECT id, analysis_id as analysisId, description, quantity, unit_price as unitPrice, total FROM receipt_items WHERE analysis_id = ? ORDER BY id`).all(row.id) as ReceiptItem[];
    return {
      id: Number(row.id),
      attachmentId: Number(row.attachment_id),
      userId: Number(row.user_id),
      transactionId: row.transaction_id == null ? null : Number(row.transaction_id),
      merchant: row.merchant as string | null,
      receiptDate: row.receipt_date as string | null,
      subtotal: row.subtotal == null ? null : Number(row.subtotal),
      tax: row.tax == null ? null : Number(row.tax),
      total: row.total == null ? null : Number(row.total),
      currency: String(row.currency ?? 'MXN'),
      documentType: String(row.document_type ?? 'unknown') as ReceiptAnalysis['documentType'],
      status: String(row.status ?? 'pending') as ReceiptAnalysis['status'],
      confidence: Number(row.confidence ?? 0),
      rawText: row.raw_text as string | null,
      uuid: row.uuid as string | null,
      issuerRfc: row.issuer_rfc as string | null,
      issuerName: row.issuer_name as string | null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      items,
    };
  }
}

/**
 * Parser for Santander México bank statements.
 * Handles the typical CSV export format from Santander México online banking.
 *
 * Expected CSV columns (common format):
 * Fecha, Descripción, Referencia, Monto, Saldo
 * or
 * Fecha Operación, Fecha Valor, Concepto, Referencia, Importe, Saldo
 */

import type {
  BankParser,
  FieldMapping,
  ParsedTransaction,
  ParseOptions,
} from './base-importer.js';
import { parseCSV } from './base-importer.js';

/** Known header patterns for Santander México files */
const SANTANDER_HEADERS = [
  ['fecha', 'descripción', 'referencia', 'monto', 'saldo'],
  ['fecha', 'descripcion', 'referencia', 'monto', 'saldo'],
  ['fecha operación', 'fecha valor', 'concepto', 'referencia', 'importe', 'saldo'],
  ['fecha operacion', 'fecha valor', 'concepto', 'referencia', 'importe', 'saldo'],
  ['fecha', 'concepto', 'referencia', 'importe', 'saldo'],
];

export class SantanderParser implements BankParser {
  bankId = 'santander_mx';
  bankName = 'Santander México';
  supportedFormats: ('csv' | 'xlsx' | 'ofx')[] = ['csv', 'xlsx'];

  detect(content: Buffer, filename: string): boolean {
    const lowerFilename = filename.toLowerCase();

    // Check filename patterns
    if (lowerFilename.includes('santander')) {
      return true;
    }

    // Check content
    const text = content.subarray(0, Math.min(content.length, 2048)).toString('utf-8').toLowerCase();

    if (text.includes('santander')) {
      return true;
    }

    // Check if headers match known Santander patterns
    const firstLines = text.split('\n').slice(0, 5).map(l => l.trim().toLowerCase());
    for (const line of firstLines) {
      for (const pattern of SANTANDER_HEADERS) {
        if (pattern.every(col => line.includes(col))) {
          return true;
        }
      }
    }

    return false;
  }

  parse(content: Buffer, options?: ParseOptions): ParsedTransaction[] {
    const encoding = options?.encoding ?? 'utf-8';
    const delimiter = options?.delimiter ?? ',';

    const text = content.toString(encoding);
    const rows = parseCSV(text, delimiter);

    if (rows.length < 2) return [];

    // Find header row
    let headerIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i]!;
      const rowLower = row.map(c => c.toLowerCase());
      if (rowLower.some(c => c.includes('fecha')) &&
          rowLower.some(c => c.includes('monto') || c.includes('importe'))) {
        headerIdx = i;
        break;
      }
    }

    const headers = rows[headerIdx]!.map(h => h.toLowerCase().trim());
    const dataRows = rows.slice(headerIdx + 1);

    const dateIdx = headers.findIndex(h => h.includes('fecha') && !h.includes('valor'));
    const descIdx = headers.findIndex(h => h.includes('descripci') || h.includes('concepto'));
    const amountIdx = headers.findIndex(h => h.includes('monto') || h.includes('importe'));
    const saldoIdx = headers.findIndex(h => h.includes('saldo'));
    const refIdx = headers.findIndex(h => h.includes('referencia'));

    const transactions: ParsedTransaction[] = [];

    for (const row of dataRows) {
      if (row.length === 0 || row.every(cell => cell.trim() === '')) continue;

      const rawData: Record<string, string> = {};
      headers.forEach((header, idx) => {
        rawData[header] = row[idx] ?? '';
      });

      const dateStr = row[dateIdx]?.trim() ?? '';
      const description = row[descIdx]?.trim() ?? '';
      const amountStr = row[amountIdx]?.trim() ?? '';
      const balanceStr = saldoIdx >= 0 ? row[saldoIdx]?.trim() : undefined;
      const reference = refIdx >= 0 ? row[refIdx]?.trim() : undefined;

      if (!dateStr || !amountStr) continue;

      // Santander uses a single Monto column: negative for expenses, positive for income
      const amount = parseAmountSantander(amountStr);
      if (amount === 0) continue;

      const type: 'income' | 'expense' = amount > 0 ? 'income' : 'expense';

      transactions.push({
        date: dateStr,
        description: description || 'Movimiento Santander',
        amount: Math.abs(amount),
        type,
        reference: reference || undefined,
        balance: balanceStr ? parseAmountSantander(balanceStr) : undefined,
        rawData,
      });
    }

    return transactions;
  }

  getFieldMappings(): FieldMapping[] {
    return [
      { sourceColumn: 'Fecha', targetField: 'date' },
      { sourceColumn: 'Descripción', targetField: 'description' },
      { sourceColumn: 'Monto', targetField: 'amount' },
      { sourceColumn: 'Referencia', targetField: 'reference' },
      { sourceColumn: 'Saldo', targetField: 'balance' },
    ];
  }
}

/** Parse Santander amount: signed number with possible currency symbols */
function parseAmountSantander(value: string): number {
  if (!value || value.trim() === '' || value.trim() === '-') return 0;

  const cleaned = value
    .replace(/[$MX\s]/gi, '')
    .replace(/,/g, '');

  // Handle parenthetical negatives
  let finalStr = cleaned;
  if (finalStr.startsWith('(') && finalStr.endsWith(')')) {
    finalStr = '-' + finalStr.slice(1, -1);
  }

  const num = parseFloat(finalStr);
  return isNaN(num) ? 0 : num;
}

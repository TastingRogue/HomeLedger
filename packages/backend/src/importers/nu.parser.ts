/**
 * Parser for Nu México (Nubank) bank statements.
 * Handles the typical CSV export format from Nu México app.
 *
 * Expected CSV columns (common format):
 * date, title, amount
 * or
 * Fecha, Descripción, Monto
 *
 * Nu exports tend to be simpler with fewer columns.
 * Amounts are typically positive for charges/expenses and
 * the file may include a type indicator or payment entries.
 */

import type {
  BankParser,
  FieldMapping,
  ParsedTransaction,
  ParseOptions,
} from './base-importer.js';
import { parseCSV } from './base-importer.js';

/** Known header patterns for Nu México files */
const NU_HEADERS = [
  ['date', 'title', 'amount'],
  ['fecha', 'descripción', 'monto'],
  ['fecha', 'descripcion', 'monto'],
  ['date', 'description', 'amount'],
  ['fecha', 'título', 'monto'],
  ['fecha', 'titulo', 'monto'],
];

export class NuParser implements BankParser {
  bankId = 'nu_mx';
  bankName = 'Nu México';
  supportedFormats: ('csv' | 'xlsx' | 'ofx')[] = ['csv'];

  detect(content: Buffer, filename: string): boolean {
    const lowerFilename = filename.toLowerCase();

    // Check filename patterns
    if (lowerFilename.includes('nu') || lowerFilename.includes('nubank')) {
      return true;
    }

    // Check content
    const text = content.subarray(0, Math.min(content.length, 2048)).toString('utf-8').toLowerCase();

    if (text.includes('nubank') || text.includes('nu méxico') || text.includes('nu mexico')) {
      return true;
    }

    // Check if headers match known Nu patterns (Nu tends to use English headers)
    const firstLines = text.split('\n').slice(0, 3).map(l => l.trim().toLowerCase());
    for (const line of firstLines) {
      for (const pattern of NU_HEADERS) {
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
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = rows[i]!;
      const rowLower = row.map(c => c.toLowerCase());
      if (rowLower.some(c => c.includes('date') || c.includes('fecha')) &&
          rowLower.some(c => c.includes('amount') || c.includes('monto'))) {
        headerIdx = i;
        break;
      }
    }

    const headers = rows[headerIdx]!.map(h => h.toLowerCase().trim());
    const dataRows = rows.slice(headerIdx + 1);

    const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('fecha'));
    const descIdx = headers.findIndex(h =>
      h.includes('title') || h.includes('description') ||
      h.includes('descripci') || h.includes('título') || h.includes('titulo')
    );
    const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('monto'));

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

      if (!dateStr || !amountStr) continue;

      const amount = parseAmountNu(amountStr);
      if (amount === 0) continue;

      // Nu typically exports expenses as positive amounts.
      // Payments/refunds may appear as negative.
      const type: 'income' | 'expense' = amount < 0 ? 'income' : 'expense';

      transactions.push({
        date: dateStr,
        description: description || 'Movimiento Nu',
        amount: Math.abs(amount),
        type,
        reference: undefined,
        balance: undefined,
        rawData,
      });
    }

    return transactions;
  }

  getFieldMappings(): FieldMapping[] {
    return [
      { sourceColumn: 'date', targetField: 'date' },
      { sourceColumn: 'title', targetField: 'description' },
      { sourceColumn: 'amount', targetField: 'amount' },
    ];
  }
}

/** Parse Nu amount: simple decimal format */
function parseAmountNu(value: string): number {
  if (!value || value.trim() === '' || value.trim() === '-') return 0;

  const cleaned = value
    .replace(/[$MX\s]/gi, '')
    .replace(/,/g, '');

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

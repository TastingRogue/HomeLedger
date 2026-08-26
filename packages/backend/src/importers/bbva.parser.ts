/**
 * Parser for BBVA México bank statements.
 * Handles the typical CSV export format from BBVA México online banking.
 *
 * Expected CSV columns (common format):
 * Fecha, Descripción, Cargo, Abono, Saldo
 * or
 * Fecha, Concepto, Referencia, Cargo, Abono, Saldo
 */

import type {
  BankParser,
  FieldMapping,
  ParsedTransaction,
  ParseOptions,
} from './base-importer.js';
import { parseCSV } from './base-importer.js';

/** Known header patterns for BBVA México files */
const BBVA_HEADERS = [
  ['fecha', 'descripción', 'cargo', 'abono', 'saldo'],
  ['fecha', 'descripcion', 'cargo', 'abono', 'saldo'],
  ['fecha', 'concepto', 'referencia', 'cargo', 'abono', 'saldo'],
  ['fecha', 'concepto', 'cargo', 'abono', 'saldo'],
];

export class BBVAParser implements BankParser {
  bankId = 'bbva_mx';
  bankName = 'BBVA México';
  supportedFormats: ('csv' | 'xlsx' | 'ofx')[] = ['csv', 'xlsx'];

  detect(content: Buffer, filename: string): boolean {
    const lowerFilename = filename.toLowerCase();

    // Check filename patterns
    if (lowerFilename.includes('bbva') || lowerFilename.includes('bancomer')) {
      return true;
    }

    // Check content headers
    const text = content.subarray(0, Math.min(content.length, 2048)).toString('utf-8').toLowerCase();

    // Look for BBVA-specific patterns in content
    if (text.includes('bbva') || text.includes('bancomer')) {
      return true;
    }

    // Check if headers match known BBVA patterns
    const firstLines = text.split('\n').slice(0, 5).map(l => l.trim().toLowerCase());
    for (const line of firstLines) {
      for (const pattern of BBVA_HEADERS) {
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

    // Find header row (may have metadata rows before it)
    let headerIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i]!;
      const rowLower = row.map(c => c.toLowerCase());
      if (rowLower.some(c => c.includes('fecha')) && rowLower.some(c => c.includes('cargo') || c.includes('abono'))) {
        headerIdx = i;
        break;
      }
    }

    const headers = rows[headerIdx]!.map(h => h.toLowerCase().trim());
    const dataRows = rows.slice(headerIdx + 1);

    const dateIdx = headers.findIndex(h => h.includes('fecha'));
    const descIdx = headers.findIndex(h => h.includes('descripci') || h.includes('concepto'));
    const cargoIdx = headers.findIndex(h => h === 'cargo' || h.includes('cargo'));
    const abonoIdx = headers.findIndex(h => h === 'abono' || h.includes('abono'));
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

      if (!dateStr) continue;

      // BBVA uses separate columns for charges (Cargo) and deposits (Abono)
      const cargoStr = row[cargoIdx]?.trim() ?? '';
      const abonoStr = row[abonoIdx]?.trim() ?? '';
      const balanceStr = saldoIdx >= 0 ? row[saldoIdx]?.trim() : undefined;
      const reference = refIdx >= 0 ? row[refIdx]?.trim() : undefined;

      const cargo = parseAmountBBVA(cargoStr);
      const abono = parseAmountBBVA(abonoStr);

      // Determine type and amount
      let amount: number;
      let type: 'income' | 'expense';

      if (abono > 0) {
        amount = abono;
        type = 'income';
      } else if (cargo > 0) {
        amount = cargo;
        type = 'expense';
      } else {
        continue; // Skip rows with no monetary movement
      }

      transactions.push({
        date: dateStr,
        description: description || 'Movimiento BBVA',
        amount,
        type,
        reference: reference || undefined,
        balance: balanceStr ? parseAmountBBVA(balanceStr) : undefined,
        rawData,
      });
    }

    return transactions;
  }

  getFieldMappings(): FieldMapping[] {
    return [
      { sourceColumn: 'Fecha', targetField: 'date' },
      { sourceColumn: 'Descripción', targetField: 'description' },
      { sourceColumn: 'Cargo', targetField: 'amount' },
      { sourceColumn: 'Referencia', targetField: 'reference' },
      { sourceColumn: 'Saldo', targetField: 'balance' },
    ];
  }
}

/** Parse BBVA amount format: "1,234.56" or "$1,234.56" or empty */
function parseAmountBBVA(value: string): number {
  if (!value || value.trim() === '' || value.trim() === '-') return 0;

  const cleaned = value
    .replace(/[$MX\s]/gi, '')
    .replace(/,/g, '');

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

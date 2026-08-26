/**
 * Generic CSV parser that requires manual column mapping.
 * Used as a fallback when no bank-specific parser matches the file.
 */

import type {
  BankParser,
  FieldMapping,
  ParsedTransaction,
  ParseOptions,
} from './base-importer.js';
import { parseCSV } from './base-importer.js';

export class GenericCSVParser implements BankParser {
  bankId = 'generic';
  bankName = 'CSV Genérico';
  supportedFormats: ('csv' | 'xlsx' | 'ofx')[] = ['csv'];

  /**
   * The generic parser always returns false for auto-detection.
   * It is used as a manual fallback when no specific parser matches.
   */
  detect(_content: Buffer, _filename: string): boolean {
    return false;
  }

  /**
   * Parse CSV content using provided field mappings via options.
   * Requires options.fieldMappings to know which columns map to which fields.
   */
  parse(content: Buffer, options?: ParseOptions & { fieldMappings?: FieldMapping[] }): ParsedTransaction[] {
    const encoding = options?.encoding ?? 'utf-8';
    const delimiter = options?.delimiter ?? ',';
    const skipRows = options?.skipRows ?? 0;

    const text = content.toString(encoding);
    const rows = parseCSV(text, delimiter);

    if (rows.length <= skipRows) return [];

    // First row after skipped rows is treated as header
    const headerRow = rows[skipRows];
    if (!headerRow) return [];

    const dataRows = rows.slice(skipRows + 1);
    const mappings = options?.fieldMappings ?? this.getFieldMappings();

    const transactions: ParsedTransaction[] = [];

    for (const row of dataRows) {
      if (row.length === 0 || row.every(cell => cell.trim() === '')) continue;

      const rawData: Record<string, string> = {};
      headerRow.forEach((header, idx) => {
        rawData[header] = row[idx] ?? '';
      });

      const getValue = (targetField: string): string => {
        const mapping = mappings.find(m => m.targetField === targetField);
        if (!mapping) return '';
        const colIdx = headerRow.indexOf(mapping.sourceColumn);
        if (colIdx === -1) return '';
        return row[colIdx]?.trim() ?? '';
      };

      const dateStr = getValue('date');
      const description = getValue('description');
      const amountStr = getValue('amount');
      const reference = getValue('reference');
      const balanceStr = getValue('balance');

      if (!dateStr || !amountStr) continue;

      const amount = parseAmount(amountStr);
      const type: 'income' | 'expense' = amount >= 0 ? 'income' : 'expense';

      transactions.push({
        date: dateStr,
        description: description || 'Sin descripción',
        amount: Math.abs(amount),
        type,
        reference: reference || undefined,
        balance: balanceStr ? parseAmount(balanceStr) : undefined,
        rawData,
      });
    }

    return transactions;
  }

  getFieldMappings(): FieldMapping[] {
    // Default mappings — user must configure these for their specific file
    return [
      { sourceColumn: 'Fecha', targetField: 'date' },
      { sourceColumn: 'Descripción', targetField: 'description' },
      { sourceColumn: 'Monto', targetField: 'amount' },
      { sourceColumn: 'Referencia', targetField: 'reference' },
      { sourceColumn: 'Saldo', targetField: 'balance' },
    ];
  }
}

/**
 * Parse a monetary amount string, handling common MXN formats.
 * Supports: "$1,234.56", "1234.56", "-$1,234.56", "($1,234.56)"
 */
function parseAmount(value: string): number {
  let cleaned = value
    .replace(/[$MX\s]/gi, '')  // Remove currency symbols and spaces
    .replace(/,/g, '');         // Remove thousands separator

  // Handle parenthetical negatives: (1234.56) → -1234.56
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

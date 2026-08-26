/**
 * Base interfaces and types for the bank import engine.
 * Each bank parser implements BankParser to handle its specific file format.
 */

/** Supported file formats for import */
export type SupportedFormat = 'csv' | 'xlsx' | 'ofx';

/** A parsed transaction extracted from a bank file */
export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  reference?: string;
  balance?: number;
  rawData: Record<string, string>;
}

/** Options passed to the parser during file processing */
export interface ParseOptions {
  encoding?: BufferEncoding;
  dateFormat?: string;
  delimiter?: string;
  skipRows?: number;
}

/** Field mapping configuration for generic/manual CSV imports */
export interface FieldMapping {
  sourceColumn: string;
  targetField: keyof Pick<ParsedTransaction, 'date' | 'description' | 'amount' | 'reference' | 'balance'>;
}

/** Interface that all bank parsers must implement */
export interface BankParser {
  bankId: string;
  bankName: string;
  supportedFormats: SupportedFormat[];

  /** Auto-detect if the file belongs to this bank based on content/filename */
  detect(content: Buffer, filename: string): boolean;

  /** Parse the file content into an array of transactions */
  parse(content: Buffer, options?: ParseOptions): ParsedTransaction[];

  /** Return the default field mappings used by this parser */
  getFieldMappings(): FieldMapping[];
}

/** Detected file format result */
export interface FileFormatDetection {
  format: SupportedFormat | 'unknown';
  confidence: number;
}

/**
 * Detect file format based on extension and content headers.
 */
export function detectFileFormat(content: Buffer, filename: string): FileFormatDetection {
  const ext = filename.toLowerCase().split('.').pop() ?? '';

  // Check by extension first
  if (ext === 'csv' || ext === 'txt') {
    return { format: 'csv', confidence: 0.9 };
  }

  if (ext === 'xlsx' || ext === 'xls') {
    return { format: 'xlsx', confidence: 0.9 };
  }

  if (ext === 'ofx' || ext === 'qfx') {
    return { format: 'ofx', confidence: 0.9 };
  }

  // Check by content headers if extension is inconclusive
  const header = content.subarray(0, Math.min(content.length, 512)).toString('utf-8');

  // OFX files start with XML or OFXHEADER
  if (header.includes('OFXHEADER') || header.includes('<OFX>') || header.includes('<ofx>')) {
    return { format: 'ofx', confidence: 0.95 };
  }

  // XLSX files start with PK (ZIP signature)
  if (content.length >= 4 && content[0] === 0x50 && content[1] === 0x4B &&
      content[2] === 0x03 && content[3] === 0x04) {
    return { format: 'xlsx', confidence: 0.95 };
  }

  // If content looks like CSV (lines with commas/semicolons/tabs)
  const lines = header.split('\n').filter(l => l.trim().length > 0);
  if (lines.length >= 2) {
    const delimiters = [',', ';', '\t'];
    for (const delim of delimiters) {
      const counts = lines.slice(0, 5).map(l => l.split(delim).length);
      // If consistent delimiter count across lines, likely CSV
      if (counts.every(c => c > 1 && c === counts[0])) {
        return { format: 'csv', confidence: 0.7 };
      }
    }
  }

  return { format: 'unknown', confidence: 0 };
}

/**
 * Simple CSV parser that splits content into rows and columns.
 * Handles quoted fields and common delimiters.
 */
export function parseCSV(content: string, delimiter: string = ','): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (line.trim().length === 0) continue;

    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i]!;

      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }

  return rows;
}

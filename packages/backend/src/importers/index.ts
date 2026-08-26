/**
 * Import Engine - Bank-specific parsers for CSV/OFX/Excel files.
 *
 * Architecture:
 * - Each bank has its own parser implementing BankParser interface
 * - Auto-detection tries each parser's detect() method in order
 * - GenericCSVParser is the manual fallback requiring user-configured mappings
 * - detectFileFormat() determines the file type by extension and content headers
 */

// Base types and utilities
export {
  detectFileFormat,
  parseCSV,
} from './base-importer.js';

export type {
  BankParser,
  FieldMapping,
  FileFormatDetection,
  ParsedTransaction,
  ParseOptions,
  SupportedFormat,
} from './base-importer.js';

// Bank-specific parsers
export { BBVAParser } from './bbva.parser.js';
export { SantanderParser } from './santander.parser.js';
export { NuParser } from './nu.parser.js';
export { GenericCSVParser } from './generic.parser.js';

// Registered parsers (order matters for auto-detection)
import { BBVAParser } from './bbva.parser.js';
import { SantanderParser } from './santander.parser.js';
import { NuParser } from './nu.parser.js';
import { GenericCSVParser } from './generic.parser.js';
import type { BankParser } from './base-importer.js';

/** All available parsers in priority order for auto-detection */
export const PARSERS: BankParser[] = [
  new BBVAParser(),
  new SantanderParser(),
  new NuParser(),
  new GenericCSVParser(),   // Fallback — manual mapping required
];

/**
 * Auto-detect which parser matches the given file content and filename.
 * Returns the first matching parser, or GenericCSVParser as fallback.
 */
export function detectParser(content: Buffer, filename: string): BankParser {
  for (const parser of PARSERS) {
    if (parser.detect(content, filename)) {
      return parser;
    }
  }
  // GenericCSVParser.detect() always returns false, so return it explicitly as fallback
  return PARSERS[PARSERS.length - 1]!;
}

/**
 * Get parser by bank ID.
 */
export function getParserById(bankId: string): BankParser | undefined {
  return PARSERS.find(p => p.bankId === bankId);
}

/**
 * Get list of available parsers with their metadata.
 */
export function getAvailableParsers(): Array<{ bankId: string; bankName: string; supportedFormats: string[] }> {
  return PARSERS.map(p => ({
    bankId: p.bankId,
    bankName: p.bankName,
    supportedFormats: [...p.supportedFormats],
  }));
}

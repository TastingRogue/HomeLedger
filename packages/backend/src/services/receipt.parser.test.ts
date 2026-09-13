import { describe, it, expect } from 'vitest';
import {
  numberValue,
  moneyValue,
  ocrDroppedDecimals,
  parseDate,
  parseCfdi,
  parsePlainText,
} from './receipt.service.js';

// These tests pin the behaviour of the receipt-parsing heuristics (the
// "best-effort" OCR/PDF/CFDI extraction). They document what the parser does
// today, guard against regressions, and cover the accuracy edge cases:
// separator ambiguity, item-count "TOTAL" false matches, and OCR-dropped
// decimals.

describe('numberValue — separator disambiguation', () => {
  it('parses a plain decimal', () => {
    expect(numberValue('114.75')).toBe(114.75);
  });

  it('treats a trailing comma-2-digits as the decimal (114,75)', () => {
    expect(numberValue('114,75')).toBe(114.75);
  });

  it('reads European format 1.234,56 (dot=thousands, comma=decimal)', () => {
    expect(numberValue('1.234,56')).toBe(1234.56);
  });

  it('reads US format 1,234.56 (comma=thousands, dot=decimal)', () => {
    expect(numberValue('1,234.56')).toBe(1234.56);
  });

  it('treats bare comma-groups as thousands (1,234 -> 1234)', () => {
    expect(numberValue('1,234')).toBe(1234);
  });

  it('treats bare dot-groups as thousands (1.234 -> 1234)', () => {
    expect(numberValue('1.234')).toBe(1234);
  });

  it('strips currency symbols and spaces', () => {
    expect(numberValue('$ 1,299.00')).toBe(1299);
  });

  it('returns null for empty / non-numeric input', () => {
    expect(numberValue('')).toBeNull();
    expect(numberValue(null)).toBeNull();
    expect(numberValue('abc')).toBeNull();
  });
});

describe('moneyValue — OCR cents recovery', () => {
  it('leaves separated amounts untouched even when assumeCents is on', () => {
    expect(moneyValue('114.75', true)).toBe(114.75);
  });

  it('recovers dropped decimals for a separator-less 3+ digit integer', () => {
    // OCR read "114.75" as "11475".
    expect(moneyValue('11475', true)).toBe(114.75);
  });

  it('does NOT apply cents recovery when assumeCents is off', () => {
    expect(moneyValue('11475', false)).toBe(11475);
  });

  it('leaves 1-2 digit integers alone (below the cents threshold)', () => {
    expect(moneyValue('50', true)).toBe(50);
  });
});

describe('ocrDroppedDecimals — detection heuristic', () => {
  it('flags text where no sizable number has a decimal separator', () => {
    expect(ocrDroppedDecimals('OXXO\nTOTAL 11475\nEFECTIVO 12000')).toBe(true);
  });

  it('does not flag text where amounts carry decimals', () => {
    expect(ocrDroppedDecimals('OXXO\nTOTAL 114.75\nEFECTIVO 120.00')).toBe(false);
  });

  it('does not flag text with no money-sized numbers', () => {
    expect(ocrDroppedDecimals('Gracias por su compra')).toBe(false);
  });
});

describe('parseDate', () => {
  it('keeps an ISO date as-is', () => {
    expect(parseDate('2026-02-14 10:30')).toBe('2026-02-14');
  });

  it('normalizes dd/mm/yyyy to ISO', () => {
    expect(parseDate('14/02/2026')).toBe('2026-02-14');
  });

  it('expands a 2-digit year to 20xx', () => {
    expect(parseDate('05-03-24')).toBe('2024-03-05');
  });

  it('zero-pads single-digit day/month', () => {
    expect(parseDate('5/3/2026')).toBe('2026-03-05');
  });

  it('returns the input unchanged when it is not a recognizable date', () => {
    expect(parseDate('no date here')).toBe('no date here');
    expect(parseDate(null)).toBeNull();
  });
});

describe('parsePlainText — receipt (PDF text)', () => {
  const receipt = [
    'SUPER MERCADO EL SOL',
    'Av. Reforma 123',
    'Fecha: 14/02/2026',
    'Leche 1L        28.50',
    'Pan integral    45.00',
    'SUBTOTAL        73.50',
    'IVA             11.76',
    'TOTAL A PAGAR   85.26',
    'Gracias por su compra',
  ].join('\n');

  it('extracts subtotal, tax and total', () => {
    const parsed = parsePlainText(receipt, 'pdf_text');
    expect(parsed.subtotal).toBe(73.5);
    expect(parsed.tax).toBe(11.76);
    expect(parsed.total).toBe(85.26);
  });

  it('picks the store name as merchant (first non-keyword line)', () => {
    const parsed = parsePlainText(receipt, 'pdf_text');
    expect(parsed.merchant).toBe('SUPER MERCADO EL SOL');
  });

  it('normalizes the date and marks it a receipt with pdf_text source', () => {
    const parsed = parsePlainText(receipt, 'pdf_text');
    expect(parsed.receiptDate).toBe('2026-02-14');
    expect(parsed.documentType).toBe('receipt');
    expect(parsed.sourceType).toBe('pdf_text');
  });

  it('gives higher confidence to pdf_text than ocr when a total is found', () => {
    const pdf = parsePlainText(receipt, 'pdf_text');
    const ocr = parsePlainText(receipt, 'ocr');
    expect(pdf.confidence).toBeGreaterThan(ocr.confidence);
  });

  it('drops to low confidence when no total is found', () => {
    const parsed = parsePlainText('Random text\nno amounts', 'pdf_text');
    expect(parsed.confidence).toBeLessThanOrEqual(0.2);
  });
});

describe('parsePlainText — TOTAL disambiguation (accuracy)', () => {
  it('does not confuse SUBTOTAL for TOTAL', () => {
    const text = 'TIENDA\nSUBTOTAL 100.00\nIVA 16.00\nTOTAL A PAGAR 116.00';
    const parsed = parsePlainText(text, 'pdf_text');
    expect(parsed.total).toBe(116);
    expect(parsed.subtotal).toBe(100);
  });

  it('ignores an item-count line like "TOTAL ARTICULOS: 3"', () => {
    const text = 'TIENDA\nTOTAL ARTICULOS: 3\nTOTAL A PAGAR 250.00';
    const parsed = parsePlainText(text, 'pdf_text');
    expect(parsed.total).toBe(250);
  });

  it('falls back to a plain TOTAL when there is no "A PAGAR" form', () => {
    const text = 'TIENDA\nSUBTOTAL 90.00\nTOTAL 104.40';
    const parsed = parsePlainText(text, 'pdf_text');
    expect(parsed.total).toBe(104.4);
  });

  it('matches GRAN TOTAL', () => {
    const text = 'TIENDA\nSUBTOTAL 90.00\nGRAN TOTAL 104.40';
    const parsed = parsePlainText(text, 'pdf_text');
    expect(parsed.total).toBe(104.4);
  });
});

describe('parsePlainText — OCR with dropped decimals', () => {
  it('recovers cents across the amounts when OCR lost the separators', () => {
    const text = 'OXXO\nSUBTOTAL 10000\nIVA 1600\nTOTAL A PAGAR 11600';
    const parsed = parsePlainText(text, 'ocr');
    expect(parsed.total).toBe(116);
    expect(parsed.subtotal).toBe(100);
    expect(parsed.tax).toBe(16);
    expect(parsed.sourceType).toBe('ocr');
  });

  it('keeps decimals as-is when OCR preserved the separators', () => {
    const text = 'OXXO\nTOTAL A PAGAR 116.00';
    const parsed = parsePlainText(text, 'ocr');
    expect(parsed.total).toBe(116);
  });
});

describe('parseCfdi — structured invoice', () => {
  const xml = `<?xml version="1.0"?>
  <cfdi:Comprobante Version="4.0" SubTotal="1000.00" Total="1160.00" Moneda="MXN" Fecha="2026-02-14T10:30:00">
    <cfdi:Emisor Rfc="AAA010101AAA" Nombre="Proveedor S.A. de C.V. &amp; Hijos"/>
    <cfdi:Conceptos>
      <cfdi:Concepto Cantidad="2" ValorUnitario="500.00" Importe="1000.00" Descripcion="Servicio de consultor&#237;a"/>
    </cfdi:Conceptos>
    <cfdi:Complemento>
      <tfd:TimbreFiscalDigital UUID="12345678-90AB-CDEF-1234-567890ABCDEF"/>
    </cfdi:Complemento>
  </cfdi:Comprobante>`;

  it('extracts totals, currency, and normalized date', () => {
    const parsed = parseCfdi(xml);
    expect(parsed.subtotal).toBe(1000);
    expect(parsed.total).toBe(1160);
    expect(parsed.currency).toBe('MXN');
    expect(parsed.receiptDate).toBe('2026-02-14');
  });

  it('extracts issuer RFC + name and the fiscal UUID, decoding XML entities', () => {
    const parsed = parseCfdi(xml);
    expect(parsed.issuerRfc).toBe('AAA010101AAA');
    expect(parsed.issuerName).toBe('Proveedor S.A. de C.V. & Hijos');
    expect(parsed.merchant).toBe('Proveedor S.A. de C.V. & Hijos');
    expect(parsed.uuid).toBe('12345678-90AB-CDEF-1234-567890ABCDEF');
  });

  it('parses line items', () => {
    const parsed = parseCfdi(xml);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]).toMatchObject({ quantity: 2, unitPrice: 500, total: 1000 });
    expect(parsed.items[0]!.description).toContain('consultor');
  });

  it('is marked as a cfdi with full confidence', () => {
    const parsed = parseCfdi(xml);
    expect(parsed.documentType).toBe('cfdi');
    expect(parsed.sourceType).toBe('cfdi_xml');
    expect(parsed.confidence).toBe(1);
  });
});

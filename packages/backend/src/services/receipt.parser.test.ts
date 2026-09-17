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

describe('parsePlainText — OCR amounts read at face value (no cents division)', () => {
  // Regression: a genuine whole-dollar total like $755 must NOT be divided by
  // 100 into $7.55. Reading bare integers literally is the safe default; the
  // user can fix a rare truly-dropped decimal in the editable field.
  it('keeps a whole-dollar total as-is ($755 stays 755, not 7.55)', () => {
    const text = 'INVOICE\nItem $500\nBanner $90\nPoster $165\nTOTAL $755';
    const parsed = parsePlainText(text, 'ocr');
    expect(parsed.total).toBe(755);
  });

  it('does not scale separator-less OCR integers', () => {
    const text = 'OXXO\nSUBTOTAL 10000\nIVA 1600\nTOTAL A PAGAR 11600';
    const parsed = parsePlainText(text, 'ocr');
    expect(parsed.total).toBe(11600);
    expect(parsed.subtotal).toBe(10000);
    expect(parsed.tax).toBe(1600);
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

  // P4.6: IVA / tax extraction.
  it('falls back to total − subtotal when there is no Impuestos node', () => {
    const parsed = parseCfdi(xml);
    expect(parsed.tax).toBe(160);
  });

  it('extracts IVA from the document-level TotalImpuestosTrasladados', () => {
    const withImpuestos = `<?xml version="1.0"?>
    <cfdi:Comprobante Version="4.0" SubTotal="1000.00" Total="1160.00" Moneda="MXN" Fecha="2026-02-14">
      <cfdi:Emisor Rfc="AAA010101AAA" Nombre="Proveedor"/>
      <cfdi:Impuestos TotalImpuestosTrasladados="160.00">
        <cfdi:Traslados>
          <cfdi:Traslado Base="1000.00" Impuesto="002" TasaOCuota="0.160000" Importe="160.00"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Comprobante>`;
    expect(parseCfdi(withImpuestos).tax).toBe(160);
  });

  it('sums Traslado Importe when there is no document-level total', () => {
    const trasladosOnly = `<?xml version="1.0"?>
    <cfdi:Comprobante Version="4.0" SubTotal="200.00" Total="232.00" Moneda="MXN" Fecha="2026-02-14">
      <cfdi:Emisor Rfc="AAA010101AAA" Nombre="Proveedor"/>
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Importe="16.00"/>
          <cfdi:Traslado Importe="16.00"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Comprobante>`;
    expect(parseCfdi(trasladosOnly).tax).toBe(32);
  });
});

describe('parseDate — textual months (English + Spanish)', () => {
  it('parses English day-first "02 June, 2030"', () => {
    expect(parseDate('02 June, 2030')).toBe('2030-06-02');
  });

  it('parses English month-first "June 2, 2030"', () => {
    expect(parseDate('June 2, 2030')).toBe('2030-06-02');
  });

  it('parses an English abbreviation "2 Jun 2030"', () => {
    expect(parseDate('2 Jun 2030')).toBe('2030-06-02');
  });

  it('parses Spanish "02 de junio de 2030"', () => {
    expect(parseDate('02 de junio de 2030')).toBe('2030-06-02');
  });

  it('parses Spanish with accented month "14 de diciembre de 2026"', () => {
    expect(parseDate('14 de diciembre de 2026')).toBe('2026-12-14');
  });

  it('parses Spanish abbreviation "5 ene 2026"', () => {
    expect(parseDate('5 ene 2026')).toBe('2026-01-05');
  });

  it('still parses numeric dd/mm/yyyy', () => {
    expect(parseDate('14/02/2026')).toBe('2026-02-14');
  });

  it('returns the input unchanged for an unknown month name', () => {
    expect(parseDate('02 Smarch 2030')).toBe('02 Smarch 2030');
  });
});

describe('parsePlainText — the reported invoice (English, textual date)', () => {
  // Mirrors the invoice.webp from the bug report: "Date: 02 June, 2030",
  // "Total $755". Previously DATE came back empty because the parser only knew
  // numeric dates.
  const invoice = [
    'YOUR LOGO',
    'INVOICE',
    'Date: 02 June, 2030',
    'Billed to: Studio Shodwe',
    'Item        Quantity  Price  Amount',
    'Logo        1         $500   $500',
    'Banner      2         $45    $90',
    'Poster      3         $55    $165',
    'Total       $755',
    'Payment method: Cash',
  ].join('\n');

  it('extracts the textual date', () => {
    expect(parsePlainText(invoice, 'ocr').receiptDate).toBe('2030-06-02');
  });

  it('extracts the total as a whole-dollar amount', () => {
    expect(parsePlainText(invoice, 'ocr').total).toBe(755);
  });

  it('is classified as an invoice', () => {
    expect(parsePlainText(invoice, 'ocr').documentType).toBe('invoice');
  });
});

describe('parsePlainText — English keyword variants', () => {
  it('matches "TAX" for the tax field', () => {
    const text = 'STORE\nSUBTOTAL $100.00\nTAX $8.00\nTOTAL DUE $108.00';
    const parsed = parsePlainText(text, 'ocr');
    expect(parsed.subtotal).toBe(100);
    expect(parsed.tax).toBe(8);
    expect(parsed.total).toBe(108);
  });

  it('matches "AMOUNT DUE" and "BALANCE DUE" as total', () => {
    expect(parsePlainText('STORE\nAMOUNT DUE $42.50', 'ocr').total).toBe(42.5);
    expect(parsePlainText('STORE\nBALANCE DUE $42.50', 'ocr').total).toBe(42.5);
  });

  it('matches "GRAND TOTAL" and "VAT"', () => {
    const text = 'SHOP\nSUBTOTAL 90.00\nVAT 14.40\nGRAND TOTAL 104.40';
    const parsed = parsePlainText(text, 'ocr');
    expect(parsed.tax).toBe(14.4);
    expect(parsed.total).toBe(104.4);
  });

  it('detects USD when the text uses US$/USD', () => {
    expect(parsePlainText('STORE\nTOTAL US$50.00', 'ocr').currency).toBe('USD');
  });
});

describe('parsePlainText — RFC and UUID from OCR text', () => {
  it('extracts a Mexican company RFC (labeled)', () => {
    const text = 'FACTURA\nRFC: AAA010101AAA\nTOTAL A PAGAR 116.00';
    expect(parsePlainText(text, 'ocr').issuerRfc).toBe('AAA010101AAA');
  });

  it('extracts a person RFC (4 leading letters)', () => {
    const text = 'FACTURA\nRFC XAXX010101000\nTOTAL A PAGAR 116.00';
    expect(parsePlainText(text, 'ocr').issuerRfc).toBe('XAXX010101000');
  });

  it('extracts a CFDI fiscal folio (UUID)', () => {
    const text = 'FACTURA\nFolio Fiscal 12345678-90AB-CDEF-1234-567890ABCDEF\nTOTAL 116.00';
    expect(parsePlainText(text, 'ocr').uuid).toBe('12345678-90AB-CDEF-1234-567890ABCDEF');
  });

  it('leaves RFC/UUID null when absent', () => {
    const parsed = parsePlainText('TIENDA\nTOTAL A PAGAR 50.00', 'ocr');
    expect(parsed.issuerRfc).toBeNull();
    expect(parsed.uuid).toBeNull();
  });
});

describe('parsePlainText — confidence reflects extracted fields', () => {
  it('rises as more fields are recovered', () => {
    const sparse = parsePlainText('STORE\nTOTAL $100.00', 'ocr');
    const rich = parsePlainText(
      'STORE\nDate: 02 June, 2030\nSUBTOTAL $90.00\nTAX $10.00\nTOTAL $100.00',
      'ocr',
    );
    expect(rich.confidence).toBeGreaterThan(sparse.confidence);
  });

  it('stays low (<=0.2) when no total is found', () => {
    expect(parsePlainText('just some text', 'ocr').confidence).toBeLessThanOrEqual(0.2);
  });

  it('never exceeds the OCR cap of 0.85', () => {
    const rich = parsePlainText(
      'STORE\nRFC AAA010101AAA\nDate: 02 June, 2030\nSUBTOTAL $90.00\nTAX $10.00\nTOTAL $100.00',
      'ocr',
    );
    expect(rich.confidence).toBeLessThanOrEqual(0.85);
  });
});

describe('parseDate — ambiguous numeric order + invalid dates', () => {
  it('parses US mm/dd/yyyy when the 2nd field is > 12 (02/15/16)', () => {
    // The blank-template invoice used FECHA 02/15/16 — month 02, day 15.
    expect(parseDate('02/15/16')).toBe('2016-02-15');
  });

  it('parses dd/mm/yyyy when the 1st field is > 12 (15/02/2016)', () => {
    expect(parseDate('15/02/2016')).toBe('2016-02-15');
  });

  it('defaults to day-first when both fields are <= 12 (05/03/2026)', () => {
    expect(parseDate('05/03/2026')).toBe('2026-03-05');
  });

  it('returns null for an impossible date instead of a NaN string (13/25/2026)', () => {
    expect(parseDate('13/25/2026')).toBeNull();
  });
});

describe('parsePlainText — amount picked from the right-hand column', () => {
  // Regression from the blank-template FACTURA: labels on the left, values in a
  // far right column, with a rate "(3.8 %)" as a decoy before the tax amount.
  const invoice = [
    'PLANTILLA DE FACTURA EN BLANCO',
    'FACTURA',
    'DESCRIPCION                         MONTO',
    'Articulo 1                          25.00',
    'Servicio 1                          50.00',
    'Servicio 2                          50.00',
    'SUBTOTAL                           125.00',
    'IMPUESTOS (3.8 %)                    4.75',
    'ENVIO/MANIPULACION                  10.00',
    'DESCUENTO                           25.00',
    'TOTAL                          $   114.75',
  ].join('\n');

  it('does not mistake the "(3.8 %)" rate for the tax amount', () => {
    expect(parsePlainText(invoice, 'ocr').tax).toBe(4.75);
  });

  it('reads the true TOTAL from the right column, not the subtotal', () => {
    const parsed = parsePlainText(invoice, 'ocr');
    expect(parsed.total).toBe(114.75);
    expect(parsed.subtotal).toBe(125);
  });

  it('returns null merchant on a blank template (no real company name)', () => {
    // Every line here is a title, label, placeholder, or item row — there is no
    // real merchant, so null is the honest result (better than picking a label).
    expect(parsePlainText(invoice, 'ocr').merchant).toBeNull();
  });
});

describe('parsePlainText — merchant skips placeholders and labels', () => {
  it('skips "Your Logo" / "Nombre de la empresa" placeholders', () => {
    const text = [
      'Your Logo',
      'Nombre de la empresa',
      'Calle principal 123',
      'Cafeteria La Esquina',
      'TOTAL A PAGAR 50.00',
    ].join('\n');
    expect(parsePlainText(text, 'ocr').merchant).toBe('Cafeteria La Esquina');
  });
});

describe('parsePlainText — real noisy OCR (dropped/spaced decimals)', () => {
  // Reproduces the ACTUAL tesseract output for a blank invoice template: OCR
  // split "SUBTOTAL" into "SUB TOTAL", dropped decimal points ("125 00",
  // "475"), and mangled the date ("02.1516"). See the bug report.
  const ocr = [
    '» FACTURA',
    'RNA 10000* 02.1516',
    'Artico 1 25 00',
    'JbservacionesInstiLccioTeS. SUB TOTAL 125 00',
    'IMPUESTOS (3 8 %) 475',
    'ENVIO/MANIPULACIÓN 10.00',
    'DESCUENTO 25 00',
    'GRACIAS TOTAL $ 114.75',
  ].join('\n');

  it('recovers subtotal from OCR-split "SUB TOTAL 125 00" -> 125', () => {
    expect(parsePlainText(ocr, 'ocr').subtotal).toBe(125);
  });

  it('reads the real total "TOTAL $ 114.75" -> 114.75', () => {
    expect(parsePlainText(ocr, 'ocr').total).toBe(114.75);
  });

  it('recovers a dropped-decimal tax "475" -> 4.75 (tax > subtotal heuristic)', () => {
    expect(parsePlainText(ocr, 'ocr').tax).toBe(4.75);
  });

  it('returns null date for the garbled "02.1516" instead of NaN/garbage', () => {
    expect(parsePlainText(ocr, 'ocr').receiptDate).toBeNull();
  });

  it('does not pick a garbled header/placeholder as a clean merchant', () => {
    const merchant = parsePlainText(ocr, 'ocr').merchant;
    // Whatever it picks (or null), it must not be a label header line.
    if (merchant !== null) {
      expect(merchant).not.toMatch(/factura|fecha|total|subtotal/i);
    }
  });
});

describe('parsePlainText — spaced-decimal repair does not corrupt clean amounts', () => {
  it('keeps a normal "TOTAL A PAGAR 116.00" intact', () => {
    expect(parsePlainText('TIENDA\nTOTAL A PAGAR 116.00', 'ocr').total).toBe(116);
  });

  it('does not divide a legitimate tax that is below subtotal', () => {
    const text = 'TIENDA\nSUBTOTAL 100.00\nIVA 16.00\nTOTAL A PAGAR 116.00';
    expect(parsePlainText(text, 'ocr').tax).toBe(16);
  });
});

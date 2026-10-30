import { describe, it, expect, afterEach } from 'vitest';
import { analyzePdf, receiptMessage, type PdfReaders } from './receipt.service.js';

// Issue #16: PDF receipts. A PDF is either digital (embedded text) or a scan
// (page images only). These tests inject the two readers, so the decision logic
// is verified without poppler/tesseract being installed.

const DIGITAL = ['SUPER MERCADO EL SOL', 'Fecha: 14/02/2026', 'SUBTOTAL 73.50', 'IVA 11.76', 'TOTAL A PAGAR 85.26'].join('\n');
const SCANNED = ['CAFETERIA LA ESQUINA', 'Date: 02 June, 2030', 'SUBTOTAL 90.00', 'TAX 10.00', 'TOTAL 100.00'].join('\n');

function readers(embedded: string | null, ocr: string | (() => Promise<string>)): PdfReaders & { ocrCalls: number } {
  const state = { ocrCalls: 0 };
  return {
    extractText: () => embedded,
    ocr: async () => {
      state.ocrCalls += 1;
      return typeof ocr === 'function' ? ocr() : ocr;
    },
    get ocrCalls() { return state.ocrCalls; },
  } as PdfReaders & { ocrCalls: number };
}

describe('analyzePdf — digital PDF (embedded text)', () => {
  it('uses the embedded text and never runs OCR when a total is found', async () => {
    const r = readers(DIGITAL, SCANNED);
    const parsed = await analyzePdf('/x.pdf', r);
    expect(parsed.sourceType).toBe('pdf_text');
    expect(parsed.total).toBe(85.26);
    expect(r.ocrCalls).toBe(0);
  });
});

describe('analyzePdf — scanned PDF (no text layer)', () => {
  it('falls back to OCR when pdftotext returns nothing', async () => {
    const r = readers(null, SCANNED);
    const parsed = await analyzePdf('/x.pdf', r);
    expect(parsed.sourceType).toBe('pdf_ocr');
    expect(parsed.total).toBe(100);
    expect(parsed.receiptDate).toBe('2030-06-02');
    expect(r.ocrCalls).toBe(1);
  });

  it('falls back to OCR when the text layer is only whitespace', async () => {
    const parsed = await analyzePdf('/x.pdf', readers('  \n \n', SCANNED));
    expect(parsed.sourceType).toBe('pdf_ocr');
    expect(parsed.total).toBe(100);
  });

  it('prefers OCR when the embedded text has no recognizable total', async () => {
    // e.g. a scan that carries only a stray header/footer text layer.
    const parsed = await analyzePdf('/x.pdf', readers('Page 1 of 1 — confidential', SCANNED));
    expect(parsed.sourceType).toBe('pdf_ocr');
    expect(parsed.total).toBe(100);
  });

  it('caps OCR confidence below digital-text confidence', async () => {
    const digital = await analyzePdf('/x.pdf', readers(SCANNED, ''));
    const scanned = await analyzePdf('/x.pdf', readers(null, SCANNED));
    expect(digital.sourceType).toBe('pdf_text');
    expect(scanned.confidence).toBeLessThanOrEqual(0.85);
    expect(scanned.confidence).toBeLessThan(digital.confidence);
  });
});

describe('analyzePdf — nothing usable', () => {
  it('keeps embedded text (editable by hand) when neither source finds a total', async () => {
    const parsed = await analyzePdf('/x.pdf', readers('Some text with no amounts', 'also nothing'));
    expect(parsed.sourceType).toBe('pdf_text');
    expect(parsed.total).toBeNull();
    expect(parsed.rawText).toContain('Some text');
  });

  it('returns the OCR text when only OCR produced anything', async () => {
    const parsed = await analyzePdf('/x.pdf', readers(null, 'blurry words but no amount'));
    expect(parsed.sourceType).toBe('pdf_ocr');
    expect(parsed.total).toBeNull();
  });

  it('throws a clear error when the PDF has no text and cannot be OCR-ed', async () => {
    await expect(analyzePdf('/x.pdf', readers(null, ''))).rejects.toThrow(/pdf/i);
  });

  it('treats an OCR failure as "no text" instead of crashing', async () => {
    const parsed = await analyzePdf('/x.pdf', readers(DIGITAL.replace('TOTAL A PAGAR 85.26', 'no total here'), () => Promise.reject(new Error('worker crashed'))));
    // Falls back to the embedded text rather than surfacing the OCR crash.
    expect(parsed.sourceType).toBe('pdf_text');
  });

  it('surfaces the unreadable-PDF error when OCR crashes and there is no text layer', async () => {
    await expect(analyzePdf('/x.pdf', readers(null, () => Promise.reject(new Error('boom'))))).rejects.toThrow(/pdf/i);
  });
});

describe('receipt error messages follow DEFAULT_LOCALE', () => {
  const original = process.env['DEFAULT_LOCALE'];
  afterEach(() => {
    if (original === undefined) delete process.env['DEFAULT_LOCALE'];
    else process.env['DEFAULT_LOCALE'] = original;
  });

  it('is English by default and Spanish when the host chooses es', () => {
    delete process.env['DEFAULT_LOCALE'];
    expect(receiptMessage('pdfUnreadable')).toMatch(/Could not read this PDF/);
    process.env['DEFAULT_LOCALE'] = 'es';
    expect(receiptMessage('pdfUnreadable')).toMatch(/No se pudo leer el PDF/);
    expect(receiptMessage('fileNotFound')).toBe('Archivo no encontrado');
  });
});

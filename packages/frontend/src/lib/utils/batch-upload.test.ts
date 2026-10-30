import { describe, it, expect, vi } from 'vitest';
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_ACCEPT,
  rejectReason,
  createBatch,
  runBatch,
  countDone,
  isBusy,
} from './batch-upload';

// Issue #17: drag & drop / multi-select receipt upload. The queue rules mirror
// what the backend enforces, so a bad file is explained up front instead of
// failing after the upload.

const file = (name: string, type: string, size = 1000): File => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('rejectReason', () => {
  it('accepts images, PDF and XML by MIME type', () => {
    for (const [n, t] of [
      ['a.jpg', 'image/jpeg'], ['a.png', 'image/png'], ['a.webp', 'image/webp'], ['a.gif', 'image/gif'],
      ['a.pdf', 'application/pdf'], ['a.xml', 'application/xml'], ['a.xml', 'text/xml'],
    ] as const) {
      expect(rejectReason(file(n, t)), n).toBeNull();
    }
  });

  it('accepts a known extension when the browser reports no MIME type (typical for .xml)', () => {
    expect(rejectReason(file('factura.xml', ''))).toBeNull();
    expect(rejectReason(file('scan.PDF', ''))).toBeNull();
  });

  it('rejects other file types', () => {
    expect(rejectReason(file('notes.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).toBe('type');
    expect(rejectReason(file('archive.zip', 'application/zip'))).toBe('type');
    expect(rejectReason(file('weird.exe', ''))).toBe('type');
  });

  it('does not trust a known extension when the browser reports a different real type', () => {
    expect(rejectReason(file('totally-a.pdf', 'application/zip'))).toBe('type');
  });

  it('rejects files over the 10 MB limit and empty files', () => {
    expect(rejectReason(file('big.pdf', 'application/pdf', MAX_UPLOAD_BYTES + 1))).toBe('size');
    expect(rejectReason(file('ok.pdf', 'application/pdf', MAX_UPLOAD_BYTES))).toBeNull();
    expect(rejectReason(file('empty.pdf', 'application/pdf', 0))).toBe('empty');
  });

  it('exposes an accept string covering every allowed type', () => {
    expect(UPLOAD_ACCEPT).toContain('application/pdf');
    expect(UPLOAD_ACCEPT).toContain('.xml');
    expect(UPLOAD_ACCEPT).toContain('image/png');
  });
});

describe('createBatch', () => {
  it('queues valid files and keeps rejected ones with their reason', () => {
    const items = createBatch([
      file('a.jpg', 'image/jpeg'),
      file('b.docx', 'application/msword'),
      file('c.pdf', 'application/pdf', MAX_UPLOAD_BYTES + 5),
    ]);
    expect(items.map((i) => i.status)).toEqual(['queued', 'rejected', 'rejected']);
    expect(items[1]!.reason).toBe('type');
    expect(items[2]!.reason).toBe('size');
    expect(new Set(items.map((i) => i.id)).size).toBe(3); // unique ids for keyed rendering
  });
});

describe('runBatch', () => {
  it('uploads then analyzes every queued file, in order', async () => {
    const order: string[] = [];
    const items = createBatch([file('a.jpg', 'image/jpeg'), file('b.pdf', 'application/pdf')]);
    await runBatch(items, {
      upload: async (f) => { order.push(`up:${f.name}`); return { id: f.name === 'a.jpg' ? 1 : 2 }; },
      analyze: async (id) => { order.push(`an:${id}`); },
    });
    expect(order).toEqual(['up:a.jpg', 'an:1', 'up:b.pdf', 'an:2']);
    expect(items.map((i) => i.status)).toEqual(['done', 'done']);
    expect(countDone(items)).toBe(2);
  });

  it('skips rejected files without sending them', async () => {
    const upload = vi.fn(async () => ({ id: 1 }));
    const items = createBatch([file('bad.zip', 'application/zip'), file('ok.png', 'image/png')]);
    await runBatch(items, { upload, analyze: async () => {} });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(items[0]!.status).toBe('rejected');
    expect(items[1]!.status).toBe('done');
  });

  it('keeps going after an upload failure and records the error', async () => {
    const items = createBatch([file('a.jpg', 'image/jpeg'), file('b.jpg', 'image/jpeg'), file('c.jpg', 'image/jpeg')]);
    await runBatch(items, {
      upload: async (f) => { if (f.name === 'b.jpg') throw new Error('disk full'); return { id: 7 }; },
      analyze: async () => {},
    });
    expect(items.map((i) => i.status)).toEqual(['done', 'failed', 'done']);
    expect(items[1]!.error).toBe('disk full');
  });

  it('marks analysis failures separately: the file is saved and can be re-analyzed later', async () => {
    const analyze = vi.fn(async () => { throw new Error('OCR found no text'); });
    const items = createBatch([file('blurry.jpg', 'image/jpeg')]);
    await runBatch(items, { upload: async () => ({ id: 3 }), analyze });
    expect(items[0]!.status).toBe('analysis_failed');
    expect(items[0]!.error).toBe('OCR found no text');
    expect(countDone(items)).toBe(0);
  });

  it('handles a large batch and reports progress through item state', async () => {
    const items = createBatch(Array.from({ length: 12 }, (_, i) => file(`r${i}.jpg`, 'image/jpeg')));
    let maxInFlight = 0;
    let inFlight = 0;
    await runBatch(items, {
      upload: async () => { inFlight++; maxInFlight = Math.max(maxInFlight, inFlight); await Promise.resolve(); inFlight--; return { id: 1 }; },
      analyze: async () => {},
    });
    expect(countDone(items)).toBe(12);
    expect(maxInFlight).toBe(1); // strictly sequential: OCR is CPU-heavy
  });
});

describe('isBusy', () => {
  it('is true while work remains and false once everything is final', async () => {
    const items = createBatch([file('a.jpg', 'image/jpeg')]);
    expect(isBusy(items)).toBe(true);
    await runBatch(items, { upload: async () => ({ id: 1 }), analyze: async () => {} });
    expect(isBusy(items)).toBe(false);
  });

  it('is false for a batch of only rejected files', () => {
    expect(isBusy(createBatch([file('x.zip', 'application/zip')]))).toBe(false);
  });
});

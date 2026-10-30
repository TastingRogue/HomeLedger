import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Recibos from './+page.svelte';

vi.mock('$app/environment', () => ({ browser: true }));

// Issue #17: drag & drop (and multi-select) upload on the receipts page.
const analyzeAttachment = vi.fn();
const uploadAttachment = vi.fn();
vi.mock('$lib/api/receipts', () => ({
  analyzeAttachment: (...a: unknown[]) => analyzeAttachment(...a),
  listReceipts: vi.fn(() => Promise.resolve([])),
  updateReceipt: vi.fn(),
  setReceiptItemCategory: vi.fn(),
  createTransactionFromReceipt: vi.fn(),
}));
vi.mock('$lib/api/attachments', () => ({
  listAttachments: vi.fn(() => Promise.resolve([])),
  uploadAttachment: (...a: unknown[]) => uploadAttachment(...a),
  previewAttachmentUrl: vi.fn(() => Promise.resolve('blob:x')),
  downloadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
}));
vi.mock('$lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/api/client')>();
  return {
    ...actual,
    apiGet: vi.fn(() => Promise.resolve([])),
    apiPost: vi.fn(() => Promise.resolve({ id: 1 })),
  };
});

const makeFile = (name: string, type: string, size = 1000): File => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

/** Dispatches a drag event on window carrying files (jsdom has no DataTransfer). */
function dragEvent(type: 'dragenter' | 'dragover' | 'dragleave' | 'drop', files: File[] = [makeFile('x.jpg', 'image/jpeg')]) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'dataTransfer', { value: { types: ['Files'], files, dropEffect: 'none' } });
  window.dispatchEvent(ev);
  return ev;
}

describe('receipts drag & drop upload (#17)', () => {
  beforeEach(() => {
    uploadAttachment.mockReset();
    analyzeAttachment.mockReset();
    let id = 100;
    uploadAttachment.mockImplementation(async () => ({ id: ++id }));
    analyzeAttachment.mockResolvedValue({});
  });

  it('uploads and analyzes every file dropped at once', async () => {
    render(Recibos);
    await screen.findByRole('button', { name: /subir|upload/i });

    dragEvent('drop', [makeFile('a.jpg', 'image/jpeg'), makeFile('b.pdf', 'application/pdf'), makeFile('c.png', 'image/png')]);

    await waitFor(() => expect(uploadAttachment).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(analyzeAttachment).toHaveBeenCalledTimes(3));
    // Unlinked uploads: no transaction link argument.
    expect(uploadAttachment.mock.calls.map((c) => (c[0] as File).name)).toEqual(['a.jpg', 'b.pdf', 'c.png']);
    expect(await screen.findByText('3 of 3 processed')).toBeInTheDocument();
  });

  it('shows skipped files with the reason and does not send them', async () => {
    render(Recibos);
    await screen.findByRole('button', { name: /subir|upload/i });

    dragEvent('drop', [makeFile('notes.docx', 'application/msword'), makeFile('huge.pdf', 'application/pdf', 11 * 1024 * 1024), makeFile('ok.jpg', 'image/jpeg')]);

    await waitFor(() => expect(uploadAttachment).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('File type not allowed')).toBeInTheDocument();
    expect(screen.getByText('Larger than 10 MB')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 processed')).toBeInTheDocument();
  });

  it('keeps going and reports it when one file fails to upload', async () => {
    uploadAttachment.mockImplementation(async (f: File) => {
      if (f.name === 'bad.jpg') throw new Error('disk full');
      return { id: 1 };
    });
    render(Recibos);
    await screen.findByRole('button', { name: /subir|upload/i });

    dragEvent('drop', [makeFile('a.jpg', 'image/jpeg'), makeFile('bad.jpg', 'image/jpeg'), makeFile('c.jpg', 'image/jpeg')]);

    expect(await screen.findByText('Upload failed')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('2 of 3 processed')).toBeInTheDocument());
  });

  it('shows the drop overlay while dragging files over the page and hides it on leave', async () => {
    render(Recibos);
    await screen.findByRole('button', { name: /subir|upload/i });
    expect(screen.queryByText(/drop your receipts/i)).not.toBeInTheDocument();

    dragEvent('dragenter');
    expect(await screen.findByText(/drop your receipts/i)).toBeInTheDocument();

    dragEvent('dragleave');
    await waitFor(() => expect(screen.queryByText(/drop your receipts/i)).not.toBeInTheDocument());
  });

  it('cancels the browser default on drop so the file is not opened in the tab', async () => {
    render(Recibos);
    await screen.findByRole('button', { name: /subir|upload/i });
    const ev = dragEvent('drop', [makeFile('a.jpg', 'image/jpeg')]);
    expect(ev.defaultPrevented).toBe(true);
    await waitFor(() => expect(uploadAttachment).toHaveBeenCalled());
  });

  it('ignores drags that are not files (e.g. selected text)', async () => {
    render(Recibos);
    await screen.findByRole('button', { name: /subir|upload/i });
    const ev = new Event('dragenter', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'dataTransfer', { value: { types: ['text/plain'], files: [] } });
    window.dispatchEvent(ev);
    expect(screen.queryByText(/drop your receipts/i)).not.toBeInTheDocument();
    expect(ev.defaultPrevented).toBe(false);
  });

  it('a file dropped on the open upload dialog fills it instead of starting a batch', async () => {
    render(Recibos);
    await fireEvent.click(await screen.findByRole('button', { name: /^(subir|upload)/i }));
    await screen.findByText(/take photo|tomar foto/i); // dialog is open

    dragEvent('drop', [makeFile('ticket.jpg', 'image/jpeg')]);

    expect(await screen.findByTitle('ticket.jpg')).toBeInTheDocument();
    expect(uploadAttachment).not.toHaveBeenCalled();
  });

  it('offers a multi-select picker for people who cannot drag and drop', async () => {
    render(Recibos);
    await screen.findByRole('button', { name: /subir|upload/i });
    const input = document.querySelector('input[type="file"][multiple]') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.getAttribute('accept')).toContain('application/pdf');
  });
});

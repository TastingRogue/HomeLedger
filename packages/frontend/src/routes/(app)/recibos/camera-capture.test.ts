import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Recibos from './+page.svelte';

vi.mock('$app/environment', () => ({ browser: true }));

// The receipts page loads data on mount via these modules; stub them so the
// component mounts cleanly and we can open the upload modal.
vi.mock('$lib/api/receipts', () => ({
  analyzeAttachment: vi.fn(),
  listReceipts: vi.fn(() => Promise.resolve([])),
  updateReceipt: vi.fn(),
  setReceiptItemCategory: vi.fn(),
  createTransactionFromReceipt: vi.fn(),
}));
const uploadAttachment = vi.fn();
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

describe('receipts camera capture (P4.14)', () => {
  beforeEach(() => {
    uploadAttachment.mockReset();
  });

  it('exposes a rear-camera capture input in the upload modal', async () => {
    render(Recibos);

    // Open the upload modal (button label from receipts.upload_* i18n).
    const openBtn = await screen.findByRole('button', { name: /subir|upload/i });
    await fireEvent.click(openBtn);

    // The "Take photo" capture input uses accept=image/* + capture=environment.
    const takePhoto = await screen.findByText(/tomar foto|take photo/i);
    expect(takePhoto).toBeInTheDocument();

    const captureInput = document.querySelector('input[capture="environment"]') as HTMLInputElement | null;
    expect(captureInput).not.toBeNull();
    expect(captureInput!.getAttribute('accept')).toContain('image/');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { preferences } from '$lib/stores/preferences';
import type { ImportPreview } from '$lib/api/backup';
import type { ImportPreview as BankPreview } from '$lib/api/imports';
import ImportPage from './+page.svelte';

const previewBackup = vi.hoisted(() => vi.fn());
const apiPost = vi.hoisted(() => vi.fn());
const bank = vi.hoisted(() => ({ upload: vi.fn(), preview: vi.fn(), confirm: vi.fn() }));
vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$lib/api/client', () => ({ apiPost }));
vi.mock('$lib/api/accounts', () => ({ listAccounts: vi.fn(async () => [{ id: 1, name: 'QA account' }]) }));
vi.mock('$lib/api/backup', () => ({ previewImport: previewBackup }));
vi.mock('$lib/api/imports', () => ({
  getImportHistory: vi.fn(async () => []), uploadImport: bank.upload,
  previewImport: bank.preview, confirmImport: bank.confirm, undoImport: vi.fn(),
}));

const payload = { version: '1.2.0', exportedAt: '2026-11-04T12:00:00Z', data: { accounts: [], transactions: [] } };
const preview: ImportPreview = { version: '1.2.0', exportedAt: payload.exportedAt, backupCounts: {}, currentCounts: {}, warnings: [] };
function jsonFile(value: unknown = payload, name = 'test-backup.json') {
  const file = new File([JSON.stringify(value)], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: async () => JSON.stringify(value) });
  return file;
}
function deferredPreview<T = ImportPreview>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

describe('JSON restore review', () => {
  beforeEach(() => {
    preferences.set({ locale: 'en', currency: 'MXN' });
    previewBackup.mockReset();
    apiPost.mockReset().mockResolvedValue({ message: 'Restored' });
    bank.upload.mockReset(); bank.preview.mockReset(); bank.confirm.mockReset();
  });

  it('warns about replacement and waits for server validation before enabling restore', async () => {
    const pending = deferredPreview();
    previewBackup.mockReturnValue(pending.promise);
    const { container } = render(ImportPage);
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    await fireEvent.change(input, { target: { files: [jsonFile()] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('All your current data will be replaced.');
    const restore = screen.getByRole('button', { name: 'Import Backup' });
    expect(restore).toBeDisabled();
    expect(apiPost).not.toHaveBeenCalled();
    pending.resolve(preview);
    await waitFor(() => expect(restore).toBeEnabled());
    expect(screen.getByText('📊 Content summary')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.queryByText('Resumen del contenido')).not.toBeInTheDocument();
    await fireEvent.click(restore);
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/backup/import', { backup: payload, confirmed: true }));
  });

  it('blocks restoration when server validation fails', async () => {
    previewBackup.mockRejectedValue(new Error('Unsupported backup version'));
    const { container } = render(ImportPage);
    await fireEvent.change(container.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [jsonFile()] } });
    expect(await screen.findByText('Unsupported backup version')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import Backup' })).toBeDisabled();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('does not let an earlier file validation authorize a newly selected file', async () => {
    const first = deferredPreview(), second = deferredPreview();
    previewBackup.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { container } = render(ImportPage);
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    await fireEvent.change(input, { target: { files: [jsonFile(payload, 'first.json')] } });
    await waitFor(() => expect(previewBackup).toHaveBeenCalledTimes(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    const secondPayload = { ...payload, data: { accounts: [{ id: 2 }], transactions: [] } };
    await fireEvent.change(container.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [jsonFile(secondPayload, 'second.json')] } });
    await waitFor(() => expect(previewBackup).toHaveBeenCalledTimes(2));
    first.resolve(preview);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Import Backup' })).toBeDisabled());
    expect(apiPost).not.toHaveBeenCalled();
    second.resolve(preview);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Import Backup' })).toBeEnabled());
    await fireEvent.click(screen.getByRole('button', { name: 'Import Backup' }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/backup/import', { backup: secondPayload, confirmed: true }));
  });

  it('ignores a stale bank preview and confirms only the current file session', async () => {
    const first = deferredPreview<BankPreview>(), second = deferredPreview<BankPreview>();
    bank.upload.mockResolvedValueOnce({ id: 11 }).mockResolvedValueOnce({ id: 22 });
    bank.preview.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    bank.confirm.mockResolvedValue({ sessionId: 22, importedCount: 1, matchedCount: 0, duplicateCount: 0, skippedCount: 0, transactions: [] });
    const makePreview = (id: number, name: string): BankPreview => ({
      sessionId: id, filename: name + '.csv', parser: 'generic', format: 'csv', detectedAccountId: 1,
      totalCount: 1, duplicateCount: 0, pendingMatchCount: 0, newCount: 1,
      transactions: [{ index: 0, date: '2026-11-04', normalizedDate: '2026-11-04', description: name, normalizedMerchant: name, amount: 10, type: 'expense', status: 'new' }],
    });
    const { container } = render(ImportPage);
    await fireEvent.change(container.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [new File(['csv'], 'old.csv')] } });
    await waitFor(() => expect(bank.preview).toHaveBeenCalledWith(11));
    await fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    await fireEvent.change(container.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [new File(['csv'], 'current.csv')] } });
    await waitFor(() => expect(bank.preview).toHaveBeenCalledWith(22));
    first.resolve(makePreview(11, 'Old movement'));
    await waitFor(() => expect(screen.getByRole('button', { name: /Importing|Confirm import/ })).toBeDisabled());
    expect(screen.queryByText('Old movement')).not.toBeInTheDocument();
    second.resolve(makePreview(22, 'Current movement'));
    expect(await screen.findByText('Current movement')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm import' }));
    await waitFor(() => expect(bank.confirm).toHaveBeenCalledWith(22, { accountId: 1, selectedTransactionIds: [0] }));
  });
});

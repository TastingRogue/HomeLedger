import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { ApiError } from '$lib/api/client';
import BackupPage from './+page.svelte';

vi.mock('$app/environment', () => ({ browser: true }));

// Instant, no-op transitions so the confirm dialog mounts/unmounts synchronously.
vi.mock('$lib/motion', () => ({
  modalPanel: () => ({ duration: 0, css: () => '' }),
  scrim: () => ({ duration: 0, css: () => '' }),
}));

const exportBackup = vi.fn();
const importBackup = vi.fn();
const getBackupHistory = vi.fn();
const previewImport = vi.fn();
vi.mock('$lib/api/backup', () => ({
  exportBackup: (...a: unknown[]) => exportBackup(...a),
  importBackup: (...a: unknown[]) => importBackup(...a),
  getBackupHistory: (...a: unknown[]) => getBackupHistory(...a),
  previewImport: (...a: unknown[]) => previewImport(...a),
}));

// Read a File's text via the component's FileReader path. jsdom's FileReader
// works, but File.text() is simpler for our mock backups.
function backupFile(obj: unknown) {
  return new File([JSON.stringify(obj)], 'backup.json', { type: 'application/json' });
}

describe('backup page', () => {
  beforeEach(() => {
    exportBackup.mockReset();
    importBackup.mockReset();
    getBackupHistory.mockReset();
    previewImport.mockReset();
    getBackupHistory.mockResolvedValue([]);

    // jsdom lacks object-URL + anchor download plumbing used by export.
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('renders the export and import actions and an empty history', async () => {
    render(BackupPage);
    expect(await screen.findByRole('button', { name: /export|exportar/i })).toBeInTheDocument();
    // Import is a <label for="file-input"> styled as a button.
    expect(screen.getByText(/import|importar/i)).toBeInTheDocument();
    await waitFor(() => expect(getBackupHistory).toHaveBeenCalled());
  });

  it('exports a backup: calls the API, builds a blob URL, and shows success', async () => {
    exportBackup.mockResolvedValue({ meta: { version: 1 }, accounts: [] });
    render(BackupPage);

    await fireEvent.click(await screen.findByRole('button', { name: /export|exportar/i }));

    await waitFor(() => expect(exportBackup).toHaveBeenCalledTimes(1));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });

  it('shows an error when export fails', async () => {
    exportBackup.mockRejectedValue(new ApiError(500, 'ERR', 'Export blew up'));
    render(BackupPage);

    await fireEvent.click(await screen.findByRole('button', { name: /export|exportar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/export blew up/i);
  });

  it('selecting a file opens the confirm dialog with a dry-run preview', async () => {
    previewImport.mockResolvedValue({
      backupCounts: { accounts: 2, transactions: 5 },
      currentCounts: { accounts: 1, transactions: 3 },
      warnings: ['Se reemplazarán los datos actuales'],
    });
    render(BackupPage);
    await screen.findByRole('button', { name: /export|exportar/i });

    const input = document.getElementById('file-input') as HTMLInputElement;
    await fireEvent.change(input, { target: { files: [backupFile({ accounts: [] })] } });

    // Dialog appears once the preview resolves.
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await waitFor(() => expect(previewImport).toHaveBeenCalled());
    // The dry-run warning we supplied is rendered (prefixed with a ⚠ marker).
    expect(screen.getByText(/Se reemplazarán los datos actuales/)).toBeInTheDocument();
    // And the backup vs. current counts are shown.
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('confirming the import calls importBackup and reloads history', async () => {
    previewImport.mockResolvedValue({ backupCounts: {}, currentCounts: {}, warnings: [] });
    importBackup.mockResolvedValue({ message: 'Importado' });
    render(BackupPage);
    await screen.findByRole('button', { name: /export|exportar/i });

    const input = document.getElementById('file-input') as HTMLInputElement;
    await fireEvent.change(input, { target: { files: [backupFile({ accounts: [] })] } });
    await screen.findByRole('dialog');

    // getBackupHistory called once on mount; import triggers a reload.
    getBackupHistory.mockClear();
    await fireEvent.click(screen.getByRole('button', { name: /confirm|confirmar/i }));

    await waitFor(() => expect(importBackup).toHaveBeenCalledTimes(1));
    expect(importBackup.mock.calls[0][1]).toBe(true); // destructive replace flag
    await waitFor(() => expect(getBackupHistory).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent(/importado/i);
  });

  it('cancelling the import closes the dialog without importing', async () => {
    previewImport.mockResolvedValue({ backupCounts: {}, currentCounts: {}, warnings: [] });
    render(BackupPage);
    await screen.findByRole('button', { name: /export|exportar/i });

    const input = document.getElementById('file-input') as HTMLInputElement;
    await fireEvent.change(input, { target: { files: [backupFile({ accounts: [] })] } });
    await screen.findByRole('dialog');

    await fireEvent.click(screen.getByRole('button', { name: /cancel|cancelar/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(importBackup).not.toHaveBeenCalled();
  });
});

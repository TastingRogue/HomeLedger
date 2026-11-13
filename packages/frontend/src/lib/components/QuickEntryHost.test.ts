import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import { page } from '$app/state';
import { goto } from '$app/navigation';
import { setUiSkin } from '#lib/stores/theme.ts';
import QuickEntryHost from './QuickEntryHost.svelte';

vi.mock('$app/env', () => ({ browser: true }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', async () => {
  return { page: { url: new URL('http://localhost/cuentas') } };
});
vi.mock('#lib/api/client.ts', async importOriginal => ({
  ...await importOriginal<typeof import('#lib/api/client.ts')>(),
  apiGet: vi.fn().mockResolvedValue([]), apiPost: vi.fn(),
}));

function setPath(path: string) {
  (page as unknown as { url: URL }).url = new URL(path, 'http://localhost');
}
beforeEach(() => {
  vi.clearAllMocks();
  setUiSkin('normal');
  setPath('/cuentas');
  HTMLDialogElement.prototype.showModal = vi.fn();
});

describe('quick entry popup navigation', () => {
  it('opens above the current view, then closes without navigating and restores focus', async () => {
    const anchor = document.createElement('a');
    anchor.href = '/registro-rapido'; anchor.textContent = 'Quick entry';
    document.body.append(anchor);
    try {
      render(QuickEntryHost);
      anchor.focus();
      await fireEvent.click(anchor);
      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
      expect(page.url.pathname).toBe('/cuentas');
      await fireEvent.click(screen.getAllByRole('button', { name: /close/i, hidden: true })[0]);
      await waitFor(() => expect(document.querySelector('dialog')).toBeNull());
      expect(goto).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(anchor);
      expect(document.body.style.overflow).toBe('');
    } finally { anchor.remove(); }
  });

  it('opens direct links as a popup and returns to dashboard on Escape', async () => {
    setPath('/registro-rapido');
    render(QuickEntryHost);
    const dialog = document.querySelector('dialog');
    expect(dialog).not.toBeNull();
    if (!dialog) throw new Error('Missing quick entry dialog');
    await fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(goto).toHaveBeenCalledWith('/dashboard', { replace: true });
  });
});

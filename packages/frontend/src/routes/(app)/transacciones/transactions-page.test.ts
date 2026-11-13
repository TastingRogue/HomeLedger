import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { preferences } from '#lib/stores/preferences.ts';
import TransactionsPage from './+page.svelte';

const state = vi.hoisted(() => ({ composed: false, deleted: false, failDelete: false }));
const apiDelete = vi.hoisted(() => vi.fn());
vi.mock('$app/env', () => ({ browser: true }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('#lib/themes/view-actions.ts', () => ({ hasViewActions: () => state.composed }));
vi.mock('#lib/motion/index.ts', () => ({
  modalPanel: () => ({ duration: 0, css: () => '' }),
  scrim: () => ({ duration: 0, css: () => '' }),
}));
vi.mock('#lib/api/client.ts', async importOriginal => {
  const original = await importOriginal<typeof import('#lib/api/client.ts')>();
  return {
    ...original,
    apiDelete,
    apiGet: vi.fn(async (url: string) => {
      if (url === '/accounts') return [{ id: 1, name: 'Test account' }];
      if (url === '/categories') return [{ id: 1, name: 'Groceries' }];
      if (url === '/transactions') {
        const items = state.deleted ? [] : [{
          id: 7, name: 'Deletion regression fixture', amount: 30, type: 'Gasto',
          date: new Date().toISOString(), accountId: 1, categoryId: 1,
          accountName: 'Test account', categoryName: 'Groceries',
          status: 'posted', reconciled: false,
        }];
        return { items, total: items.length, page: 1, pageSize: 20, totalPages: 1 };
      }
      throw new Error(`Unexpected API request: ${url}`);
    }),
  };
});

describe('transaction deletion', () => {
  beforeEach(() => {
    state.deleted = false;
    state.failDelete = false;
    preferences.set({ locale: 'en', currency: 'MXN' });
    apiDelete.mockReset().mockImplementation(async () => {
      if (state.failDelete) throw new Error('Offline');
      state.deleted = true;
    });
  });

  it.each([false, true])('reloads after confirming deletion from the detail popup (composed=%s)', async composed => {
    state.composed = composed;
    render(TransactionsPage);
    await fireEvent.click(await screen.findByRole('button', { name: /Deletion regression fixture/i }));
    await fireEvent.click(screen.getByRole('button', { name: '✕ Delete' }));
    await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Delete$/ }));
    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/transactions/7'));
    await waitFor(() => expect(screen.queryByText('Deletion regression fixture')).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the transaction visible when deletion fails', async () => {
    state.composed = true;
    state.failDelete = true;
    render(TransactionsPage);
    await fireEvent.click(await screen.findByRole('button', { name: /Deletion regression fixture/i }));
    await fireEvent.click(screen.getByRole('button', { name: '✕ Delete' }));
    await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Delete$/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Deletion regression fixture')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not delete. Please try again.');
    expect(state.deleted).toBe(false);
  });
});

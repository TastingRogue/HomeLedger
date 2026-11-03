import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import Harness from './DashboardHarness.test.svelte';
import { apiGet, apiPost } from '$lib/api/client';
import { setLocale } from '$lib/stores/preferences';
vi.mock('$app/environment', () => ({ browser: false }));
vi.mock('$app/stores', () => ({ page: writable({ url: new URL('http://localhost/dashboard') }) }));
vi.mock('$lib/api/client', () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn(), apiUpload: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks(); setLocale('en');
  vi.mocked(apiGet).mockImplementation(async path => {
    if (path === '/reports/dashboard') return { monthlySummary: { totalIncome: 500, totalExpenses: 200 } };
    if (path === '/accounts') return [{ id: 1, name: 'Main account', type: 'Débito', calculatedBalance: 300 }];
    if (path === '/categories') return [{ id: 2, name: 'Salary', type: 'Ingreso' }];
    if (path === '/transactions') return { items: [] };
    if (path === '/reports/trends') return { entries: [] };
    return [];
  });
});
describe('Cyberpunk dashboard functional parity', () => {
  it('shows original dashboard sections and actions by default, without Tools', async () => {
    render(Harness);
    expect(await screen.findByRole('button', { name: 'Add Expense' })).toBeVisible();
    for (const name of ['Add Income', 'Transfer', 'Add Goal', 'Attach Receipt']) expect(screen.getByRole('button', { name })).toBeVisible();
    for (const name of ['Upcoming Payments', 'Important Alerts', 'Accounts', 'Recent Transactions', 'Budgets', 'Goals', 'Transfers']) expect(screen.getByRole('heading', { name })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Tools' })).not.toBeInTheDocument();
  });
  it('retains quick income saving in the default dashboard', async () => {
    const { container } = render(Harness);
    await fireEvent.click(await screen.findByRole('button', { name: 'Add Income' }));
    expect(screen.getByRole('button', { name: 'Register Income' })).toBeVisible();
    await fireEvent.input(screen.getByLabelText('Source'), { target: { value: 'Test salary' } });
    await fireEvent.input(screen.getByLabelText('Amount'), { target: { value: '125' } });
    const form = container.querySelector('.modal-form');
    if (!form) throw new Error('Quick income form missing');
    await fireEvent.submit(form);
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/transactions', expect.objectContaining({ name: 'Test salary', amount: 125, accountId: 1, categoryId: 2, type: 'Ingreso' })));
  });
});

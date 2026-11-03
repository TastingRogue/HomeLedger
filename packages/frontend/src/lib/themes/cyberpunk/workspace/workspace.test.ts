import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { buildModel, emptyData, loadWorkspace, type Actions } from './model';
import Daily from './Daily.svelte';
import Operations from './Operations.svelte';
import Editor from './Editor.svelte';
import { apiGet, apiPost } from '$lib/api/client';
vi.mock('$lib/api/client', () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn() }));
const a: Actions = { edit: vi.fn(), manage: vi.fn(), refresh: vi.fn().mockResolvedValue(undefined), notify: vi.fn() };
function model(route: string) {
  const data = emptyData();
  data.accounts = [{ id: 1, name: 'Main account', type: 'Débito' }];
  data.categories = [{ id: 2, name: 'Groceries', type: 'Gasto' }];
  data.transactions = [{ id: 3, name: 'Weekly shop', amount: 42, type: 'Gasto', accountId: 1, categoryId: 2, date: '2026-11-01' }];
  return buildModel(data, route, 'en', 'MXN');
}
beforeEach(() => { vi.clearAllMocks(); vi.mocked(apiPost).mockResolvedValue({}); });
describe('theme compositions use shared financial workflows', () => {
  it('loads a loan schedule only after obtaining the actual loan id', async () => {
    vi.mocked(apiGet).mockImplementation(async path => path === '/loans' ? [{ id: 17, name: 'Car' }] : path === '/loans/17/schedule' ? [{ month: 1, remainingBalance: 200 }] : []);
    const data = await loadWorkspace('prestamos');
    expect(apiGet).toHaveBeenCalledWith('/loans/17/schedule');
    expect(data.schedule[0].remainingBalance).toBe(200);
  });
  it('filters transactions and passes the selected real record to the editor', async () => {
    render(Operations, { m: model('transacciones'), a });
    expect(screen.getByText('Weekly shop')).toBeInTheDocument();
    await fireEvent.input(screen.getByLabelText('Filter visible transactions'), { target: { value: 'missing' } });
    expect(screen.queryByText('Weekly shop')).not.toBeInTheDocument();
    await fireEvent.input(screen.getByLabelText('Filter visible transactions'), { target: { value: 'Weekly' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Weekly shop' }));
    expect(a.edit).toHaveBeenCalledWith('transactions', expect.objectContaining({ id: 3 }));
  });
  it('saves quick entry with the chosen category and account through the shared API', async () => {
    const { container } = render(Daily, { m: model('registro-rapido'), a });
    await fireEvent.input(screen.getByLabelText('Amount'), { target: { value: '123.45' } });
    await fireEvent.change(screen.getByLabelText('Account'), { target: { value: '1' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Groceries' }));
    await fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/transactions', expect.objectContaining({ amount: 123.45, accountId: 1, categoryId: 2, type: 'Gasto' })));
    expect(a.refresh).toHaveBeenCalled();
  });
  it('creates a prefilled new credit account rather than updating id zero', async () => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    const { container } = render(Editor, { entity: 'accounts', row: { id: 0, name: 'New card', type: 'Crédito', creditLimit: 5000 }, m: model('cuentas'), close: vi.fn(), saved: a.refresh });
    await fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/accounts', expect.objectContaining({ name: 'New card', creditLimit: 5000, type: 'Crédito' })));
  });
});

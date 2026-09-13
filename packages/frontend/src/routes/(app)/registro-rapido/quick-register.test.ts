import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { ApiError } from '$lib/api/client';
import QuickRegister from './+page.svelte';

vi.mock('$app/environment', () => ({ browser: true }));
const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => goto(...args) }));

// The page loads accounts+categories via apiGet on mount and submits via apiPost.
// Mock the client module, keep the real ApiError so the error branch is exercised.
const apiGet = vi.fn();
const apiPost = vi.fn();
vi.mock('$lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/api/client')>();
  return {
    ...actual,
    apiGet: (...args: unknown[]) => apiGet(...args),
    apiPost: (...args: unknown[]) => apiPost(...args),
  };
});

const ACCOUNTS = [
  { id: 1, name: 'Efectivo', type: 'Efectivo' },
  { id: 2, name: 'Débito', type: 'Débito' },
];
const CATEGORIES = [
  { id: 10, name: 'Comida', key: 'food' },
  { id: 11, name: 'Transporte', key: 'transport' },
];

function mockLoadOk() {
  apiGet.mockImplementation((path: string) => {
    if (path === '/accounts') return Promise.resolve(ACCOUNTS);
    if (path === '/categories') return Promise.resolve(CATEGORIES);
    return Promise.resolve([]);
  });
}

// Type an amount via the on-screen keypad.
async function typeAmount(digits: string) {
  for (const d of digits) {
    await fireEvent.click(screen.getByRole('button', { name: d }));
  }
}

describe('quick register (create transaction)', () => {
  beforeEach(() => {
    localStorage.clear();
    goto.mockReset();
    apiGet.mockReset();
    apiPost.mockReset();
  });

  it('shows the empty-state CTA when the user has no accounts', async () => {
    apiGet.mockImplementation((path: string) => {
      if (path === '/accounts') return Promise.resolve([]);
      return Promise.resolve(CATEGORIES);
    });
    render(QuickRegister);
    expect(await screen.findByRole('button', { name: /crear|create|cuenta|account/i })).toBeInTheDocument();
    // No keypad in the empty state.
    expect(screen.queryByRole('button', { name: '7' })).not.toBeInTheDocument();
  });

  it('blocks advancing past step 1 with an invalid (zero) amount', async () => {
    mockLoadOk();
    render(QuickRegister);
    // Wait for load — the "1" key appears once step 1 renders.
    await screen.findByRole('button', { name: '1' });

    await typeAmount('0');
    await fireEvent.click(screen.getByRole('button', { name: /siguiente|next/i }));

    // Still on step 1 (keypad visible), account selector not shown yet.
    expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument();
  });

  it('walks the 3-step flow and posts to /transactions/quick when no name is given', async () => {
    mockLoadOk();
    apiPost.mockResolvedValue({ id: 99 });
    render(QuickRegister);
    await screen.findByRole('button', { name: '1' });

    // Step 1: enter 150
    await typeAmount('150');
    await fireEvent.click(screen.getByRole('button', { name: /siguiente|next/i }));

    // Step 2: pick account + category
    await fireEvent.click(await screen.findByRole('option', { name: /Efectivo/i }));
    await fireEvent.click(screen.getByRole('option', { name: /Comida/i }));
    await fireEvent.click(screen.getByRole('button', { name: /siguiente|next/i }));

    // Step 3: confirm without a custom name
    await fireEvent.click(await screen.findByRole('button', { name: /registrar|register/i }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
    const [path, payload] = apiPost.mock.calls[0];
    expect(path).toBe('/transactions/quick');
    expect(payload).toMatchObject({
      amount: 150,
      accountId: 1,
      categoryId: 10,
      type: 'Gasto',
    });
    // Recent selections persisted for next time.
    expect(JSON.parse(localStorage.getItem('sf_recent_accounts')!)).toContain(1);
  });

  it('posts to /transactions (named endpoint) when a name is entered', async () => {
    mockLoadOk();
    apiPost.mockResolvedValue({ id: 1 });
    render(QuickRegister);
    await screen.findByRole('button', { name: '1' });

    await typeAmount('42');
    await fireEvent.click(screen.getByRole('button', { name: /siguiente|next/i }));
    await fireEvent.click(await screen.findByRole('option', { name: /Débito/i }));
    await fireEvent.click(screen.getByRole('option', { name: /Transporte/i }));
    await fireEvent.click(screen.getByRole('button', { name: /siguiente|next/i }));

    const nameInput = await screen.findByLabelText(/nombre|name/i);
    await fireEvent.input(nameInput, { target: { value: 'Uber' } });
    await fireEvent.click(screen.getByRole('button', { name: /registrar|register/i }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
    const [path, payload] = apiPost.mock.calls[0];
    expect(path).toBe('/transactions');
    expect(payload).toMatchObject({ name: 'Uber', amount: 42, accountId: 2, categoryId: 11 });
  });

  it('surfaces the API error message when the post fails', async () => {
    mockLoadOk();
    apiPost.mockRejectedValue(new ApiError(400, 'BAD', 'No se pudo guardar'));
    render(QuickRegister);
    await screen.findByRole('button', { name: '1' });

    await typeAmount('10');
    await fireEvent.click(screen.getByRole('button', { name: /siguiente|next/i }));
    await fireEvent.click(await screen.findByRole('option', { name: /Efectivo/i }));
    await fireEvent.click(screen.getByRole('option', { name: /Comida/i }));
    await fireEvent.click(screen.getByRole('button', { name: /siguiente|next/i }));
    await fireEvent.click(await screen.findByRole('button', { name: /registrar|register/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo guardar/i);
  });
});

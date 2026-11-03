import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import Planning from './Planning.svelte';
import { buildModel, emptyData } from './model';

describe('Cyberpunk budget allocations', () => {
  it.each([false, true])('shows tag allocations and rollover with category allocations: %s', mixed => {
    const data = emptyData();
    data.categories = [{ id: 1, name: 'Groceries' }];
    data.budgets = [{
      id: 1, name: 'Household', totalAllocated: mixed ? 300 : 200, totalSpent: mixed ? 90 : 50,
      categories: mixed ? [{ id: 1, categoryId: 1, allocated: 100, spent: 40, rollover: 0 }] : [],
      tags: [{ id: 2, tagId: 8, tagName: 'Home', allocated: 200, spent: 50, rollover: 25 }],
    }];
    render(Planning, {
      m: buildModel(data, 'presupuestos', 'en', 'USD'),
      a: { edit: vi.fn(), manage: vi.fn(), refresh: vi.fn(), notify: vi.fn() },
    });
    const tag = screen.getByRole('row', { name: /# Home/ });
    expect(within(tag).getByText('$200')).toBeInTheDocument();
    expect(within(tag).getByText('$50')).toBeInTheDocument();
    expect(within(tag).getByText('$175')).toBeInTheDocument();
    expect(screen.queryByText('Create a budget and assign money to your categories.')).not.toBeInTheDocument();
    const total = screen.getByRole('row', { name: /^Total / });
    expect(within(total).getByText(mixed ? '$235' : '$175')).toBeInTheDocument();
    if (mixed) expect(screen.getByRole('row', { name: /Groceries/ })).toBeInTheDocument();
  });
});

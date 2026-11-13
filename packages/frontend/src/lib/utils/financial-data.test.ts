import { describe, expect, it, vi } from 'vitest';
import { getTransactions } from '#lib/api/transactions.ts';
import { allTransactions, inBaseCurrency, inMonth } from './financial-data';
vi.mock('#lib/api/transactions.ts', () => ({ getTransactions: vi.fn() }));

describe('complete financial series', () => {
  it('loads all pages beyond the server cap and preserves every record', async () => {
    const transactions = Array.from({ length: 237 }, (_, i) => ({ id: i + 1, amount: 1 }));
    vi.mocked(getTransactions).mockImplementation(async filters => {
      const page = filters?.page ?? 1;
      return { items: transactions.slice((page - 1) * 100, page * 100), total: 237, page, pageSize: 100, totalPages: 3 } as Awaited<ReturnType<typeof getTransactions>>;
    });
    const result = await allTransactions();
    expect(result).toHaveLength(237);
    expect(new Set(result.map(row => row.id)).size).toBe(237);
    expect(result.reduce((sum, row) => sum + row.amount, 0)).toBe(237);
  });
  it('converts mixed currencies without mutating amounts used by editors', () => {
    const items = [{ amount: 100, accountId: 1 }, { amount: 100, accountId: 2 }];
    expect(inBaseCurrency(items, [{ id: 1, exchangeRate: 20 }, { id: 2, exchangeRate: 1 }]).map(row => row.amount)).toEqual([2000, 100]);
    expect(items[0].amount).toBe(100);
  });
  it('keeps civil dates in exactly one month, including leap days and boundaries', () => {
    expect(inMonth('2026-11-01', 2026, 10)).toBe(true);
    expect(inMonth('2026-11-30', 2026, 10)).toBe(true);
    expect(inMonth('2026-12-01', 2026, 10)).toBe(false);
    expect(inMonth('2026-11-01T00:00:00.000Z', 2026, 10)).toBe(true);
    expect(inMonth('2026-12-01T00:00:00.000Z', 2026, 10)).toBe(false);
    expect(inMonth('2028-02-29', 2028, 1)).toBe(true);
    expect(inMonth('invalid', 2026, 10)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { TransactionType, type Transaction } from '@homeledger/shared';
import { groupTransactionsByMonth } from './transaction-groups';

const transaction = (id: number, date: string, amount: number, type = TransactionType.Gasto) =>
  ({ id, date, amount, type }) as Transaction;

describe('transaction month groups', () => {
  it('keeps years separate, sorts newest first, and preserves row order', () => {
    const rows = [transaction(1, '2025-01-15T12:00:00', 20), transaction(2, '2026-01-15T12:00:00', 30), transaction(3, '2026-01-16T12:00:00', 10)];
    const groups = groupTransactionsByMonth(rows);
    expect(groups.map(g => g.key)).toEqual(['2026-01', '2025-01']);
    expect(groups[0]?.transactions.map(tx => tx.id)).toEqual([2, 3]);
    expect(groups[0]?.total).toBe(40);
    expect(rows.map(tx => tx.id)).toEqual([1, 2, 3]);
  });

  it('preserves expense-only table totals and income gallery totals', () => {
    const expense = transaction(1, '2026-01-15T12:00:00', 20);
    const income = transaction(2, '2026-01-16T12:00:00', 100, TransactionType.Ingreso);
    expect(groupTransactionsByMonth([expense, income], tx => tx.type === TransactionType.Gasto ? tx.amount : 0)[0]?.total).toBe(20);
    expect(groupTransactionsByMonth([income])[0]?.total).toBe(100);
    expect(groupTransactionsByMonth([])).toEqual([]);
  });
});

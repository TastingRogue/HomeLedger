import type { Transaction } from '@homeledger/shared';

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export interface MonthGroup {
  key: string;
  label: string;
  total: number;
  transactions: Transaction[];
}

/** Group local calendar months, newest first, without changing transaction order. */
export function groupTransactionsByMonth(
  transactions: Transaction[],
  amountForTotal: (transaction: Transaction) => number = tx => Math.abs(tx.amount),
): MonthGroup[] {
  const groups = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const date = new Date(transaction.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const group = groups.get(key) ?? [];
    group.push(transaction);
    groups.set(key, group);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => {
      const [year, month = '1'] = key.split('-');
      return {
        key,
        label: `${monthNames[Number(month) - 1]} ${year}`,
        total: items.reduce((sum, tx) => sum + amountForTotal(tx), 0),
        transactions: items,
      };
    });
}

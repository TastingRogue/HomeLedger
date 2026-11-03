import { getTransactions, type Transaction, type TransactionFilters } from '$lib/api/transactions';
import { transactionDate } from './dashboard-period';

/** Follow server pagination; a larger pageSize cannot bypass the API's cap. */
export async function allTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  const items: Transaction[] = [];
  for (let page = 1; ; page++) {
    const result = await getTransactions({ ...filters, page, pageSize: 100 });
    items.push(...result.items);
    if (items.length >= result.total || result.items.length === 0) return items;
  }
}

export function inMonth(date: string, year: number, month: number): boolean {
  const value = transactionDate(date);
  return value.getFullYear() === year && value.getMonth() === month;
}

export function inBaseCurrency<T extends { amount: number; accountId?: number }>(
  items: T[], accounts: { id: number; exchangeRate?: unknown }[],
): T[] {
  const rates = new Map(accounts.map(account => [account.id, Number(account.exchangeRate ?? 1)]));
  return items.map(item => ({ ...item, amount: item.amount * (rates.get(item.accountId ?? 0) ?? 1) }));
}

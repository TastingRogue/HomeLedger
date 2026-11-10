import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { accounts, categories, transactions, transactionSplits } from '../db/schema.js';
import { roundMoney } from '../utils/money.js';

/** Each transaction contributes its splits OR its own amount, never both. */
export function categorySpending(
  userId: number,
  startDate: string,
  endDate: string,
  categoryId?: number,
) {
  const effectiveCategory = sql<number>`COALESCE(${transactionSplits.categoryId}, ${transactions.categoryId})`;
  return getDb()
    .select({
      categoryId: effectiveCategory,
      categoryName: categories.name,
      total: sql<number>`COALESCE(SUM(COALESCE(${transactionSplits.amount}, ${transactions.amount}) * ${accounts.exchangeRate}), 0)`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(transactionSplits, eq(transactionSplits.transactionId, transactions.id))
    .innerJoin(categories, eq(categories.id, effectiveCategory))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'Gasto'),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate),
        categoryId === undefined ? undefined : eq(effectiveCategory, categoryId),
      ),
    )
    .groupBy(effectiveCategory, categories.name)
    .all()
    .map((row) => ({ ...row, total: roundMoney(row.total) }));
}

export function categorySpent(
  userId: number,
  categoryId: number,
  startDate: string,
  endDate: string,
): number {
  return categorySpending(userId, startDate, endDate, categoryId)[0]?.total ?? 0;
}

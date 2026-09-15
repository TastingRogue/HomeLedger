/**
 * SearchService — cross-entity global search (P4.9, v1 finance scope).
 *
 * Searches the user's transactions, receipts, and subscriptions by a text query
 * plus optional structured filters. LIKE-based (case-insensitive) — deliberately
 * NOT FTS5; a full-text cross-entity engine is the separate v2/L5 item. All local.
 */

import { and, eq, gte, lte, inArray, like, or, sql, desc } from 'drizzle-orm';
import { getDb, getSqlite } from '../db/connection.js';
import { transactions, subscriptions, accounts, categories, transactionTags } from '../db/schema.js';

export type SearchEntity = 'transaction' | 'receipt' | 'subscription';

export interface SearchFilters {
  q?: string;
  /** Restrict to a single entity type; omit for all three. */
  type?: SearchEntity;
  accountId?: number;
  categoryId?: number;
  merchant?: string;
  tagId?: number;
  minAmount?: number;
  maxAmount?: number;
  /** Transaction "kind" (Ingreso/Gasto) — distinct from the entity `type`. */
  txType?: 'Ingreso' | 'Gasto';
  startDate?: string;
  endDate?: string;
  /** Max rows per entity list (default 25, capped at 100). */
  limit?: number;
}

export interface TransactionSearchHit {
  id: number;
  name: string;
  merchant: string | null;
  amount: number;
  type: string;
  date: string;
  accountName: string | null;
  categoryName: string | null;
}

export interface ReceiptSearchHit {
  id: number;
  merchant: string | null;
  issuerRfc: string | null;
  total: number | null;
  receiptDate: string | null;
  uuid: string | null;
  transactionId: number | null;
}

export interface SubscriptionSearchHit {
  id: number;
  name: string;
  amount: number;
  cycle: string;
  status: string;
  nextPaymentDate: string;
  accountName: string | null;
}

export interface SearchResult {
  transactions: TransactionSearchHit[];
  receipts: ReceiptSearchHit[];
  subscriptions: SubscriptionSearchHit[];
  totalCount: number;
}

export class SearchService {
  static search(userId: number, filters: SearchFilters): SearchResult {
    const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
    const wantAll = !filters.type;

    const result: SearchResult = { transactions: [], receipts: [], subscriptions: [], totalCount: 0 };

    if (wantAll || filters.type === 'transaction') {
      result.transactions = SearchService.searchTransactions(userId, filters, limit);
    }
    if (wantAll || filters.type === 'receipt') {
      result.receipts = SearchService.searchReceipts(userId, filters, limit);
    }
    if (wantAll || filters.type === 'subscription') {
      result.subscriptions = SearchService.searchSubscriptions(userId, filters, limit);
    }

    result.totalCount = result.transactions.length + result.receipts.length + result.subscriptions.length;
    return result;
  }

  private static searchTransactions(userId: number, f: SearchFilters, limit: number): TransactionSearchHit[] {
    const db = getDb();
    const conditions = [eq(transactions.userId, userId)];

    const q = f.q?.trim();
    if (q) {
      const pat = `%${q}%`;
      const clause = or(
        like(transactions.name, pat),
        like(transactions.merchant, pat),
        like(transactions.notes, pat),
      );
      if (clause) conditions.push(clause);
    }
    if (f.merchant?.trim()) conditions.push(like(transactions.merchant, `%${f.merchant.trim()}%`));
    if (f.accountId) conditions.push(eq(transactions.accountId, f.accountId));
    if (f.categoryId) conditions.push(eq(transactions.categoryId, f.categoryId));
    if (f.txType) conditions.push(eq(transactions.type, f.txType));
    if (f.minAmount != null) conditions.push(gte(transactions.amount, f.minAmount));
    if (f.maxAmount != null) conditions.push(lte(transactions.amount, f.maxAmount));
    if (f.startDate) conditions.push(gte(transactions.date, f.startDate));
    if (f.endDate) conditions.push(lte(transactions.date, f.endDate));
    if (f.tagId) {
      const tagged = db
        .select({ id: transactionTags.transactionId })
        .from(transactionTags)
        .where(eq(transactionTags.tagId, f.tagId));
      conditions.push(inArray(transactions.id, tagged));
    }

    const rows = db
      .select({
        id: transactions.id,
        name: transactions.name,
        merchant: transactions.merchant,
        amount: transactions.amount,
        type: transactions.type,
        date: transactions.date,
        accountName: accounts.name,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.date))
      .limit(limit)
      .all();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      merchant: r.merchant ?? null,
      amount: r.amount,
      type: r.type,
      date: r.date,
      accountName: r.accountName ?? null,
      categoryName: r.categoryName ?? null,
    }));
  }

  private static searchReceipts(userId: number, f: SearchFilters, limit: number): ReceiptSearchHit[] {
    const sqlite = getSqlite();

    // receipt_analyses is created lazily by ReceiptService; guard its absence.
    const exists = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='receipt_analyses'")
      .get();
    if (!exists) return [];

    const where: string[] = ['user_id = ?'];
    const params: unknown[] = [userId];

    const q = f.q?.trim();
    if (q) {
      const pat = `%${q}%`;
      where.push('(merchant LIKE ? OR issuer_name LIKE ? OR issuer_rfc LIKE ? OR uuid LIKE ?)');
      params.push(pat, pat, pat, pat);
    }
    if (f.merchant?.trim()) { where.push('merchant LIKE ?'); params.push(`%${f.merchant.trim()}%`); }
    if (f.minAmount != null) { where.push('total >= ?'); params.push(f.minAmount); }
    if (f.maxAmount != null) { where.push('total <= ?'); params.push(f.maxAmount); }
    if (f.startDate) { where.push('receipt_date >= ?'); params.push(f.startDate); }
    if (f.endDate) { where.push('receipt_date <= ?'); params.push(f.endDate); }

    const rows = sqlite
      .prepare(
        `SELECT id, merchant, issuer_rfc AS issuerRfc, total, receipt_date AS receiptDate, uuid, transaction_id AS transactionId
         FROM receipt_analyses WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ?`,
      )
      .all(...params, limit) as Record<string, unknown>[];

    return rows.map((r) => ({
      id: Number(r.id),
      merchant: (r.merchant as string | null) ?? null,
      issuerRfc: (r.issuerRfc as string | null) ?? null,
      total: r.total == null ? null : Number(r.total),
      receiptDate: (r.receiptDate as string | null) ?? null,
      uuid: (r.uuid as string | null) ?? null,
      transactionId: r.transactionId == null ? null : Number(r.transactionId),
    }));
  }

  private static searchSubscriptions(userId: number, f: SearchFilters, limit: number): SubscriptionSearchHit[] {
    const db = getDb();
    const conditions = [eq(subscriptions.userId, userId)];

    const q = f.q?.trim();
    if (q) conditions.push(like(subscriptions.name, `%${q}%`));
    if (f.accountId) conditions.push(eq(subscriptions.accountId, f.accountId));
    if (f.categoryId) conditions.push(eq(subscriptions.categoryId, f.categoryId));
    if (f.minAmount != null) conditions.push(gte(subscriptions.amount, f.minAmount));
    if (f.maxAmount != null) conditions.push(lte(subscriptions.amount, f.maxAmount));

    const rows = db
      .select({
        id: subscriptions.id,
        name: subscriptions.name,
        amount: subscriptions.amount,
        cycle: subscriptions.cycle,
        status: subscriptions.status,
        nextPaymentDate: subscriptions.nextPaymentDate,
        accountName: accounts.name,
      })
      .from(subscriptions)
      .leftJoin(accounts, eq(subscriptions.accountId, accounts.id))
      .where(and(...conditions))
      .orderBy(sql`${subscriptions.nextPaymentDate}`)
      .limit(limit)
      .all();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      amount: r.amount,
      cycle: r.cycle,
      status: r.status,
      nextPaymentDate: r.nextPaymentDate,
      accountName: r.accountName ?? null,
    }));
  }
}

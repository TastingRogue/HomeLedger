/**
 * API client for global search (P4.9).
 */
import { apiGet } from './client';

export type SearchEntity = 'transaction' | 'receipt' | 'subscription';

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

export interface SearchParams {
  q?: string;
  type?: SearchEntity;
  accountId?: number;
  categoryId?: number;
  merchant?: string;
  tagId?: number;
  minAmount?: number;
  maxAmount?: number;
  txType?: 'Ingreso' | 'Gasto';
  startDate?: string;
  endDate?: string;
}

/** Cross-entity search over transactions, receipts, and subscriptions. */
export function search(params: SearchParams): Promise<SearchResult> {
  const query: Record<string, string | number | undefined> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) query[k] = v as string | number;
  }
  return apiGet<SearchResult>('/search', query);
}

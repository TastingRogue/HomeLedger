import { apiGet, apiPost, apiPut, apiDelete } from './client';

/** Transaction type as used by the backend and shared package. */
export type TransactionType = 'Ingreso' | 'Gasto';

export interface TransactionSplit {
	id: number;
	transactionId: number;
	categoryId: number;
	amount: number;
	note: string | null;
}

export interface Transaction {
	id: number;
	name: string;
	amount: number;
	date: string;
	type: TransactionType;
	categoryId: number;
	categoryName?: string;
	subcategoryId?: number | null;
	accountId: number;
	accountName?: string;
	description?: string;
	splits?: TransactionSplit[];
	createdAt: string;
	updatedAt: string;
}

export interface CreateTransactionInput {
	name: string;
	amount: number;
	date: string;
	type: TransactionType;
	categoryId: number;
	subcategoryId?: number | null;
	accountId: number;
}

/** One split row when saving a transaction split. */
export interface SplitInput {
	categoryId: number;
	amount: number;
	note?: string;
}

export interface QuickTransactionInput {
	amount: number;
	categoryId: number;
	accountId: number;
	type?: TransactionType;
}

export interface TransactionFilters {
	accountId?: number;
	categoryId?: number;
	type?: TransactionType;
	startDate?: string;
	endDate?: string;
	page?: number;
	pageSize?: number;
}

export interface PaginatedTransactions {
	items: Transaction[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export function getTransactions(filters?: TransactionFilters): Promise<PaginatedTransactions> {
	const params = new URLSearchParams();
	if (filters) {
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined) params.set(key, String(value));
		});
	}
	const query = params.toString() ? `?${params.toString()}` : '';
	return apiGet<PaginatedTransactions>(`/transactions${query}`);
}

export function getTransactionById(id: number): Promise<Transaction> {
	return apiGet<Transaction>(`/transactions/${id}`);
}

export function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
	return apiPost<Transaction>('/transactions', input);
}

export function quickCreateTransaction(input: QuickTransactionInput): Promise<Transaction> {
	return apiPost<Transaction>('/transactions/quick', input);
}

export function updateTransaction(id: number, input: Partial<CreateTransactionInput>): Promise<Transaction> {
	return apiPut<Transaction>(`/transactions/${id}`, input);
}

export async function deleteTransaction(id: number): Promise<void> {
	await apiDelete(`/transactions/${id}`);
}

/** Split a transaction into category buckets (replaces any existing splits). */
export function splitTransaction(id: number, splits: SplitInput[]): Promise<TransactionSplit[]> {
	return apiPost<TransactionSplit[]>(`/transactions/${id}/split`, { splits });
}

/** Clear all splits for a transaction (revert to its main category only). */
export async function clearSplits(id: number): Promise<void> {
	await apiDelete(`/transactions/${id}/split`);
}

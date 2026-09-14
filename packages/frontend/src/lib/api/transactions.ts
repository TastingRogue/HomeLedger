import { apiGet, apiPost, apiPut, apiDelete, apiFetchBlob } from './client';

/** Transaction type as used by the backend and shared package. */
export type TransactionType = 'Ingreso' | 'Gasto';

export interface TransactionSplit {
	id: number;
	transactionId: number;
	categoryId: number;
	amount: number;
	note: string | null;
}

/** Finer classification that does NOT change `type` (balance sums by type). */
export type TransactionSubtype = 'refund' | 'reimbursement' | 'adjustment';
/** Lifecycle status of a transaction. */
export type TransactionStatus = 'pending' | 'posted';

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
	notes?: string | null;
	// ── P4.1 richer transaction model ──
	merchant?: string | null;
	subtype?: TransactionSubtype | null;
	reconciled?: boolean;
	status?: TransactionStatus;
	externalId?: string | null;
	splits?: TransactionSplit[];
	tags?: { id: number; name: string; color: string | null }[];
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
	// ── P4.1 richer transaction model (all optional) ──
	merchant?: string | null;
	subtype?: TransactionSubtype | null;
	reconciled?: boolean;
	status?: TransactionStatus;
	externalId?: string | null;
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
	// ── P4.1 richer transaction model filters ──
	reconciled?: boolean;
	status?: TransactionStatus;
	subtype?: TransactionSubtype;
	tagId?: number;
	page?: number;
	pageSize?: number;
}

/** A reusable per-user label (P4.1 Phase 2). */
export interface Tag {
	id: number;
	name: string;
	color: string | null;
	createdAt?: string;
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

/**
 * Export the user's transactions (matching the given filters) as a CSV file.
 * Returns the file contents as a Blob for the caller to download. The server
 * exports the FULL filtered dataset, not just a page.
 */
export function exportTransactionsCsv(filters?: TransactionFilters): Promise<Blob> {
	const params = new URLSearchParams();
	if (filters) {
		// Pagination params don't apply to a full export; skip them.
		const { page: _p, pageSize: _ps, ...rest } = filters;
		Object.entries(rest).forEach(([key, value]) => {
			if (value !== undefined && value !== '') params.set(key, String(value));
		});
	}
	const query = params.toString() ? `?${params.toString()}` : '';
	return apiFetchBlob(`/transactions/export.csv${query}`);
}

// ── Tags (P4.1 Phase 2) ──

/** List the user's tag catalog. */
export function getTags(): Promise<Tag[]> {
	return apiGet<Tag[]>('/tags');
}

/** Create (or get existing) a tag by name. */
export function createTag(name: string, color?: string | null): Promise<Tag> {
	return apiPost<Tag>('/tags', { name, color });
}

/** Delete a tag from the catalog (removes it from all transactions). */
export async function deleteTag(id: number): Promise<void> {
	await apiDelete(`/tags/${id}`);
}

/** Replace the full set of tags on a transaction by name (creates missing ones). */
export function setTransactionTags(id: number, tags: string[]): Promise<Tag[]> {
	return apiPut<Tag[]>(`/transactions/${id}/tags`, { tags });
}

// ── Audit history (P4.1 Phase 3) ──

/** One recorded change to a transaction. */
export interface TransactionAudit {
	id: number;
	transactionId: number | null;
	userId: number;
	action: 'created' | 'updated' | 'deleted';
	/** For 'updated': { field: { from, to } }; for created/deleted: a snapshot. */
	changes: Record<string, unknown> | null;
	createdAt: string;
}

/** Fetch a transaction's change history (newest first). */
export function getTransactionAudit(id: number): Promise<TransactionAudit[]> {
	return apiGet<TransactionAudit[]>(`/transactions/${id}/audit`);
}

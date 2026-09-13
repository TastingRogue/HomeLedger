import { apiGet, apiPost, apiPut, apiDelete } from './client';

/** Lifecycle status of an asset. */
export type AssetStatus = 'active' | 'sold' | 'disposed';

export interface Asset {
	id: number;
	userId: number;
	name: string;
	/** Current estimated value (renamed from `value` in P4). */
	currentValue: number;
	type: string;
	// ── P4 first-class fields (all optional) ──
	brand: string | null;
	model: string | null;
	serialNumber: string | null;
	category: string | null;
	purchaseDate: string | null;
	purchasePrice: number | null;
	location: string | null;
	status: AssetStatus;
	/** Optional link to the transaction that recorded the purchase. */
	purchaseTransactionId: number | null;
	/** Optional link to a receipt/invoice attachment. */
	receiptAttachmentId: number | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Liability {
	id: number;
	userId: number;
	name: string;
	balance: number;
	type: string;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface NetWorthSummary {
	totalAssets: number;
	totalLiabilities: number;
	netWorth: number;
	accountBalances: number;
	assetValues: number;
	assets: Asset[];
	liabilities: Liability[];
}

export interface AssetInput {
	name: string;
	currentValue: number;
	type: string;
	brand?: string | null;
	model?: string | null;
	serialNumber?: string | null;
	category?: string | null;
	purchaseDate?: string | null;
	purchasePrice?: number | null;
	location?: string | null;
	status?: AssetStatus;
	purchaseTransactionId?: number | null;
	receiptAttachmentId?: number | null;
	notes?: string | null;
}

export interface LiabilityInput {
	name: string;
	balance: number;
	type: string;
	notes?: string | null;
}

export function getNetWorth(): Promise<NetWorthSummary> {
	return apiGet<NetWorthSummary>('/networth/current');
}

// Assets
export function createAsset(input: AssetInput): Promise<Asset> {
	return apiPost<Asset>('/networth/assets', input);
}

export function updateAsset(id: number, input: Partial<AssetInput>): Promise<Asset> {
	return apiPut<Asset>(`/networth/assets/${id}`, input);
}

export async function deleteAsset(id: number): Promise<void> {
	await apiDelete(`/networth/assets/${id}`);
}

// Liabilities
export function createLiability(input: LiabilityInput): Promise<Liability> {
	return apiPost<Liability>('/networth/liabilities', input);
}

export function updateLiability(id: number, input: Partial<LiabilityInput>): Promise<Liability> {
	return apiPut<Liability>(`/networth/liabilities/${id}`, input);
}

export async function deleteLiability(id: number): Promise<void> {
	await apiDelete(`/networth/liabilities/${id}`);
}

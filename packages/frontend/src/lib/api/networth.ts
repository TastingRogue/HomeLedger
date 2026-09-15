import { apiGet, apiPost, apiPut, apiDelete } from './client';

export interface Asset {
	id: number;
	userId: number;
	name: string;
	value: number;
	type: string;
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
	value: number;
	type: string;
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

// ─── History (P4.8) ───

export type NetWorthRange = '1m' | '6m' | '1y' | '5y' | 'all';

export interface NetWorthSnapshot {
	id: number;
	userId: number;
	date: string;
	totalAssets: number;
	totalLiabilities: number;
	netWorth: number;
	createdAt: string;
}

/** Net-worth snapshots for a named range (1m/6m/1y/5y/all). */
export function getNetWorthHistory(range: NetWorthRange): Promise<NetWorthSnapshot[]> {
	return apiGet<NetWorthSnapshot[]>('/networth/history', { range });
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

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

// Assets
export function createAsset(input: AssetInput): Promise<Asset> {
	return apiPost<Asset>('/networth/assets', input);
}

export function updateAsset(id: number, input: Partial<AssetInput>): Promise<Asset> {
	return apiPut<Asset>(`/networth/assets/${id}`, input);
}

export function deleteAsset(id: number): Promise<void> {
	return apiDelete<void>(`/networth/assets/${id}`);
}

// Liabilities
export function createLiability(input: LiabilityInput): Promise<Liability> {
	return apiPost<Liability>('/networth/liabilities', input);
}

export function updateLiability(id: number, input: Partial<LiabilityInput>): Promise<Liability> {
	return apiPut<Liability>(`/networth/liabilities/${id}`, input);
}

export function deleteLiability(id: number): Promise<void> {
	return apiDelete<void>(`/networth/liabilities/${id}`);
}

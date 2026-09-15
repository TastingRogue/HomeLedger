/**
 * API client for the smart bank importer (P4.4).
 *
 * Flow: upload → preview (annotated) → confirm. Plus history + undo.
 */
import { apiGet, apiPost, apiDelete, apiUpload } from './client';

export type PreviewRowStatus = 'new' | 'duplicate' | 'pending_match';

export interface ImportSession {
  id: number;
  userId: number;
  filename: string;
  parser: string;
  status: 'pending' | 'completed' | 'failed' | 'reverted' | string;
  recordCount: number | null;
  createdAt: string;
}

export interface PreviewRow {
  index: number;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  reference?: string;
  balance?: number;
  normalizedMerchant: string;
  normalizedDate: string;
  status: PreviewRowStatus;
}

export interface ImportPreview {
  sessionId: number;
  filename: string;
  parser: string;
  format: string;
  transactions: PreviewRow[];
  totalCount: number;
  duplicateCount: number;
  pendingMatchCount: number;
  newCount: number;
  detectedAccountId?: number;
}

export interface ImportResult {
  sessionId: number;
  importedCount: number;
  duplicateCount: number;
  skippedCount: number;
  matchedCount: number;
  transactions: Array<{ id: number; name: string }>;
}

export interface UndoResult {
  sessionId: number;
  removedCount: number;
}

export interface ParserInfo {
  bankId: string;
  bankName: string;
  supportedFormats: string[];
}

/** Upload a bank file and create an import session. */
export function uploadImport(
  file: File,
  options?: { parser?: string; accountId?: number },
): Promise<ImportSession> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.parser) formData.append('parser', options.parser);
  if (options?.accountId != null) formData.append('accountId', String(options.accountId));
  return apiUpload<ImportSession>('/imports/upload', formData);
}

/** Preview the parsed + classified transactions for a session. */
export function previewImport(sessionId: number): Promise<ImportPreview> {
  return apiGet<ImportPreview>(`/imports/${sessionId}/preview`);
}

/** Confirm the import, inserting the selected rows. */
export function confirmImport(
  sessionId: number,
  body: { accountId: number; defaultCategoryId?: number; selectedTransactionIds?: number[] },
): Promise<ImportResult> {
  return apiPost<ImportResult>(`/imports/${sessionId}/confirm`, body);
}

/** Undo a completed import (reverse the rows it inserted). */
export function undoImport(sessionId: number): Promise<UndoResult> {
  return apiDelete<UndoResult>(`/imports/${sessionId}`);
}

/** List the user's import sessions (newest first). */
export function getImportHistory(): Promise<ImportSession[]> {
  return apiGet<ImportSession[]>('/imports/history');
}

/** List available bank parsers. */
export function getParsers(): Promise<ParserInfo[]> {
  return apiGet<ParserInfo[]>('/imports/parsers');
}

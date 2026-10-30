/**
 * Multi-file receipt upload queue (issue #17).
 *
 * Pure logic, no Svelte or network imports, so it can be unit-tested: files are
 * validated against the same rules the backend enforces, then processed one at
 * a time (upload → analyze). Sequential on purpose: analysis is CPU-heavy OCR
 * on the server and the upload endpoint accepts a single file per request.
 *
 * Items are mutated in place. Pass Svelte `$state` items to get reactive UI.
 */

/** Keep in sync with packages/backend/src/routes/v1/attachments.routes.ts. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/xml',
  'text/xml',
] as const;
/** Fallback for browsers/OSes that report an empty `file.type` (common for .xml). */
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.xml'];

/** The `accept` attribute value for file pickers. */
export const UPLOAD_ACCEPT = [...ALLOWED_MIME_TYPES, ...ALLOWED_EXTENSIONS].join(',');

export type BatchStatus =
  | 'queued'
  | 'uploading'
  | 'analyzing'
  | 'done'
  | 'analysis_failed' // uploaded fine, but OCR/parsing failed — still in the list to retry
  | 'failed' // upload itself failed
  | 'rejected'; // never sent (wrong type / too large / empty)

export type RejectReason = 'type' | 'size' | 'empty';

export interface BatchItem {
  id: number;
  name: string;
  size: number;
  file: File;
  status: BatchStatus;
  reason?: RejectReason;
  error?: string;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot).toLowerCase();
}

/** Why a file would be refused, or null if it is acceptable. */
export function rejectReason(file: { name: string; size: number; type: string }): RejectReason | null {
  if (file.size === 0) return 'empty';
  if (file.size > MAX_UPLOAD_BYTES) return 'size';
  const typeOk = (ALLOWED_MIME_TYPES as readonly string[]).includes(file.type);
  const extOk = ALLOWED_EXTENSIONS.includes(extensionOf(file.name));
  // Accept on a known MIME type, or on a known extension when the browser gave no type.
  if (typeOk || (file.type === '' && extOk)) return null;
  return 'type';
}

let nextId = 1;

/** Builds the queue; unacceptable files are kept (as `rejected`) so the user sees why. */
export function createBatch(files: File[]): BatchItem[] {
  return files.map((file) => {
    const reason = rejectReason(file);
    return {
      id: nextId++,
      name: file.name,
      size: file.size,
      file,
      status: reason ? 'rejected' : 'queued',
      ...(reason ? { reason } : {}),
    } satisfies BatchItem;
  });
}

export interface BatchOps {
  upload: (file: File) => Promise<{ id: number }>;
  analyze: (attachmentId: number) => Promise<unknown>;
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * Processes queued items one at a time. A failure on one file never stops the
 * rest. Resolves when every item has reached a final state.
 */
export async function runBatch(items: BatchItem[], ops: BatchOps): Promise<void> {
  for (const item of items) {
    if (item.status !== 'queued') continue;

    item.status = 'uploading';
    let attachmentId: number;
    try {
      attachmentId = (await ops.upload(item.file)).id;
    } catch (e) {
      item.status = 'failed';
      item.error = messageOf(e);
      continue;
    }

    item.status = 'analyzing';
    try {
      await ops.analyze(attachmentId);
      item.status = 'done';
    } catch (e) {
      item.status = 'analysis_failed';
      item.error = messageOf(e);
    }
  }
}

/** Counts of finished (`done`) items, for a "3 of 5 processed" summary. */
export function countDone(items: BatchItem[]): number {
  return items.filter((i) => i.status === 'done').length;
}

/** True while anything is still waiting or in flight. */
export function isBusy(items: BatchItem[]): boolean {
  return items.some((i) => i.status === 'queued' || i.status === 'uploading' || i.status === 'analyzing');
}

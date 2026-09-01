import { apiGet, apiDelete, apiFetchBlob, apiUpload } from './client';

export interface Attachment {
	id: number;
	userId: number;
	transactionId: number | null;
	transferId: number | null;
	filename: string;
	originalName: string | null;
	mimeType: string;
	size: number;
	createdAt: string;
}

export interface UploadLink {
	transactionId?: number;
	transferId?: number;
}

/** List attachments, optionally filtered by transaction or transfer. */
export async function listAttachments(filter?: UploadLink): Promise<Attachment[]> {
	const params: Record<string, number | undefined> = {};
	if (filter?.transactionId) params.transactionId = filter.transactionId;
	if (filter?.transferId) params.transferId = filter.transferId;
	return apiGet<Attachment[]>('/attachments', params);
}

/** Upload a file, optionally linking it to a transaction or transfer. */
export async function uploadAttachment(file: File, link?: UploadLink): Promise<Attachment> {
	const formData = new FormData();
	formData.append('file', file);
	if (link?.transactionId) formData.append('transactionId', String(link.transactionId));
	if (link?.transferId) formData.append('transferId', String(link.transferId));
	return apiUpload<Attachment>('/attachments/upload', formData);
}

/** Fetch the attachment file as a Blob (for inline preview). */
export async function fetchAttachmentBlob(id: number, inline = true): Promise<Blob> {
	return apiFetchBlob(`/attachments/${id}/download${inline ? '?inline=1' : ''}`);
}

/** Create an object URL for previewing an attachment. Caller must revoke it. */
export async function previewAttachmentUrl(id: number): Promise<string> {
	const blob = await fetchAttachmentBlob(id, true);
	return URL.createObjectURL(blob);
}

/** Trigger a browser download of the attachment with its original name. */
export async function downloadAttachment(id: number, filename: string): Promise<void> {
	const blob = await fetchAttachmentBlob(id, false);
	const url = URL.createObjectURL(blob);
	try {
		const a = document.createElement('a');
		a.href = url;
		a.download = filename || `attachment-${id}`;
		document.body.appendChild(a);
		a.click();
		a.remove();
	} finally {
		URL.revokeObjectURL(url);
	}
}

/** Delete an attachment (file + record). */
export async function deleteAttachment(id: number): Promise<void> {
	await apiDelete(`/attachments/${id}`);
}

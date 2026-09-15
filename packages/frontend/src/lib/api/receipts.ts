import { apiGet, apiPost, apiPatch } from './client';

export interface ReceiptEditableFields {
	merchant?: string | null;
	receiptDate?: string | null;
	subtotal?: number | null;
	tax?: number | null;
	total?: number | null;
	issuerRfc?: string | null;
	uuid?: string | null;
}

export interface ReceiptItem {
	id: number;
	analysisId: number;
	description: string;
	quantity: number | null;
	unitPrice: number | null;
	total: number | null;
	categoryId: number | null;
}

export interface ReceiptAnalysis {
	id: number;
	attachmentId: number;
	transactionId: number | null;
	merchant: string | null;
	receiptDate: string | null;
	subtotal: number | null;
	tax: number | null;
	total: number | null;
	currency: string;
	documentType: 'receipt' | 'invoice' | 'cfdi' | 'unknown';
	sourceType: 'cfdi_xml' | 'pdf_text' | 'ocr' | 'unknown';
	status: 'pending' | 'processing' | 'completed' | 'failed';
	confidence: number;
	rawText: string | null;
	uuid: string | null;
	rfc: string | null;
	issuerName: string | null;
	filename: string | null;
	mimeType: string;
	transactionName: string | null;
	transactionAmount: number | null;
	error: string | null;
	createdAt: string;
	updatedAt: string;
	items: ReceiptItem[];
}

type ReceiptApiResponse = Omit<ReceiptAnalysis, 'rfc'> & {
	issuerRfc: string | null;
};

function normalizeReceipt(receipt: ReceiptApiResponse): ReceiptAnalysis {
	const { issuerRfc, ...rest } = receipt;
	return {
		...rest,
		rfc: issuerRfc ?? null
	};
}

export async function listReceipts(): Promise<ReceiptAnalysis[]> {
	const receipts = await apiGet<ReceiptApiResponse[]>('/receipts');
	return receipts.map(normalizeReceipt);
}

export async function getReceipt(id: number): Promise<ReceiptAnalysis> {
	const receipt = await apiGet<ReceiptApiResponse>(`/receipts/${id}`);
	return normalizeReceipt(receipt);
}

export async function analyzeAttachment(attachmentId: number): Promise<ReceiptAnalysis> {
	const receipt = await apiPost<ReceiptApiResponse>(`/receipts/${attachmentId}/analyze`, {});
	return normalizeReceipt(receipt);
}

export async function updateReceipt(id: number, fields: ReceiptEditableFields): Promise<ReceiptAnalysis> {
	const receipt = await apiPatch<ReceiptApiResponse>(`/receipts/${id}`, fields);
	return normalizeReceipt(receipt);
}

/** P4.6: assign (or clear) a receipt line item's category. */
export async function setReceiptItemCategory(
	receiptId: number,
	itemId: number,
	categoryId: number | null,
): Promise<ReceiptAnalysis> {
	const receipt = await apiPatch<ReceiptApiResponse>(`/receipts/${receiptId}/items/${itemId}`, { categoryId });
	return normalizeReceipt(receipt);
}

/** P4.6: create a transaction (+ optional item splits) from a receipt/CFDI. */
export async function createTransactionFromReceipt(
	receiptId: number,
	body: { accountId: number; categoryId: number; date?: string },
): Promise<ReceiptAnalysis> {
	const receipt = await apiPost<ReceiptApiResponse>(`/receipts/${receiptId}/transaction`, body);
	return normalizeReceipt(receipt);
}

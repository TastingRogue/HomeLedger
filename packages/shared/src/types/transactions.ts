// Tipos de transacción
export enum TransactionType {
  Ingreso = 'Ingreso',
  Gasto = 'Gasto',
}

/** Finer classification that does NOT change `type` (balance sums by type). */
export type TransactionSubtype = 'refund' | 'reimbursement' | 'adjustment';
/** Lifecycle status of a transaction. */
export type TransactionStatus = 'pending' | 'posted';

/** A reusable per-user label (P4.1 Phase 2). */
export interface Tag {
  id: number;
  userId: number;
  name: string;
  color: string | null;
  createdAt: string;
}

// Entidad principal de Transacción
export interface Transaction {
  id: number;
  userId: number;
  name: string;                      // máximo 100 caracteres
  accountId: number;
  date: string;                      // ISO 8601 con zona horaria CST
  categoryId: number;
  subcategoryId?: number | null;     // subcategoría opcional (debe pertenecer a la categoría)
  amount: number;                    // > 0, máximo 999,999,999.99, exactamente 2 decimales
  type: TransactionType;
  notes: string | null;
  // ── P4.1 richer transaction model (all optional) ──
  merchant: string | null;           // comercio / beneficiario
  subtype: TransactionSubtype | null;
  reconciled: boolean;               // conciliado contra estado de cuenta
  status: TransactionStatus;         // 'pending' | 'posted'
  externalId: string | null;         // id estable del origen importado (para dedupe)
  attachmentId: number | null;
  createdAt: string;
  updatedAt: string;
  // Resueltos por join en el endpoint de lista (no son columnas de la tabla).
  accountName?: string;
  categoryName?: string;
  tags?: { id: number; name: string; color: string | null }[]; // P4.1 Fase 2
}

// Split de una transacción (división por categorías)
export interface TransactionSplit {
  id: number;
  transactionId: number;
  categoryId: number;
  amount: number;                    // > 0, suma de splits = monto de la transacción padre
  description: string | null;
}

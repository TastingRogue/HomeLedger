// Tipos de transacción
export enum TransactionType {
  Ingreso = 'Ingreso',
  Gasto = 'Gasto',
}

// Entidad principal de Transacción
export interface Transaction {
  id: number;
  userId: number;
  name: string;                      // máximo 100 caracteres
  accountId: number;
  date: string;                      // ISO 8601 con zona horaria CST
  categoryId: number;
  amount: number;                    // > 0, máximo 999,999,999.99, exactamente 2 decimales
  type: TransactionType;
  invoiceUrl: string | null;         // archivo de imagen adjunto (opcional)
  parentId: number | null;           // referencia a transacción padre (para splits)
  createdAt: string;
  updatedAt: string;
}

// Split de una transacción (división por categorías)
export interface TransactionSplit {
  id: number;
  transactionId: number;
  categoryId: number;
  amount: number;                    // > 0, suma de splits = monto de la transacción padre
  description: string | null;
}

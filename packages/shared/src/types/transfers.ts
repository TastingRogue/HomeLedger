// Entidad principal de Transferencia entre cuentas
export interface Transfer {
  id: number;
  userId: number;
  name: string;                      // máximo 100 caracteres
  date: string;                      // ISO 8601
  amount: number;                    // > 0, ≤ 999,999,999.99 MXN
  sourceAccountId: number;           // cuenta origen
  destinationAccountId: number;      // cuenta destino (≠ cuenta origen)
  createdAt: string;
  updatedAt: string;
}

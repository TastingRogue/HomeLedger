// Sugerencias de tipo de activo (el campo `type` en la BD es texto libre;
// este enum solo documenta valores comunes).
export enum AssetType {
  Propiedad = 'Propiedad',
  Vehiculo = 'Vehículo',
  Inversion = 'Inversión',
  Electronica = 'Electrónica',
  Otro = 'Otro',
}

// Estado del ciclo de vida de un activo.
export type AssetStatus = 'active' | 'sold' | 'disposed';

// Entidad principal de Activo (P4: activo como entidad de primera clase).
// Refleja la tabla `assets`: además del valor actual, guarda metadatos de
// inventario (marca/modelo/serie/categoría/ubicación) y vínculos opcionales a
// la transacción de compra y a un comprobante.
export interface Asset {
  id: number;
  userId: number;
  name: string;
  type: string;
  currentValue: number;              // valor actual estimado (antes `value`)
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  category: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;      // precio de compra original
  location: string | null;           // ubicación física (para inventario)
  status: AssetStatus;
  purchaseTransactionId: number | null; // FK opcional -> transactions
  receiptAttachmentId: number | null;   // FK opcional -> attachments
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Tipo de pasivo para patrimonio neto
export enum LiabilityType {
  TarjetaCredito = 'Tarjeta de Crédito',
  Prestamo = 'Préstamo',
  Hipoteca = 'Hipoteca',
  Otro = 'Otro',
}

// Entidad principal de Pasivo
export interface Liability {
  id: number;
  userId: number;
  name: string;
  type: LiabilityType;
  currentBalance: number;            // balance actual adeudado
  originalAmount: number | null;     // monto original
  interestRate: number | null;       // tasa de interés anual (%)
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Snapshot del patrimonio neto
export interface NetWorthSnapshot {
  id: number;
  userId: number;
  date: string;
  totalAssets: number;               // suma de activos + balances de cuentas activas
  totalLiabilities: number;          // suma de pasivos
  netWorth: number;                  // totalAssets - totalLiabilities
}

// Resumen actual del patrimonio neto
export interface NetWorthSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assets: Asset[];
  liabilities: Liability[];
}

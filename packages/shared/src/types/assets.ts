// Tipo de activo para patrimonio neto
export enum AssetType {
  Propiedad = 'Propiedad',
  Vehiculo = 'Vehículo',
  Inversion = 'Inversión',
  Electronica = 'Electrónica',
  Otro = 'Otro',
}

// Entidad principal de Activo
export interface Asset {
  id: number;
  userId: number;
  name: string;
  type: AssetType;
  currentValue: number;              // valor actual estimado
  purchaseValue: number | null;      // valor de compra original
  purchaseDate: string | null;
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

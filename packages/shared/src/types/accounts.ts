// Tipos de cuenta disponibles en el sistema
export enum AccountType {
  Debito = 'Débito',
  Credito = 'Crédito',
  Inversion = 'Inversión',
  Vales = 'Vales',
  Efectivo = 'Efectivo',
}

// Estado de una cuenta
export enum AccountStatus {
  Activo = 'Activo',
  Inactivo = 'Inactivo',
}

// Niveles de utilización de crédito
export enum CreditHealthStatus {
  Saludable = 'Saludable',   // 0-30%
  Moderado = 'Moderado',     // 31-70%
  Critico = 'Crítico',       // 71-100%+
}

// Entidad principal de Cuenta
export interface Account {
  id: number;
  userId: number;
  name: string;                          // máximo 50 caracteres, no vacío
  initialBalance: number;                // -999,999,999.99 a 999,999,999.99
  currentBalance: number;                // calculado: initialBalance + ingresos - gastos + transferencias recibidas - transferencias enviadas
  currency: string;                      // MXN por defecto
  type: AccountType;
  bank: string | null;                   // máximo 50 caracteres, opcional
  status: AccountStatus;                 // Activo por defecto
  balanceLimit: number | null;           // umbral mínimo para alertas, opcional
  // Campos adicionales para cuentas de crédito
  creditLimit: number | null;            // 0.01-999,999,999.99 (requerido si type=Crédito)
  creditUtilization: number | null;      // porcentaje calculado
  creditHealthStatus: CreditHealthStatus | null;
  createdAt: string;
  updatedAt: string;
}

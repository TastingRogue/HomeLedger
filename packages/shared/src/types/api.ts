import type { AccountType } from './accounts.js';
import type { TransactionType } from './transactions.js';
import type { SubscriptionCycle } from './subscriptions.js';
import type { GoalType } from './goals.js';
import type { RuleCondition, RuleAction } from './rules.js';

// ============================================
// TIPOS DE RESPUESTA API
// ============================================

// Respuesta exitosa genérica
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// Respuesta de error
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;   // errores por campo
  };
}

// Resultado paginado
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ============================================
// INPUT DTOs - CUENTAS
// ============================================

export interface CreateAccountInput {
  name: string;                          // máximo 50 caracteres, no vacío
  initialBalance: number;                // -999,999,999.99 a 999,999,999.99
  currency?: string;                     // MXN por defecto
  type: AccountType;
  bank?: string;                         // máximo 50 caracteres, opcional
  balanceLimit?: number;                 // umbral mínimo para alertas, opcional
  // Campos requeridos para cuentas de crédito
  creditLimit?: number;                  // 0.01-999,999,999.99 (requerido si type=Crédito)
  linkedSubscriptionIds?: number[];      // suscripciones vinculadas (crédito)
}

// ============================================
// INPUT DTOs - TRANSACCIONES
// ============================================

export interface CreateTransactionInput {
  name: string;                          // máximo 100 caracteres
  accountId: number;
  date: string;                          // ISO 8601 con zona horaria
  categoryId: number;
  amount: number;                        // > 0, máximo 999,999,999.99, 2 decimales
  type: TransactionType;
  invoiceFile?: string;                  // ID o path del archivo adjunto
}

// Entrada rápida de transacción (campos mínimos)
export interface QuickTransactionInput {
  amount: number;                        // 0.01 a 999,999,999.99
  accountId: number;
  categoryId: number;
  type?: TransactionType;                // Gasto por defecto
}

// ============================================
// INPUT DTOs - TRANSFERENCIAS
// ============================================

export interface CreateTransferInput {
  name: string;                          // máximo 100 caracteres
  date: string;                          // ISO 8601
  amount: number;                        // > 0, ≤ 999,999,999.99
  sourceAccountId: number;
  destinationAccountId: number;          // debe ser ≠ sourceAccountId
}

// ============================================
// INPUT DTOs - SUSCRIPCIONES
// ============================================

export interface CreateSubscriptionInput {
  name: string;                          // máximo 100 caracteres
  startDate: string;                     // fecha de inicio
  amount: number;                        // 0.01 a 999,999,999.99
  cycle: SubscriptionCycle;
  categoryId: number;
  accountId: number;
  autoCharge?: boolean;                  // false por defecto
}

// ============================================
// INPUT DTOs - PRESUPUESTOS
// ============================================

export interface CreateBudgetInput {
  name: string;
  period: string;                        // 'Mensual' | 'Semanal'
  startDate: string;
  categories: Array<{
    categoryId: number;
    allocated: number;                   // monto asignado > 0
  }>;
  rolloverEnabled?: boolean;             // false por defecto
  alertThreshold?: number;               // 0-100, porcentaje para alerta
}

// ============================================
// INPUT DTOs - METAS DE AHORRO
// ============================================

export interface CreateGoalInput {
  name: string;                          // máximo 100 caracteres
  targetAmount: number;                  // MX$0.01 a MX$999,999,999.99
  type: GoalType;
  deadline?: string;                     // fecha límite opcional (ISO 8601)
}

// ============================================
// INPUT DTOs - REGLAS
// ============================================

export interface CreateRuleInput {
  name: string;
  priority: number;                      // menor = mayor prioridad
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled?: boolean;                     // true por defecto
}

// ============================================
// FILTROS Y PAGINACIÓN
// ============================================

export interface PaginationParams {
  page?: number;                         // default: 1
  pageSize?: number;                     // default: 20, max: 100
}

export interface TransactionFilters extends PaginationParams {
  accountId?: number;
  categoryId?: number;
  type?: TransactionType;
  startDate?: string;                    // ISO 8601
  endDate?: string;                      // ISO 8601
  search?: string;                       // búsqueda por nombre
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

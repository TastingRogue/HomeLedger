// @smart-finance/shared - Shared TypeScript types and interfaces
// This package contains all shared types used across backend and frontend

// Cuentas
export {
  AccountType,
  AccountStatus,
  CreditHealthStatus,
} from './types/accounts.js';
export type { Account } from './types/accounts.js';

// Transacciones
export { TransactionType } from './types/transactions.js';
export type { Transaction, TransactionSplit } from './types/transactions.js';

// Transferencias
export type { Transfer } from './types/transfers.js';

// Suscripciones
export {
  SubscriptionCycle,
  SubscriptionStatus,
} from './types/subscriptions.js';
export type { Subscription } from './types/subscriptions.js';

// Presupuestos
export { BudgetPeriod } from './types/budgets.js';
export type {
  Budget,
  BudgetCategory,
  BudgetWithProgress,
  BudgetSummary,
} from './types/budgets.js';

// Metas de ahorro
export { GoalType, GoalStatus } from './types/goals.js';
export type { Goal } from './types/goals.js';

// Categorías
export { PREDEFINED_CATEGORIES } from './types/categories.js';
export type {
  Category,
  Subcategory,
  PredefinedCategory,
} from './types/categories.js';

// Reglas de auto-categorización
export type {
  RuleOperator,
  RuleConditionField,
  RuleActionType,
  RuleCondition,
  RuleAction,
  Rule,
  RuleMatch,
  ApplyResult,
  TestResult,
} from './types/rules.js';

// Alertas
export { AlertType, AlertSeverity } from './types/alerts.js';
export type { Alert, AlertSettings } from './types/alerts.js';

// Activos y patrimonio neto
export { AssetType, LiabilityType } from './types/assets.js';
export type {
  Asset,
  Liability,
  NetWorthSnapshot,
  NetWorthSummary,
} from './types/assets.js';

// Préstamos
export { LoanStatus } from './types/loans.js';
export type {
  Loan,
  LoanPayment,
  AmortizationEntry,
} from './types/loans.js';

// Usuarios
export { UserRole } from './types/users.js';
export type { User, ApiKey, TokenPayload } from './types/users.js';

// API: Respuestas, DTOs, Filtros
export type {
  SuccessResponse,
  ErrorResponse,
  PaginatedResult,
  CreateAccountInput,
  CreateTransactionInput,
  QuickTransactionInput,
  CreateTransferInput,
  CreateSubscriptionInput,
  CreateBudgetInput,
  CreateGoalInput,
  CreateRuleInput,
  PaginationParams,
  TransactionFilters,
  DateRange,
} from './types/api.js';

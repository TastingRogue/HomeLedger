// @smart-finance/shared - Shared TypeScript types and interfaces
// This package contains all shared types used across backend and frontend

// Cuentas
export {
  AccountType,
  AccountStatus,
  CreditHealthStatus,
} from './types/accounts';
export type { Account } from './types/accounts';

// Transacciones
export { TransactionType } from './types/transactions';
export type { Transaction, TransactionSplit } from './types/transactions';

// Transferencias
export type { Transfer } from './types/transfers';

// Suscripciones
export {
  SubscriptionCycle,
  SubscriptionStatus,
} from './types/subscriptions';
export type { Subscription } from './types/subscriptions';

// Presupuestos
export { BudgetPeriod } from './types/budgets';
export type {
  Budget,
  BudgetCategory,
  BudgetWithProgress,
  BudgetSummary,
} from './types/budgets';

// Metas de ahorro
export { GoalType, GoalStatus } from './types/goals';
export type { Goal } from './types/goals';

// Categorías
export { PREDEFINED_CATEGORIES } from './types/categories';
export type {
  Category,
  Subcategory,
  PredefinedCategory,
} from './types/categories';

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
} from './types/rules';

// Alertas
export { AlertType, AlertSeverity } from './types/alerts';
export type { Alert, AlertSettings } from './types/alerts';

// Activos y patrimonio neto
export { AssetType, LiabilityType } from './types/assets';
export type {
  Asset,
  Liability,
  NetWorthSnapshot,
  NetWorthSummary,
} from './types/assets';

// Préstamos
export { LoanStatus } from './types/loans';
export type {
  Loan,
  LoanPayment,
  AmortizationEntry,
} from './types/loans';

// Usuarios
export { UserRole } from './types/users';
export type { User, ApiKey, TokenPayload } from './types/users';

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
} from './types/api';

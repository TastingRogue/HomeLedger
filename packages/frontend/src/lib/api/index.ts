// Core client utilities
export {
	apiRequest,
	apiGet,
	apiPost,
	apiPut,
	apiPatch,
	apiDelete,
	setTokens,
	clearTokens,
	hasToken,
	getAccessToken,
	getRefreshToken,
	ApiError
} from './client';
export type { RequestOptions } from './client';

// Auth module - named exports
export { login, register, logout, getMe } from './auth';
export type { LoginRequest, RegisterRequest, AuthUser, LoginResponse, RegisterResponse } from './auth';

// Auth module - namespace object (used by login/register pages)
import { login, register, logout, getMe } from './auth';
export const authApi = { login, register, logout, getMe };

// Accounts module
export {
	listAccounts,
	getAccounts,
	getAccount,
	getAccountById,
	createAccount,
	updateAccount,
	deactivateAccount
} from './accounts';
export type { AccountData, AccountDetail, CreateAccountPayload, UpdateAccountPayload } from './accounts';

// Transactions module
export {
	getTransactions,
	getTransactionById,
	createTransaction,
	quickCreateTransaction,
	updateTransaction,
	deleteTransaction
} from './transactions';
export type {
	Transaction,
	CreateTransactionInput,
	QuickTransactionInput,
	TransactionFilters,
	PaginatedTransactions
} from './transactions';

// Transfers module
export { listTransfers, createTransfer, updateTransfer, deleteTransfer } from './transfers';
export type { Transfer, CreateTransferPayload } from './transfers';

// Reports module
export { getDashboard } from './reports';
export type { DashboardData, AccountHealth, CategoryBreakdown, NextSubscription, ActiveGoal } from './reports';

// Subscriptions module
export {
	listSubscriptions,
	createSubscription,
	updateSubscription,
	deactivateSubscription,
	getSubscriptionCalendar
} from './subscriptions';
export type {
	Subscription,
	SubscriptionCalendarEntry,
	SubscriptionCycle,
	SubscriptionStatus,
	CreateSubscriptionPayload,
	UpdateSubscriptionPayload
} from './subscriptions';

// Goals module
export {
	listGoals,
	createGoal,
	updateGoal,
	fundGoal,
	withdrawGoal
} from './goals';
export type {
	GoalData,
	GoalType,
	GoalStatus,
	CreateGoalPayload,
	UpdateGoalPayload,
	FundGoalPayload,
	FundGoalResponse,
	WithdrawGoalResponse
} from './goals';

// Budgets module
export {
	listBudgets,
	getBudget,
	getBudgetSummary,
	createBudget,
	updateBudget,
	deleteBudget
} from './budgets';
export type {
	BudgetWithProgress,
	BudgetSummary,
	BudgetCategory,
	BudgetPeriod,
	CategoryAllocation,
	CreateBudgetPayload,
	UpdateBudgetPayload
} from './budgets';

// Alerts module
export {
	listAlerts,
	markAlertAsRead,
	markAllAlertsAsRead,
	getAlertSettings,
	updateAlertSettings
} from './alerts';
export type {
	AlertData,
	AlertType,
	AlertSeverity,
	AlertSettings
} from './alerts';

// Categories module
export {
	listCategories,
	getCategoryAnalysis,
	createCategory,
	updateCategory,
	deleteCategory,
	createSubcategory
} from './categories';
export type {
	Category,
	Subcategory,
	CategoryAnalysisItem,
	CreateCategoryPayload,
	UpdateCategoryPayload
} from './categories';

// Backup module
export {
	exportBackup,
	importBackup,
	getBackupHistory
} from './backup';
export type {
	BackupFile,
	BackupHistoryEntry,
	ImportResult
} from './backup';

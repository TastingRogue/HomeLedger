import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// ============================================
// USERS & AUTH
// ============================================

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'user', 'viewer'] }).notNull().default('user'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  uniqueIndex('users_email_unique').on(table.email),
]);

export const apiKeys = sqliteTable('api_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  key: text('key').notNull(),
  createdAt: text('created_at').notNull(),
  lastUsedAt: text('last_used_at'),
}, (table) => [
  uniqueIndex('api_keys_key_unique').on(table.key),
  index('api_keys_user_id_idx').on(table.userId),
]);

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('refresh_tokens_token_unique').on(table.token),
  index('refresh_tokens_user_id_idx').on(table.userId),
]);

// ============================================
// ACCOUNTS
// ============================================

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ['Débito', 'Crédito', 'Inversión', 'Vales', 'Efectivo'] }).notNull(),
  bank: text('bank'),
  initialBalance: real('initial_balance').notNull().default(0),
  balanceLimit: real('balance_limit'),
  creditLimit: real('credit_limit'),
  status: text('status', { enum: ['Activo', 'Inactivo'] }).notNull().default('Activo'),
  currency: text('currency').notNull().default('MXN'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('accounts_user_id_idx').on(table.userId),
  index('accounts_user_id_status_idx').on(table.userId, table.status),
]);

// ============================================
// CATEGORIES & SUBCATEGORIES
// ============================================

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  type: text('type', { enum: ['Gasto', 'Ingreso', 'Ambos'] }).notNull().default('Ambos'),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('categories_user_id_idx').on(table.userId),
]);

export const subcategories = sqliteTable('subcategories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('subcategories_category_id_idx').on(table.categoryId),
]);

// ============================================
// TRANSACTIONS & SPLITS
// ============================================

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  subcategoryId: integer('subcategory_id').references(() => subcategories.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  type: text('type', { enum: ['Ingreso', 'Gasto'] }).notNull(),
  date: text('date').notNull(),
  notes: text('notes'),
  attachmentId: integer('attachment_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('transactions_user_id_idx').on(table.userId),
  index('transactions_account_id_idx').on(table.accountId),
  index('transactions_category_id_idx').on(table.categoryId),
  index('transactions_date_idx').on(table.date),
  index('transactions_user_id_date_idx').on(table.userId, table.date),
  index('transactions_user_id_type_idx').on(table.userId, table.type),
]);

export const transactionSplits = sqliteTable('transaction_splits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  transactionId: integer('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  amount: real('amount').notNull(),
  note: text('note'),
}, (table) => [
  index('transaction_splits_transaction_id_idx').on(table.transactionId),
]);

// ============================================
// TRANSFERS
// ============================================

export const transfers = sqliteTable('transfers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sourceAccountId: integer('source_account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  destinationAccountId: integer('destination_account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('transfers_user_id_idx').on(table.userId),
  index('transfers_source_account_id_idx').on(table.sourceAccountId),
  index('transfers_destination_account_id_idx').on(table.destinationAccountId),
  index('transfers_date_idx').on(table.date),
]);

// ============================================
// BUDGETS
// ============================================

export const budgets = sqliteTable('budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  period: text('period', { enum: ['monthly', 'weekly'] }).notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('budgets_user_id_idx').on(table.userId),
  index('budgets_user_id_period_idx').on(table.userId, table.period),
]);

export const budgetCategories = sqliteTable('budget_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  budgetId: integer('budget_id').notNull().references(() => budgets.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  allocated: real('allocated').notNull(),
  rollover: real('rollover').notNull().default(0),
}, (table) => [
  index('budget_categories_budget_id_idx').on(table.budgetId),
  index('budget_categories_category_id_idx').on(table.categoryId),
]);

// ============================================
// SUBSCRIPTIONS & RECURRING TRANSACTIONS
// ============================================

export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  cycle: text('cycle', { enum: ['Semanal', 'Mensual'] }).notNull(),
  startDate: text('start_date').notNull(),
  nextPaymentDate: text('next_payment_date').notNull(),
  autoCharge: integer('auto_charge', { mode: 'boolean' }).notNull().default(false),
  status: text('status', { enum: ['Activa', 'Inactiva'] }).notNull().default('Activa'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('subscriptions_user_id_idx').on(table.userId),
  index('subscriptions_user_id_status_idx').on(table.userId, table.status),
  index('subscriptions_next_payment_date_idx').on(table.nextPaymentDate),
]);

export const recurringTransactions = sqliteTable('recurring_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  type: text('type', { enum: ['Ingreso', 'Gasto'] }).notNull(),
  frequency: text('frequency').notNull(),
  nextDate: text('next_date').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('recurring_transactions_user_id_idx').on(table.userId),
  index('recurring_transactions_next_date_idx').on(table.nextDate),
]);

// ============================================
// GOALS
// ============================================

export const goals = sqliteTable('goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  targetAmount: real('target_amount').notNull(),
  savedAmount: real('saved_amount').notNull().default(0),
  type: text('type', { enum: ['ListaDeseos', 'Deuda'] }).notNull(),
  deadline: text('deadline'),
  status: text('status', { enum: ['Activa', 'Completada'] }).notNull().default('Activa'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('goals_user_id_idx').on(table.userId),
  index('goals_user_id_status_idx').on(table.userId, table.status),
]);

// ============================================
// RULES (Auto-categorization)
// ============================================

export const rules = sqliteTable('rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  priority: integer('priority').notNull().default(0),
  conditions: text('conditions', { mode: 'json' }).notNull(),
  actions: text('actions', { mode: 'json' }).notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  matchCount: integer('match_count').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('rules_user_id_idx').on(table.userId),
  index('rules_user_id_priority_idx').on(table.userId, table.priority),
]);

// ============================================
// IMPORTS
// ============================================

export const imports = sqliteTable('imports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  parser: text('parser').notNull(),
  status: text('status', { enum: ['pending', 'completed', 'failed'] }).notNull().default('pending'),
  recordCount: integer('record_count'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('imports_user_id_idx').on(table.userId),
]);

// ============================================
// ATTACHMENTS
// ============================================

export const attachments = sqliteTable('attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  transactionId: integer('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  transferId: integer('transfer_id').references(() => transfers.id, { onDelete: 'set null' }),
  filename: text('filename').notNull(),
  originalName: text('original_name'),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  path: text('path').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('attachments_user_id_idx').on(table.userId),
  index('attachments_transaction_id_idx').on(table.transactionId),
  index('attachments_transfer_id_idx').on(table.transferId),
]);

// ============================================
// ASSETS & LIABILITIES (Net Worth)
// ============================================

export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  value: real('value').notNull(),
  type: text('type').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('assets_user_id_idx').on(table.userId),
]);

export const liabilities = sqliteTable('liabilities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  balance: real('balance').notNull(),
  type: text('type').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('liabilities_user_id_idx').on(table.userId),
]);

export const networthSnapshots = sqliteTable('networth_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  totalAssets: real('total_assets').notNull(),
  totalLiabilities: real('total_liabilities').notNull(),
  netWorth: real('net_worth').notNull(),
  date: text('date').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('networth_snapshots_user_id_idx').on(table.userId),
  index('networth_snapshots_user_id_date_idx').on(table.userId, table.date),
]);

// ============================================
// LOANS & LOAN PAYMENTS
// ============================================

export const loans = sqliteTable('loans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  principal: real('principal').notNull(),
  interestRate: real('interest_rate').notNull(),
  term: integer('term').notNull(),
  remainingAmount: real('remaining_amount').notNull(),
  startDate: text('start_date').notNull(),
  status: text('status', { enum: ['active', 'paid'] }).notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('loans_user_id_idx').on(table.userId),
  index('loans_user_id_status_idx').on(table.userId, table.status),
]);

export const loanPayments = sqliteTable('loan_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  loanId: integer('loan_id').notNull().references(() => loans.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  principal: real('principal').notNull(),
  interest: real('interest').notNull(),
  date: text('date').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('loan_payments_loan_id_idx').on(table.loanId),
  index('loan_payments_date_idx').on(table.date),
]);

// ============================================
// ALERTS
// ============================================

export const alerts = sqliteTable('alerts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  severity: text('severity').notNull(),
  data: text('data', { mode: 'json' }),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  hash: text('hash').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('alerts_hash_unique').on(table.hash),
  index('alerts_user_id_idx').on(table.userId),
  index('alerts_user_id_is_read_idx').on(table.userId, table.isRead),
]);

// ============================================
// CREDIT SUBSCRIPTIONS (Join Table)
// ============================================

export const creditSubscriptions = sqliteTable('credit_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  subscriptionId: integer('subscription_id').notNull().references(() => subscriptions.id, { onDelete: 'cascade' }),
}, (table) => [
  index('credit_subscriptions_account_id_idx').on(table.accountId),
  index('credit_subscriptions_subscription_id_idx').on(table.subscriptionId),
  uniqueIndex('credit_subscriptions_account_subscription_unique').on(table.accountId, table.subscriptionId),
]);



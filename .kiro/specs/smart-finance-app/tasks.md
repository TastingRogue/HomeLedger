# Implementation Plan: Smart Finance

## Overview

Implementation of Smart Finance as a self-hosted personal finance management application using a monorepo architecture with SvelteKit frontend, Fastify backend API, SQLite database (via Drizzle ORM), and Docker deployment. The implementation follows an incremental approach: project setup → shared types → data layer → business logic services → API routes → frontend → infrastructure (scheduler, PWA, Docker).

## Tasks

- [x] 1. Set up monorepo structure, tooling, and shared types
  - [x] 1.1 Initialize monorepo with workspace configuration
    - Create root `package.json` with npm workspaces for `packages/backend`, `packages/frontend`, `packages/shared`
    - Add root `tsconfig.base.json` with strict TypeScript settings
    - Add `.env.example` with all environment variables (JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, TZ, DATA_DIR, PORT)
    - Install shared dev dependencies: vitest, fast-check, prettier, eslint
    - _Requirements: 14.1, 14.2_

  - [x] 1.2 Create shared types package (`packages/shared`)
    - Define all TypeScript interfaces: Account, Transaction, Transfer, Subscription, Budget, Goal, Category, Rule, Alert, Asset, Liability, Loan, User
    - Define enums: AccountType (Ahorros, Crédito, Inversión, Vales, Efectivo), TransactionType (Ingreso, Gasto), SubscriptionCycle, GoalType, AccountStatus
    - Define API response types: SuccessResponse<T>, ErrorResponse, PaginatedResult<T>
    - Define input DTOs: CreateAccountInput, CreateTransactionInput, QuickTransactionInput, CreateTransferInput, CreateSubscriptionInput, CreateBudgetInput, CreateGoalInput, CreateRuleInput
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 5.1, 6.1, 12.5_

  - [x] 1.3 Create Zod validation schemas (`packages/backend/src/validators/`)
    - Create `account.schema.ts`: name (max 50 chars, non-empty), initialBalance (-999999999.99 to 999999999.99), type enum, bank (max 50, optional), balanceLimit (optional), creditLimit (required if type=Crédito)
    - Create `transaction.schema.ts`: name (max 100 chars), accountId, date (ISO 8601), categoryId, amount (>0, max 999999999.99, 2 decimals), type enum
    - Create `transfer.schema.ts`: name (max 100 chars), date, amount (>0, ≤999999999.99), sourceAccountId, destinationAccountId (≠ sourceAccountId)
    - Create `subscription.schema.ts`: name (max 100 chars), startDate, amount (0.01 to 999999999.99), cycle enum, categoryId, accountId, autoCharge boolean
    - Create `goal.schema.ts`: name (max 100 chars), targetAmount (0.01 to 999999999.99), type enum, deadline (optional)
    - Create `budget.schema.ts`, `rule.schema.ts`, `import.schema.ts`, `auth.schema.ts`, `backup.schema.ts`
    - _Requirements: 1.1, 1.6, 2.1, 2.7, 3.1, 3.3, 4.1, 5.1, 6.1, 11.7_

- [x] 2. Implement database schema and data layer
  - [x] 2.1 Create Drizzle ORM schema (`packages/backend/src/db/schema.ts`)
    - Define all tables as specified in design: users, apiKeys, refreshTokens, accounts, categories, subcategories, transactions, transactionSplits, transfers, budgets, budgetCategories, subscriptions, recurringTransactions, goals, rules, imports, attachments, assets, liabilities, networthSnapshots, loans, loanPayments, alerts, creditSubscriptions
    - Define all indexes and unique constraints as specified
    - _Requirements: 13.1, 13.2_

  - [x] 2.2 Create database connection and migration setup
    - Create `packages/backend/src/db/connection.ts` with SQLite WAL mode, busy timeout, and connection singleton
    - Set up Drizzle migration configuration for `packages/backend/src/db/migrations/`
    - Generate initial migration from schema
    - _Requirements: 13.1, 13.2_

  - [x] 2.3 Create seed data (`packages/backend/src/db/seed.ts`)
    - Seed predefined categories: Comida, Compras, Corrección, Despensa, Dividendos, Educación, Entretenimiento, Gasolina, ISP, Limpieza, Luz, MX-5, Nómina, Préstamo, Renta, Salud, Telefonía, Transporte, Vales
    - Auto-create admin user from env vars on first run
    - _Requirements: 10.4_

- [x] 3. Checkpoint - Verify data layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement core utility functions
  - [x] 4.1 Create currency and date formatting utilities (`packages/backend/src/utils/`)
    - Implement `formatCurrency(amount: number): string` → "MX$X,XXX.XX" format with comma thousands, dot decimal, 2 decimal places, "-" prefix for negatives, "MX$0.00" for zero
    - Implement `formatDate(date: Date): string` → "d de MMMM de yyyy" in Spanish
    - Implement `formatTime(date: Date): string` → "HH:mm" in America/Mexico_City timezone
    - Implement `formatDateShort(date: Date): string` → "dd/MM/yyyy"
    - _Requirements: 12.3, 12.4, 12.6_

  - [ ]* 4.2 Write property tests for currency formatting
    - **Property 19: Currency Formatting**
    - **Validates: Requirements 12.3, 12.6**

  - [ ]* 4.3 Write property tests for date formatting
    - **Property 20: Date Formatting in Spanish**
    - **Validates: Requirements 12.4**

- [x] 5. Implement authentication service
  - [x] 5.1 Implement AuthService (`packages/backend/src/services/auth.service.ts`)
    - Implement `register()`: bcrypt hash (salt rounds=12), first user = admin, return JWT
    - Implement `login()`: validate credentials, return accessToken (15min) + refreshToken (7 days)
    - Implement `refresh()`: validate refresh token, issue new access token
    - Implement `logout()`: invalidate refresh token
    - Implement `validateToken()`: verify JWT signature and expiration
    - Implement `generateApiKey()` and `revokeApiKey()`
    - _Requirements: 14.2_

  - [x] 5.2 Create auth middleware (`packages/backend/src/middleware/`)
    - Implement JWT validation middleware for protected routes
    - Implement role-based access control (admin, user, viewer)
    - Implement API key authentication as alternative to JWT
    - Implement rate-limit middleware: 100 req/min for auth endpoints, 1000 req/min general
    - _Requirements: 14.2_

- [x] 6. Implement Account service and API
  - [x] 6.1 Implement AccountService (`packages/backend/src/services/account.service.ts`)
    - Implement `create()`: validate unique name among active accounts for user, store in DB
    - Implement `update()`: validate unique name excluding self, persist changes
    - Implement `deactivate()`: set status=Inactivo, exclude from panel
    - Implement `getActive()`: return all active accounts for user
    - Implement `calculateBalance()`: initialBalance + Σincomes - Σexpenses + ΣtransfersIn - ΣtransfersOut
    - Implement `validateUniqueName()`: check no other active account has same name for user
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 6.2 Write property tests for account balance calculation
    - **Property 1: Balance Calculation Invariant**
    - **Validates: Requirements 1.5, 2.2, 2.3**

  - [ ]* 6.3 Write property test for account name uniqueness
    - **Property 23: Account Name Uniqueness Among Active**
    - **Validates: Requirements 1.7**

  - [x] 6.4 Create account API routes (`packages/backend/src/routes/v1/accounts.routes.ts`)
    - GET /api/v1/accounts - list active accounts for user
    - GET /api/v1/accounts/:id - detail with calculated balance
    - POST /api/v1/accounts - create with validation
    - PUT /api/v1/accounts/:id - edit with validation
    - PATCH /api/v1/accounts/:id/deactivate - deactivate
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 7. Implement Transaction service and API
  - [x] 7.1 Implement TransactionService (`packages/backend/src/services/transaction.service.ts`)
    - Implement `create()`: validate fields, register transaction, update account balance (Gasto subtracts, Ingreso adds)
    - Implement `update()`: revert old effect, apply new effect (handle account change)
    - Implement `delete()`: revert balance effect on associated account
    - Implement `list()`: paginated results with filters (account, category, type, date range), sorted by date desc
    - Implement `quickCreate()`: auto-fill date/time (CST), use category name as transaction name
    - Implement `split()`: divide transaction into category splits, validate sum = parent amount
    - All balance-modifying operations use atomic database transactions
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 11.2_

  - [ ]* 7.2 Write property tests for transaction balance effects
    - **Property 2: Transaction Effect on Balance**
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 7.3 Write property test for transaction deletion round-trip
    - **Property 3: Transaction Deletion Round-Trip**
    - **Validates: Requirements 2.5**

  - [ ]* 7.4 Write property test for transaction edit balance correction
    - **Property 4: Transaction Edit Balance Correction**
    - **Validates: Requirements 2.8, 2.9**

  - [ ]* 7.5 Write property test for transaction split sum invariant
    - **Property 28: Transaction Split Sum Invariant**
    - **Validates: Requirements 17.1**

  - [ ]* 7.6 Write property test for quick registration auto-population
    - **Property 33: Quick Registration Auto-Population**
    - **Validates: Requirements 11.2**

  - [x] 7.7 Create transaction API routes (`packages/backend/src/routes/v1/transactions.routes.ts`)
    - GET /api/v1/transactions - list with filters and pagination
    - GET /api/v1/transactions/:id - detail including splits
    - POST /api/v1/transactions - create
    - PUT /api/v1/transactions/:id - edit
    - DELETE /api/v1/transactions/:id - delete with balance reversal
    - POST /api/v1/transactions/quick - quick registration
    - POST /api/v1/transactions/:id/split - split into categories
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 11.1, 11.2_

- [x] 8. Implement Transfer service and API
  - [x] 8.1 Implement TransferService (`packages/backend/src/services/transfer.service.ts`)
    - Implement `create()`: validate source ≠ destination, validate sufficient funds in source, atomic debit/credit
    - Implement `delete()`: atomic reversal (add to source, subtract from destination)
    - Implement `list()`: ordered by date descending
    - All operations use database transactions for atomicity
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 8.2 Write property tests for transfers
    - **Property 5: Transfer Preserves Total Balance**
    - **Property 6: Transfer Deletion Round-Trip**
    - **Property 7: Transfer Same-Account Rejection**
    - **Property 8: Transfer Insufficient Funds Rejection**
    - **Validates: Requirements 3.2, 3.3, 3.5, 3.6**

  - [x] 8.3 Create transfer API routes (`packages/backend/src/routes/v1/transfers.routes.ts`)
    - GET /api/v1/transfers - list
    - POST /api/v1/transfers - create with validation
    - DELETE /api/v1/transfers/:id - delete with reversal
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 9. Checkpoint - Verify core financial operations
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Subscription and Recurring service
  - [x] 10.1 Implement SubscriptionService (`packages/backend/src/services/subscription.service.ts`)
    - Implement `create()`: validate fields, store subscription
    - Implement `calculateNextPayment()`: Semanal = +7 days, Mensual = +1 month with day-of-month clamping
    - Implement `calculateDaysRemaining()`: diff between next payment date and today, 0 when due today
    - Implement `deactivate()`: set status=Inactiva, stop calculations
    - Implement `processAutoCharges()`: for each active subscription with autoCharge where nextPayment=today, create Gasto transaction regardless of account balance
    - Implement `getCalendar()`: return all active subscriptions sorted by days remaining ascending
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 10.2 Write property tests for subscription calculations
    - **Property 9: Subscription Next Payment Calculation**
    - **Property 10: Subscription Automatic Charge Creates Transaction**
    - **Validates: Requirements 4.2, 4.4, 4.7**

  - [x] 10.3 Create subscription API routes (`packages/backend/src/routes/v1/subscriptions.routes.ts`)
    - GET /api/v1/subscriptions - list
    - POST /api/v1/subscriptions - create
    - PUT /api/v1/subscriptions/:id - edit
    - PATCH /api/v1/subscriptions/:id/deactivate - deactivate
    - GET /api/v1/subscriptions/calendar - payment calendar
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

- [x] 11. Implement Credit Monitoring and Alert services
  - [x] 11.1 Implement credit monitoring logic in AccountService
    - Implement `calculateCreditUtilization()`: |balance| / creditLimit * 100
    - Implement `getCreditHealthStatus()`: saludable (0-30%), moderado (31-70%), crítico (71-100%+)
    - Implement `getLinkedSubscriptions()`: return subscriptions linked to credit account
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_

  - [x] 11.2 Implement AlertService (`packages/backend/src/services/alert.service.ts`)
    - Implement `evaluateBalanceLow()`: generate alert when balance drops below balanceLimit (one-time until recovery)
    - Implement `evaluateCreditHigh()`: generate alert when utilization crosses 80% upward (non-repetitive)
    - Implement `evaluatePaymentDue()`: generate alert when subscription ≤3 days remaining
    - Implement `evaluatePaymentOverdue()`: generate alert when subscription days remaining = 0
    - Implement `evaluateGoalCompleted()`: generate alert when goal reaches 100%
    - Use hash-based deduplication to prevent duplicate alerts
    - Skip evaluation for accounts without balanceLimit configured
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 5.4_

  - [ ]* 11.3 Write property tests for credit utilization and alerts
    - **Property 11: Credit Utilization Calculation and Classification**
    - **Property 12: Credit Utilization Alert Non-Repetitive**
    - **Property 18: Balance Health Alert Threshold**
    - **Validates: Requirements 5.2, 5.3, 5.4, 9.1, 9.2, 9.6**

  - [ ]* 11.4 Write property test for calendar payment classification
    - **Property 17: Calendar Payment Status Classification**
    - **Validates: Requirements 8.2, 8.4, 8.6**

- [x] 12. Implement Goals service and API
  - [x] 12.1 Implement GoalService (`packages/backend/src/services/goal.service.ts`)
    - Implement `create()`: validate fields, store goal with savedAmount=0
    - Implement `fund()`: increment savedAmount by min(amount, targetAmount - savedAmount), update progress, set Completada if 100%
    - Implement `withdraw()`: decrement savedAmount by min(amount, savedAmount), ensuring floor of 0
    - Implement `calculateProgress()`: (savedAmount / targetAmount) * 100, capped at 100%
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 12.2 Write property tests for goals
    - **Property 13: Savings Goal Fund Assignment with Cap**
    - **Property 14: Savings Goal Fund Withdrawal Floor**
    - **Validates: Requirements 6.4, 6.5, 6.6, 6.7**

  - [x] 12.3 Create goals API routes (`packages/backend/src/routes/v1/goals.routes.ts`)
    - GET /api/v1/goals - list
    - POST /api/v1/goals - create
    - PUT /api/v1/goals/:id - edit
    - POST /api/v1/goals/:id/fund - assign funds
    - POST /api/v1/goals/:id/withdraw - withdraw funds
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 13. Implement Budget service and API
  - [x] 13.1 Implement BudgetService (`packages/backend/src/services/budget.service.ts`)
    - Implement `create()`: budget with category allocations
    - Implement `getCurrent()`: calculate spent per category (sum of Gasto in period), remaining = (allocated + rollover) - spent
    - Implement `getSummary()`: total allocated vs total spent for period
    - Implement `processRollover()`: carry over unused amounts to next period
    - Implement `evaluateAlerts()`: alert when spent exceeds threshold %, alert when exceeded 100%
    - _Requirements: 7.2_

  - [ ]* 13.2 Write property tests for budget calculations
    - **Property 24: Budget Calculation Correctness**
    - **Property 25: Budget Alert on Threshold Exceeded**
    - **Validates: Requirements 15.1, 15.2, 15.3**

  - [x] 13.3 Create budget API routes (`packages/backend/src/routes/v1/budgets.routes.ts`)
    - GET /api/v1/budgets - list for current period
    - GET /api/v1/budgets/:id - detail with per-category progress
    - POST /api/v1/budgets - create
    - PUT /api/v1/budgets/:id - edit
    - DELETE /api/v1/budgets/:id - delete
    - GET /api/v1/budgets/summary - spent vs available
    - _Requirements: 7.2_

- [x] 14. Implement Categories service and API
  - [x] 14.1 Implement CategoryService (`packages/backend/src/services/category.service.ts`)
    - Implement `list()`: return categories with subcategories, support user-created + predefined
    - Implement `create()`: validate unique name (max 50 chars), create category
    - Implement `delete()`: only if no transactions associated
    - Implement `getAnalysis()`: calculate totals per category for date range, sorted by total desc, excluding zero-total, with percentage calculation
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 14.2 Write property test for category analysis
    - **Property 16: Category Analysis Totals and Percentages**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.6**

  - [x] 14.3 Create categories API routes (`packages/backend/src/routes/v1/categories.routes.ts`)
    - GET /api/v1/categories - list with subcategories
    - POST /api/v1/categories - create
    - PUT /api/v1/categories/:id - edit
    - DELETE /api/v1/categories/:id - delete (only if unused)
    - POST /api/v1/categories/:id/subcategories - create subcategory
    - _Requirements: 10.4, 10.5_

- [x] 15. Checkpoint - Verify all business services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Implement Rules Engine
  - [x] 16.1 Implement RulesEngineService (`packages/backend/src/services/rules-engine.service.ts`)
    - Implement `evaluate()`: sort enabled rules by priority asc, apply first matching rule's actions
    - Implement condition evaluators: contains, equals, startsWith, endsWith, greaterThan, lessThan, between, regex (with timeout/sandbox)
    - Implement `applyToUncategorized()`: run rules against all uncategorized transactions
    - Implement `test()`: dry-run rule against provided transactions
    - _Requirements: design Rules Engine section_

  - [ ]* 16.2 Write property tests for rules engine
    - **Property 26: Rules Engine Priority Ordering**
    - **Property 27: Rules Engine Condition Evaluation**
    - **Validates: Requirements 16.1, 16.2**

  - [x] 16.3 Create rules API routes (`packages/backend/src/routes/v1/rules.routes.ts`)
    - GET /api/v1/rules - list
    - POST /api/v1/rules - create
    - PUT /api/v1/rules/:id - edit
    - DELETE /api/v1/rules/:id - delete
    - POST /api/v1/rules/test - test rule
    - POST /api/v1/rules/apply - apply to uncategorized
    - _Requirements: design Rules Engine section_

- [x] 17. Implement Import Engine
  - [x] 17.1 Implement import infrastructure (`packages/backend/src/importers/`)
    - Create `base-importer.ts` with BankParser interface
    - Create `generic.parser.ts` for manual CSV mapping
    - Create bank-specific parsers: `bbva.parser.ts`, `santander.parser.ts`, `nu.parser.ts`
    - Implement file format detection (CSV, OFX, Excel)
    - _Requirements: design Import Engine section_

  - [x] 17.2 Implement ImportService (`packages/backend/src/services/import.service.ts`)
    - Implement `upload()`: detect parser, create import session
    - Implement `preview()`: parse file, return transactions for review
    - Implement `confirm()`: bulk insert confirmed transactions with duplicate detection
    - Auto-apply rules engine to imported transactions
    - _Requirements: design Import Engine section_

  - [ ]* 17.3 Write property test for CSV import
    - **Property 32: Import CSV Round-Trip**
    - **Validates: Requirements 21.1**

  - [x] 17.4 Create import API routes (`packages/backend/src/routes/v1/imports.routes.ts`)
    - POST /api/v1/imports/upload - upload file
    - GET /api/v1/imports/:id/preview - preview parsed transactions
    - POST /api/v1/imports/:id/confirm - confirm import
    - GET /api/v1/imports/history - import history
    - GET /api/v1/imports/parsers - available parsers
    - _Requirements: design Import Engine section_

- [x] 18. Implement Net Worth and Loans
  - [x] 18.1 Implement NetWorthService (`packages/backend/src/services/networth.service.ts`)
    - Implement `getCurrent()`: sum(active account balances) + sum(asset values) - sum(liability balances)
    - Implement `getHistory()`: return snapshots over date range
    - CRUD for assets and liabilities
    - _Requirements: design Net Worth section_

  - [ ]* 18.2 Write property test for net worth calculation
    - **Property 29: Net Worth Calculation**
    - **Validates: Requirements 18.1**

  - [x] 18.3 Implement LoanService and create API routes
    - CRUD for loans with payment tracking
    - Implement `recordPayment()`: reduce remainingAmount, set status=paid when 0
    - Generate amortization schedule
    - _Requirements: design Loans section_

  - [ ]* 18.4 Write property test for loan payments
    - **Property 30: Loan Payment Reduces Remaining**
    - **Validates: Requirements 19.1**

- [x] 19. Implement Backup service
  - [x] 19.1 Implement BackupService (`packages/backend/src/services/backup.service.ts`)
    - Implement `export()`: serialize all entities to JSON with app version and ISO 8601 date
    - Implement `import()`: validate schema and version, replace all data atomically, require confirmation
    - Validate schema on import: reject invalid format or incompatible version with error message
    - _Requirements: 13.3, 13.4, 13.7, 13.8, 13.9_

  - [ ]* 19.2 Write property tests for backup
    - **Property 21: Backup Export/Import Round-Trip**
    - **Property 22: Invalid Backup Rejection**
    - **Validates: Requirements 13.3, 13.4, 13.7, 13.8**

  - [x] 19.3 Create backup API routes (`packages/backend/src/routes/v1/backup.routes.ts`)
    - POST /api/v1/backup/export - export to JSON
    - POST /api/v1/backup/import - import from JSON
    - GET /api/v1/backup/history - backup history
    - _Requirements: 13.3, 13.4_

- [x] 20. Implement Reports and Dashboard service
  - [x] 20.1 Implement ReportService (`packages/backend/src/services/report.service.ts`)
    - Implement `getDashboard()`: consolidated balance (all active accounts), monthly income/expense summary, per-category breakdown, account health indicators, next 5 subscriptions, active goals progress
    - Implement `getCashFlow()`: income vs expenses by period
    - Implement `getTrends()`: monthly evolution over N months
    - Implement `getCategoryAnalysis()`: totals per category with percentages
    - Implement `getBudgetVsActual()`: budget comparison
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 20.2 Write property test for dashboard consolidated balance
    - **Property 15: Dashboard Consolidated Balance**
    - **Validates: Requirements 7.1, 1.4**

  - [x] 20.3 Create reports API routes (`packages/backend/src/routes/v1/reports.routes.ts`)
    - GET /api/v1/reports/dashboard - main dashboard data
    - GET /api/v1/reports/cashflow - cash flow by period
    - GET /api/v1/reports/trends - monthly trends
    - GET /api/v1/reports/categories - category analysis
    - GET /api/v1/reports/budget-vs-actual - budget comparison
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 21. Checkpoint - Verify all backend services and API
  - Ensure all tests pass, ask the user if questions arise.

- [x] 22. Implement Fastify server and wire all routes
  - [x] 22.1 Create Fastify server entry point (`packages/backend/src/server.ts`)
    - Initialize Fastify with logging, CORS, and error handler
    - Register all route plugins under /api/v1 prefix
    - Register auth middleware globally with exclusions for public routes
    - Set up graceful shutdown
    - Add health check endpoint: GET /api/v1/health
    - _Requirements: 14.2_

  - [x] 22.2 Implement scheduler (`packages/backend/src/scheduler/`)
    - Create `auto-charge.job.ts`: daily at 00:05 CST, process subscriptions with autoCharge due today
    - Create `alert-evaluation.job.ts`: every hour, evaluate pending alerts (payment due in ≤3 days)
    - Create `budget-reset.job.ts`: first of month, handle budget period transitions and rollovers
    - Wire scheduler into server startup
    - _Requirements: 4.4, 9.3_

  - [ ]* 22.3 Write property test for multi-user data isolation
    - **Property 31: Multi-User Data Isolation**
    - **Validates: Requirements 20.1**

- [x] 23. Implement SvelteKit frontend - Core structure
  - [x] 23.1 Initialize SvelteKit project (`packages/frontend`)
    - Set up SvelteKit with Node adapter for Docker deployment
    - Configure for SSR + SPA hybrid mode
    - Create API client library (`src/lib/api/`) that communicates with Fastify backend
    - Set up Svelte stores for auth state, accounts, and UI preferences
    - Configure i18n for Spanish (all labels, messages, errors in Spanish)
    - _Requirements: 12.1, 12.5_

  - [x] 23.2 Implement authentication pages
    - Create login page with email/password form
    - Create registration page (for first-time setup)
    - Implement token management (store, refresh, redirect on 401)
    - _Requirements: 14.2_

  - [x] 23.3 Implement main dashboard page
    - Show consolidated balance (sum of active accounts)
    - Show monthly income/expense summary with category breakdown
    - Show account health indicators (balance vs limit)
    - Show next 5 subscriptions with days remaining
    - Show active goals with progress bars
    - Show empty states with guidance messages when no data
    - Auto-update within 2 seconds of changes
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 24. Implement frontend - Financial management pages
  - [x] 24.1 Implement accounts management page
    - List all accounts with name, balance, type, and health indicator
    - Create/edit account forms with field validation
    - Deactivate account with confirmation
    - Credit accounts: show utilization percentage with visual indicator (green/yellow/red)
    - Show linked subscriptions for credit accounts
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.1, 5.2, 5.3, 5.5_

  - [x] 24.2 Implement transactions page
    - List transactions sorted by date desc with filters (account, category, type, date range)
    - Pagination support
    - Create/edit transaction forms with validation
    - Delete with confirmation and balance reversal indication
    - _Requirements: 2.1, 2.4, 2.6, 2.7_

  - [x] 24.3 Implement quick registration interface
    - Mobile-optimized quick entry: monto, cuenta, categoría, tipo (Gasto default)
    - Numeric keypad with 48x48dp minimum touch targets
    - Most recent 5 accounts/categories shown first, then alphabetical
    - Complete in maximum 3 steps from main screen
    - Auto-populate date/time (CST) and name (category name)
    - Show confirmation toast for 2+ seconds on success
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 24.4 Implement transfers page
    - List transfers sorted by date desc
    - Create transfer form with source/destination account selection
    - Validation: different accounts, sufficient funds
    - Delete with reversal
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 25. Implement frontend - Subscriptions, Goals, and Budgets
  - [x] 25.1 Implement subscriptions management and payment calendar
    - List subscriptions with name, amount, cycle, days remaining, status
    - Create/edit form with all fields including autoCharge toggle
    - Payment calendar view: sorted by proximity, urgent (1-3 days) and overdue indicators
    - Empty state when no active subscriptions
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 8.1, 8.2, 8.3, 8.4, 8.6, 8.7_

  - [x] 25.2 Implement goals page
    - List goals with progress bar, savedAmount, targetAmount, percentage
    - Create/edit form
    - Fund and withdraw actions with capping logic
    - Visual completion indicator
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 25.3 Implement budgets page
    - List budgets with per-category progress
    - Create/edit budget with category allocations
    - Show spent vs allocated per category
    - Visual indicators for approaching/exceeded thresholds
    - _Requirements: 7.2_

- [x] 26. Implement frontend - Analysis, Alerts, and Settings
  - [x] 26.1 Implement category analysis page
    - Show categories sorted by total desc, exclude zero-total
    - Filter by date range (default: current month)
    - Show percentage of total for each category
    - Create custom categories
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 26.2 Implement alerts/notifications page
    - List alerts: balance low, credit high, payment due/overdue, goal completed
    - Mark as read, mark all as read
    - Alert configuration settings
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 26.3 Implement backup/restore page
    - Export to JSON button
    - Import from JSON with file selector and confirmation dialog
    - Show warning about data replacement before import
    - Error messages for invalid format/version
    - _Requirements: 13.3, 13.4, 13.7, 13.8, 13.9_

- [x] 27. Checkpoint - Verify frontend functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 28. Implement PWA and infrastructure
  - [x] 28.1 Implement PWA support
    - Create `service-worker.ts` with Workbox for offline caching
    - Create `manifest.json` with app metadata (name: Smart Finance, lang: es)
    - Configure caching strategies: network-first for API, cache-first for static assets
    - _Requirements: 14.2_

  - [x] 28.2 Create Docker configuration
    - Create multi-stage `Dockerfile`: build stage (node:20-alpine) + production stage
    - Create `docker-compose.yml` with volume, timezone, health check
    - Configure multi-arch support (amd64, arm64, armv7)
    - Create `/data` directory structure: attachments/, backups/, imports/
    - Ensure image size < 150MB
    - _Requirements: 14.2_

- [x] 29. Implement Home Assistant integration
  - [x] 29.1 Create HA-specific API endpoints (`packages/backend/src/routes/v1/ha.routes.ts`)
    - GET /api/v1/ha/status - aggregated data for HA sensors (monthly expenses, income, savings, balances, utilization)
    - GET /api/v1/ha/sensors - individual sensor data
    - POST /api/v1/ha/webhook - receive webhooks from HA
    - _Requirements: design HA Integration section_

  - [x] 29.2 Create HA Add-on configuration (`ha-addon/`)
    - Create `config.yaml` with ingress support, multi-arch
    - Create `Dockerfile` extending main image
    - Create `run.sh` startup script
    - Create `translations/es.yaml`
    - _Requirements: design HA Add-on section_

  - [x] 29.3 Create HA Custom Integration (`ha-integration/`)
    - Create `manifest.json`, `config_flow.py` for setup via UI
    - Implement `coordinator.py` with DataUpdateCoordinator (5-min polling)
    - Implement `sensor.py` with all financial sensors
    - Implement `binary_sensor.py` (over_budget, high_credit, payment_due, low_balance)
    - Implement `services.py` (create_expense, create_income, refresh)
    - Create `hacs.json` for HACS compatibility
    - _Requirements: design HA Custom Integration section_

- [x] 30. Final checkpoint - Verify complete system
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 33 universal correctness properties defined in the design
- Unit tests validate specific examples and edge cases
- The implementation language is TypeScript (full-stack) as specified in the design
- All UI text must be in Spanish (es) per Requirements 12.1
- All monetary amounts formatted as "MX$X,XXX.XX" per Requirements 12.3
- The design describes a web-based self-hosted application; the requirements reference Android native — follow the design architecture (SvelteKit + Fastify + Docker)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3"] },
    { "id": 4, "tasks": ["4.1", "5.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "5.2"] },
    { "id": 6, "tasks": ["6.1", "7.1", "8.1"] },
    { "id": 7, "tasks": ["6.2", "6.3", "6.4", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "8.2", "8.3"] },
    { "id": 8, "tasks": ["10.1", "11.1", "11.2", "12.1", "13.1", "14.1"] },
    { "id": 9, "tasks": ["10.2", "10.3", "11.3", "11.4", "12.2", "12.3", "13.2", "13.3", "14.2", "14.3"] },
    { "id": 10, "tasks": ["16.1", "17.1", "18.1", "19.1", "20.1"] },
    { "id": 11, "tasks": ["16.2", "16.3", "17.2", "17.3", "17.4", "18.2", "18.3", "18.4", "19.2", "19.3", "20.2", "20.3"] },
    { "id": 12, "tasks": ["22.1", "22.2"] },
    { "id": 13, "tasks": ["22.3"] },
    { "id": 14, "tasks": ["23.1"] },
    { "id": 15, "tasks": ["23.2", "23.3"] },
    { "id": 16, "tasks": ["24.1", "24.2", "24.3", "24.4"] },
    { "id": 17, "tasks": ["25.1", "25.2", "25.3", "26.1", "26.2", "26.3"] },
    { "id": 18, "tasks": ["28.1", "28.2"] },
    { "id": 19, "tasks": ["29.1"] },
    { "id": 20, "tasks": ["29.2", "29.3"] }
  ]
}
```

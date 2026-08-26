// Barrel export para todos los schemas de validación
export { createAccountSchema, updateAccountSchema } from './account.schema.js';
export type { CreateAccountSchema, UpdateAccountSchema } from './account.schema.js';

export { createTransactionSchema, updateTransactionSchema, quickTransactionSchema } from './transaction.schema.js';
export type { CreateTransactionSchema, UpdateTransactionSchema, QuickTransactionSchema } from './transaction.schema.js';

export { createTransferSchema } from './transfer.schema.js';
export type { CreateTransferSchema } from './transfer.schema.js';

export { createSubscriptionSchema, updateSubscriptionSchema } from './subscription.schema.js';
export type { CreateSubscriptionSchema, UpdateSubscriptionSchema } from './subscription.schema.js';

export { createGoalSchema, updateGoalSchema, fundGoalSchema } from './goal.schema.js';
export type { CreateGoalSchema, UpdateGoalSchema, FundGoalSchema } from './goal.schema.js';

export { createBudgetSchema, updateBudgetSchema } from './budget.schema.js';
export type { CreateBudgetSchema, UpdateBudgetSchema } from './budget.schema.js';

export { createRuleSchema, updateRuleSchema } from './rule.schema.js';
export type { CreateRuleSchema, UpdateRuleSchema } from './rule.schema.js';

export { uploadImportSchema, confirmImportSchema } from './import.schema.js';
export type { UploadImportSchema, ConfirmImportSchema } from './import.schema.js';

export { registerSchema, loginSchema, refreshTokenSchema, createApiKeySchema } from './auth.schema.js';
export type { RegisterSchema, LoginSchema, RefreshTokenSchema, CreateApiKeySchema } from './auth.schema.js';

export { importBackupSchema, confirmBackupImportSchema } from './backup.schema.js';
export type { ImportBackupSchema, ConfirmBackupImportSchema } from './backup.schema.js';

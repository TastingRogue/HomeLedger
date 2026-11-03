// Data contracts used by the dashboard.
// ─── Types ───
export interface AccountData {
  id: number;
  name: string;
  type: string;
  bank?: string;
  initialBalance: number;
  exchangeRate?: number;
  balance?: number;
  calculatedBalance?: number;
  balanceLimit?: number | null;
  creditLimit?: number | null;
  status?: string;
}

export interface DashboardData {
  consolidatedBalance: number;
  monthlySummary: { totalIncome: number; totalExpenses: number };
  categoryBreakdown: { categoryId: number; categoryName: string; total: number; percentage: number }[];
  accountHealth: { id: number; name: string; balance: number; balanceLimit: number | null; status: string }[];
  nextSubscriptions: { id: number; name: string; amount: number; daysRemaining: number; accountId: number; accountName?: string }[];
  activeGoals: { id: number; name: string; savedAmount: number; targetAmount: number; progress: number }[];
}

export interface Transaction {
  id: number;
  name: string;
  amount: number;
  type: string;
  date: string;
  accountId?: number;
  categoryId?: number;
  categoryName?: string;
  accountName?: string;
}

export interface SubscriptionCalendar {
  id: number;
  name: string;
  amount: number;
  cycle?: string;
  daysRemaining: number;
  nextDate?: string;
  accountName?: string;
  categoryName?: string;
}

export interface CategoryAnalysis {
  categoryId: number;
  categoryName: string;
  totalExpenses: number;
  total?: number;
  percentage?: number;
}

export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  savedAmount: number;
  progress: number;
  type: string;
  status: string;
}

export interface Category {
  id: number;
  name: string;
  type?: 'Gasto' | 'Ingreso' | 'Ambos';
}

export interface TransferData {
  id: number;
  name: string;
  amount: number;
  date: string;
  sourceAccountId: number;
  destinationAccountId: number;
}

export interface TrendEntry {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

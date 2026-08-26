/**
 * Reports API module - Dashboard and analytics data.
 */

import { apiGet } from './client';

export interface AccountHealth {
  id: number;
  name: string;
  balance: number;
  balanceLimit: number | null;
  status: 'correcto' | 'bajo' | 'sin_limite';
}

export interface CategoryBreakdown {
  categoryId: number;
  categoryName: string;
  total: number;
  percentage: number;
}

export interface NextSubscription {
  id: number;
  name: string;
  amount: number;
  daysRemaining: number;
  accountId: number;
}

export interface ActiveGoal {
  id: number;
  name: string;
  savedAmount: number;
  targetAmount: number;
  progress: number;
}

export interface DashboardData {
  consolidatedBalance: number;
  monthlySummary: {
    totalIncome: number;
    totalExpenses: number;
  };
  categoryBreakdown: CategoryBreakdown[];
  accountHealth: AccountHealth[];
  nextSubscriptions: NextSubscription[];
  activeGoals: ActiveGoal[];
}

/**
 * Fetch all dashboard data from the API.
 */
export async function getDashboard(): Promise<DashboardData> {
  return apiGet<DashboardData>('/reports/dashboard');
}

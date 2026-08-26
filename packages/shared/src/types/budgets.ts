// Período de un presupuesto
export enum BudgetPeriod {
  Mensual = 'Mensual',
  Semanal = 'Semanal',
}

// Entidad principal de Presupuesto
export interface Budget {
  id: number;
  userId: number;
  name: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  totalAllocated: number;            // suma de todas las categorías asignadas
  totalSpent: number;                // calculado: suma de gastos en el período
  rolloverEnabled: boolean;          // si se acumula lo no gastado al siguiente período
  alertThreshold: number;            // porcentaje (0-100) para generar alerta
  createdAt: string;
  updatedAt: string;
}

// Asignación por categoría dentro de un presupuesto
export interface BudgetCategory {
  id: number;
  budgetId: number;
  categoryId: number;
  allocated: number;                 // monto asignado a esta categoría
  spent: number;                     // calculado: gastos en esta categoría en el período
  rollover: number;                  // monto acumulado de períodos anteriores
  remaining: number;                 // calculado: (allocated + rollover) - spent
}

// Resumen de presupuesto con progreso
export interface BudgetWithProgress extends Budget {
  categories: BudgetCategory[];
  percentUsed: number;               // (totalSpent / totalAllocated) * 100
}

// Resumen general de presupuestos
export interface BudgetSummary {
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  percentUsed: number;
}

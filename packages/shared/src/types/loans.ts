// Estado de un préstamo
export enum LoanStatus {
  Activo = 'Activo',
  Pagado = 'Pagado',
}

// Entidad principal de Préstamo
export interface Loan {
  id: number;
  userId: number;
  name: string;
  originalAmount: number;            // monto original del préstamo
  remainingAmount: number;           // monto restante por pagar
  interestRate: number;              // tasa de interés anual (%)
  monthlyPayment: number;            // pago mensual estimado
  startDate: string;
  endDate: string | null;            // fecha estimada de terminación
  status: LoanStatus;
  accountId: number | null;          // cuenta asociada (opcional)
  createdAt: string;
  updatedAt: string;
}

// Registro de un pago de préstamo
export interface LoanPayment {
  id: number;
  loanId: number;
  amount: number;
  principal: number;                 // parte que va a capital
  interest: number;                  // parte que va a intereses
  date: string;
  createdAt: string;
}

// Entrada en la tabla de amortización
export interface AmortizationEntry {
  period: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

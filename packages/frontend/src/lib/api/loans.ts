/**
 * API client for loans (with payments + amortization schedule).
 * Backend: packages/backend/src/routes/v1/loans.routes.ts
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';

// ─── Types ───

export type LoanStatus = 'active' | 'paid';

export interface Loan {
  id: number;
  userId: number;
  name: string;
  principal: number;
  interestRate: number; // annual %, e.g. 12 = 12%
  term: number; // months
  remainingAmount: number;
  startDate: string;
  status: LoanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: number;
  loanId: number;
  amount: number;
  principal: number;
  interest: number;
  date: string;
  createdAt: string;
}

export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface CreateLoanPayload {
  name: string;
  principal: number;
  interestRate: number;
  term: number;
  startDate: string;
}

export interface UpdateLoanPayload {
  name?: string;
  interestRate?: number;
  term?: number;
  startDate?: string;
}

export interface RecordPaymentPayload {
  amount: number;
  principal: number;
  interest: number;
  date: string;
}

export interface RecordPaymentResult {
  payment: LoanPayment;
  loan: Loan;
}

// ─── API Functions ───

export function listLoans(): Promise<Loan[]> {
  return apiGet<Loan[]>('/loans');
}

export function getLoan(id: number): Promise<Loan> {
  return apiGet<Loan>(`/loans/${id}`);
}

export function createLoan(payload: CreateLoanPayload): Promise<Loan> {
  return apiPost<Loan>('/loans', payload);
}

export function updateLoan(id: number, payload: UpdateLoanPayload): Promise<Loan> {
  return apiPut<Loan>(`/loans/${id}`, payload);
}

export function deleteLoan(id: number): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/loans/${id}`);
}

export function recordPayment(id: number, payload: RecordPaymentPayload): Promise<RecordPaymentResult> {
  return apiPost<RecordPaymentResult>(`/loans/${id}/payment`, payload);
}

export function getSchedule(id: number): Promise<AmortizationRow[]> {
  return apiGet<AmortizationRow[]>(`/loans/${id}/schedule`);
}

export function getPayments(id: number): Promise<LoanPayment[]> {
  return apiGet<LoanPayment[]>(`/loans/${id}/payments`);
}

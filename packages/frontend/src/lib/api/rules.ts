/**
 * API client for the auto-categorization rules engine.
 * Backend: packages/backend/src/routes/v1/rules.routes.ts
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';

// ─── Types (mirror RulesEngineService interfaces) ───

export type RuleField = 'name' | 'amount' | 'account' | 'description' | 'merchant';
export type RuleOperator =
  | 'contains'
  | 'equals'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'between'
  | 'regex';
export type RuleActionType =
  | 'setCategory'
  | 'setSubcategory'
  | 'setType'
  | 'addTag'
  | 'flagReview'
  | 'markRecurring'
  | 'ignore';

/** Action types that carry no value (they act on the whole transaction). */
export const VALUELESS_ACTIONS: RuleActionType[] = ['flagReview', 'markRecurring', 'ignore'];

export interface RuleCondition {
  field: RuleField;
  operator: RuleOperator;
  value: string | number | [number, number];
  caseSensitive?: boolean;
}

export interface RuleAction {
  type: RuleActionType;
  value?: number | string;
}

/** Rule-learning suggestion (P4.5). */
export interface RuleSuggestion {
  suggested: boolean;
  field?: 'merchant' | 'name';
  value?: string;
  categoryId?: number;
  categoryName?: string;
  matchingCount?: number;
}

export interface Rule {
  id: number;
  userId: number;
  name: string;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  matchCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRulePayload {
  name: string;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled?: boolean;
}

export type UpdateRulePayload = Partial<CreateRulePayload>;

/** Result of applying enabled rules to uncategorized transactions. */
export interface ApplyResult {
  processed: number;
  matched: number;
  applied: Array<{
    transactionId: number;
    transactionName: string;
    ruleId: number;
    ruleName: string;
    actions: RuleAction[];
  }>;
}

/** Result of a dry-run test of a rule against transactions. */
export interface TestResult {
  matches: Array<{
    transactionId: number;
    transactionName: string;
    matched: boolean;
    actions: RuleAction[] | null;
  }>;
  totalTested: number;
  totalMatched: number;
}

// ─── API Functions ───

/** List all rules for the current user, ordered by priority. */
export function listRules(): Promise<Rule[]> {
  return apiGet<Rule[]>('/rules');
}

/** Create a new rule. */
export function createRule(payload: CreateRulePayload): Promise<Rule> {
  return apiPost<Rule>('/rules', payload);
}

/** Update an existing rule. */
export function updateRule(id: number, payload: UpdateRulePayload): Promise<Rule> {
  return apiPut<Rule>(`/rules/${id}`, payload);
}

/** Delete a rule. */
export function deleteRule(id: number): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/rules/${id}`);
}

/** Dry-run: test a rule definition against existing transactions (optionally a subset). */
export function testRule(payload: CreateRulePayload & { transactionIds?: number[] }): Promise<TestResult> {
  return apiPost<TestResult>('/rules/test', payload);
}

/** Apply all enabled rules to the user's uncategorized transactions. */
export function applyRules(): Promise<ApplyResult> {
  return apiPost<ApplyResult>('/rules/apply');
}

/** Rule learning: get a rule suggestion for a just-categorized transaction (P4.5). */
export function suggestRule(transactionId: number): Promise<RuleSuggestion> {
  return apiGet<RuleSuggestion>('/rules/suggest', { transactionId });
}

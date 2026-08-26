// Operadores disponibles para condiciones de reglas
export type RuleOperator =
  | 'contains'
  | 'equals'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'between'
  | 'regex';

// Campos sobre los que se puede aplicar una condición
export type RuleConditionField = 'name' | 'amount' | 'account' | 'description';

// Tipos de acción que puede ejecutar una regla
export type RuleActionType = 'setCategory' | 'setSubcategory' | 'setType' | 'addTag';

// Condición individual de una regla (todas las condiciones son AND)
export interface RuleCondition {
  field: RuleConditionField;
  operator: RuleOperator;
  value: string | number | [number, number];  // [number, number] para 'between'
  caseSensitive?: boolean;
}

// Acción a ejecutar cuando una regla hace match
export interface RuleAction {
  type: RuleActionType;
  value: number | string;
}

// Entidad principal de Regla de auto-categorización
export interface Rule {
  id: number;
  userId: number;
  name: string;
  priority: number;                    // menor = mayor prioridad
  conditions: RuleCondition[];         // AND entre condiciones
  actions: RuleAction[];
  enabled: boolean;
  matchCount: number;                  // contador de matches históricos
  createdAt: string;
  updatedAt: string;
}

// Resultado de match de una regla
export interface RuleMatch {
  ruleId: number;
  ruleName: string;
  actions: RuleAction[];
}

// Resultado de aplicar reglas a transacciones no categorizadas
export interface ApplyResult {
  totalProcessed: number;
  totalMatched: number;
  matches: Array<{
    transactionId: number;
    ruleId: number;
    actions: RuleAction[];
  }>;
}

// Resultado de probar una regla contra transacciones
export interface TestResult {
  totalTested: number;
  totalMatched: number;
  matchedTransactionIds: number[];
}

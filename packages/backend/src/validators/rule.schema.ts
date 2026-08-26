import { z } from 'zod';

/**
 * Operadores de condición válidos para reglas.
 */
const ruleOperatorEnum = z.enum([
  'contains',
  'equals',
  'startsWith',
  'endsWith',
  'greaterThan',
  'lessThan',
  'between',
  'regex',
]);

/**
 * Campos válidos para condiciones de reglas.
 */
const ruleConditionFieldEnum = z.enum([
  'name',
  'amount',
  'account',
  'description',
]);

/**
 * Tipos de acción válidos para reglas.
 */
const ruleActionTypeEnum = z.enum([
  'setCategory',
  'setSubcategory',
  'setType',
  'addTag',
]);

/**
 * Schema para una condición individual de regla.
 */
const ruleConditionSchema = z.object({
  field: ruleConditionFieldEnum,
  operator: ruleOperatorEnum,
  value: z.union([
    z.string(),
    z.number(),
    z.tuple([z.number(), z.number()]),
  ]),
  caseSensitive: z.boolean().optional(),
});

/**
 * Schema para una acción de regla.
 */
const ruleActionSchema = z.object({
  type: ruleActionTypeEnum,
  value: z.union([z.number(), z.string()]),
});

/**
 * Schema de validación para creación de reglas de auto-categorización.
 */
export const createRuleSchema = z.object({
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres'),

  priority: z
    .number({ error: 'La prioridad es obligatoria y debe ser un número' })
    .int('La prioridad debe ser un número entero')
    .min(1, 'La prioridad debe ser al menos 1'),

  conditions: z
    .array(ruleConditionSchema)
    .min(1, 'Debe incluir al menos una condición'),

  actions: z
    .array(ruleActionSchema)
    .min(1, 'Debe incluir al menos una acción'),

  enabled: z
    .boolean({ error: 'El estado debe ser verdadero o falso' })
    .default(true),
});

/**
 * Schema de validación para actualización de reglas.
 */
export const updateRuleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),

  priority: z
    .number({ error: 'La prioridad debe ser un número' })
    .int('La prioridad debe ser un número entero')
    .min(1, 'La prioridad debe ser al menos 1')
    .optional(),

  conditions: z
    .array(ruleConditionSchema)
    .min(1, 'Debe incluir al menos una condición')
    .optional(),

  actions: z
    .array(ruleActionSchema)
    .min(1, 'Debe incluir al menos una acción')
    .optional(),

  enabled: z
    .boolean({ error: 'El estado debe ser verdadero o falso' })
    .optional(),
});

export type CreateRuleSchema = z.infer<typeof createRuleSchema>;
export type CreateRuleInput = z.input<typeof createRuleSchema>;
export type UpdateRuleSchema = z.infer<typeof updateRuleSchema>;

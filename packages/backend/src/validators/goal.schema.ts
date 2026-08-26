import { z } from 'zod';
import { GoalType } from '@smart-finance/shared';

/**
 * Schema de validación para creación de metas de ahorro.
 * Requisitos: 6.1
 */
export const createGoalSchema = z.object({
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres'),

  targetAmount: z
    .number({ error: 'El monto objetivo es obligatorio y debe ser un número' })
    .min(0.01, 'El monto objetivo debe ser al menos 0.01')
    .max(999999999.99, 'El monto objetivo no puede exceder 999,999,999.99'),

  type: z.nativeEnum(GoalType, {
    error: 'El tipo de meta es obligatorio y debe ser válido',
  }),

  deadline: z
    .string()
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'La fecha límite debe estar en formato ISO 8601 válido' }
    )
    .optional(),
});

/**
 * Schema de validación para actualización de metas.
 */
export const updateGoalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),

  targetAmount: z
    .number({ error: 'El monto objetivo debe ser un número' })
    .min(0.01, 'El monto objetivo debe ser al menos 0.01')
    .max(999999999.99, 'El monto objetivo no puede exceder 999,999,999.99')
    .optional(),

  type: z.nativeEnum(GoalType, {
    error: 'El tipo de meta no es válido',
  }).optional(),

  deadline: z
    .string()
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'La fecha límite debe estar en formato ISO 8601 válido' }
    )
    .optional()
    .nullable(),
});

/**
 * Schema para asignación/retiro de fondos a una meta.
 */
export const fundGoalSchema = z.object({
  amount: z
    .number({ error: 'El monto es obligatorio y debe ser un número' })
    .positive('El monto debe ser mayor a 0')
    .max(999999999.99, 'El monto no puede exceder 999,999,999.99'),
});

export type CreateGoalSchema = z.infer<typeof createGoalSchema>;
export type UpdateGoalSchema = z.infer<typeof updateGoalSchema>;
export type FundGoalSchema = z.infer<typeof fundGoalSchema>;

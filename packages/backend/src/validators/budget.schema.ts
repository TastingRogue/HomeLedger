import { z } from 'zod';
import { BudgetPeriod } from '@smart-finance/shared';

/**
 * Schema de validación para creación de presupuestos.
 */
export const createBudgetSchema = z.object({
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres'),

  period: z.nativeEnum(BudgetPeriod, {
    error: 'El período es obligatorio y debe ser válido',
  }),

  startDate: z
    .string({ error: 'La fecha de inicio es obligatoria' })
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'La fecha de inicio debe estar en formato ISO 8601 válido' }
    ),

  categories: z
    .array(
      z.object({
        categoryId: z
          .number({ error: 'El ID de categoría es obligatorio y debe ser un número' })
          .int('El ID de categoría debe ser un número entero')
          .positive('El ID de categoría debe ser un número positivo'),
        allocated: z
          .number({ error: 'El monto asignado es obligatorio y debe ser un número' })
          .positive('El monto asignado debe ser mayor a 0')
          .max(999999999.99, 'El monto asignado no puede exceder 999,999,999.99'),
      })
    )
    .min(1, 'Debe incluir al menos una categoría'),

  rolloverEnabled: z
    .boolean({ error: 'El acumulado debe ser verdadero o falso' })
    .default(false),

  alertThreshold: z
    .number({ error: 'El umbral de alerta debe ser un número' })
    .min(0, 'El umbral de alerta debe ser al menos 0')
    .max(100, 'El umbral de alerta no puede exceder 100')
    .default(80),
});

/**
 * Schema de validación para actualización de presupuestos.
 */
export const updateBudgetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),

  period: z.nativeEnum(BudgetPeriod, {
    error: 'El período no es válido',
  }).optional(),

  startDate: z
    .string()
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'La fecha de inicio debe estar en formato ISO 8601 válido' }
    )
    .optional(),

  categories: z
    .array(
      z.object({
        categoryId: z
          .number({ error: 'El ID de categoría debe ser un número' })
          .int('El ID de categoría debe ser un número entero')
          .positive('El ID de categoría debe ser un número positivo'),
        allocated: z
          .number({ error: 'El monto asignado debe ser un número' })
          .positive('El monto asignado debe ser mayor a 0')
          .max(999999999.99, 'El monto asignado no puede exceder 999,999,999.99'),
      })
    )
    .min(1, 'Debe incluir al menos una categoría')
    .optional(),

  rolloverEnabled: z
    .boolean({ error: 'El acumulado debe ser verdadero o falso' })
    .optional(),

  alertThreshold: z
    .number({ error: 'El umbral de alerta debe ser un número' })
    .min(0, 'El umbral de alerta debe ser al menos 0')
    .max(100, 'El umbral de alerta no puede exceder 100')
    .optional(),
});

export type CreateBudgetSchema = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetSchema = z.infer<typeof updateBudgetSchema>;

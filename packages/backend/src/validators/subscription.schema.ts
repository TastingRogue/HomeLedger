import { z } from 'zod';
import { SubscriptionCycle } from '@smart-finance/shared';

/**
 * Schema de validación para creación de suscripciones.
 * Requisitos: 4.1
 */
export const createSubscriptionSchema = z.object({
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres'),

  startDate: z
    .string({ error: 'La fecha de inicio es obligatoria' })
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'La fecha de inicio debe estar en formato ISO 8601 válido' }
    ),

  amount: z
    .number({ error: 'El monto es obligatorio y debe ser un número' })
    .min(0.01, 'El monto debe ser al menos 0.01')
    .max(999999999.99, 'El monto no puede exceder 999,999,999.99'),

  cycle: z.nativeEnum(SubscriptionCycle, {
    error: 'El ciclo de pago es obligatorio y debe ser válido',
  }),

  categoryId: z
    .number({ error: 'La categoría es obligatoria y debe ser un número' })
    .int('El ID de categoría debe ser un número entero')
    .positive('El ID de categoría debe ser un número positivo'),

  accountId: z
    .number({ error: 'La cuenta es obligatoria y debe ser un número' })
    .int('El ID de cuenta debe ser un número entero')
    .positive('El ID de cuenta debe ser un número positivo'),

  autoCharge: z
    .boolean({ error: 'El cargo automático debe ser verdadero o falso' })
    .default(false),
});

/**
 * Schema de validación para actualización de suscripciones.
 */
export const updateSubscriptionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),

  startDate: z
    .string()
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'La fecha de inicio debe estar en formato ISO 8601 válido' }
    )
    .optional(),

  amount: z
    .number({ error: 'El monto debe ser un número' })
    .min(0.01, 'El monto debe ser al menos 0.01')
    .max(999999999.99, 'El monto no puede exceder 999,999,999.99')
    .optional(),

  cycle: z.nativeEnum(SubscriptionCycle, {
    error: 'El ciclo de pago no es válido',
  }).optional(),

  categoryId: z
    .number({ error: 'El ID de categoría debe ser un número' })
    .int('El ID de categoría debe ser un número entero')
    .positive('El ID de categoría debe ser un número positivo')
    .optional(),

  accountId: z
    .number({ error: 'El ID de cuenta debe ser un número' })
    .int('El ID de cuenta debe ser un número entero')
    .positive('El ID de cuenta debe ser un número positivo')
    .optional(),

  autoCharge: z
    .boolean({ error: 'El cargo automático debe ser verdadero o falso' })
    .optional(),
});

export type CreateSubscriptionSchema = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionSchema = z.infer<typeof updateSubscriptionSchema>;

import { z } from 'zod';

/**
 * Schema de validación para creación de préstamos.
 * Campos: name, principal, interestRate, term, startDate
 */
export const createLoanSchema = z.object({
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres'),

  principal: z
    .number({ error: 'El monto principal es obligatorio y debe ser un número' })
    .positive('El monto principal debe ser mayor a 0')
    .max(999999999.99, 'El monto principal no puede exceder 999,999,999.99'),

  interestRate: z
    .number({ error: 'La tasa de interés es obligatoria y debe ser un número' })
    .min(0, 'La tasa de interés no puede ser negativa')
    .max(100, 'La tasa de interés no puede exceder 100%'),

  term: z
    .number({ error: 'El plazo es obligatorio y debe ser un número' })
    .int('El plazo debe ser un número entero (meses)')
    .positive('El plazo debe ser mayor a 0')
    .max(600, 'El plazo no puede exceder 600 meses'),

  startDate: z
    .string({ error: 'La fecha de inicio es obligatoria' })
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'La fecha de inicio debe estar en formato ISO 8601 válido' }
    ),
});

/**
 * Schema de validación para actualización de préstamos.
 */
export const updateLoanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),

  interestRate: z
    .number({ error: 'La tasa de interés debe ser un número' })
    .min(0, 'La tasa de interés no puede ser negativa')
    .max(100, 'La tasa de interés no puede exceder 100%')
    .optional(),

  term: z
    .number({ error: 'El plazo debe ser un número' })
    .int('El plazo debe ser un número entero (meses)')
    .positive('El plazo debe ser mayor a 0')
    .max(600, 'El plazo no puede exceder 600 meses')
    .optional(),

  startDate: z
    .string()
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'La fecha de inicio debe estar en formato ISO 8601 válido' }
    )
    .optional(),
});

/**
 * Schema para registrar un pago de préstamo.
 */
export const recordPaymentSchema = z.object({
  amount: z
    .number({ error: 'El monto total del pago es obligatorio y debe ser un número' })
    .positive('El monto del pago debe ser mayor a 0')
    .max(999999999.99, 'El monto del pago no puede exceder 999,999,999.99'),

  principal: z
    .number({ error: 'La porción de capital es obligatoria y debe ser un número' })
    .min(0, 'La porción de capital no puede ser negativa')
    .max(999999999.99, 'La porción de capital no puede exceder 999,999,999.99'),

  interest: z
    .number({ error: 'La porción de interés es obligatoria y debe ser un número' })
    .min(0, 'La porción de interés no puede ser negativa')
    .max(999999999.99, 'La porción de interés no puede exceder 999,999,999.99'),

  date: z
    .string({ error: 'La fecha del pago es obligatoria' })
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'La fecha del pago debe estar en formato ISO 8601 válido' }
    ),
});

export type CreateLoanSchema = z.infer<typeof createLoanSchema>;
export type UpdateLoanSchema = z.infer<typeof updateLoanSchema>;
export type RecordPaymentSchema = z.infer<typeof recordPaymentSchema>;

import { z } from 'zod';
import { TransactionType } from '@homeledger/shared';

/**
 * Validación personalizada para montos con máximo 2 decimales.
 */
function hasAtMostTwoDecimals(value: number): boolean {
  const str = value.toString();
  const parts = str.split('.');
  if (parts.length === 1) return true; // Whole number, no decimals — OK
  if (parts[1] === undefined) return true;
  return parts[1].length <= 2;
}

/**
 * Schema de validación para creación de transacciones.
 * Requisitos: 2.1, 2.7, 11.7
 */
export const createTransactionSchema = z.object({
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres'),

  accountId: z
    .number({ error: 'La cuenta es obligatoria y debe ser un número' })
    .int('El ID de cuenta debe ser un número entero')
    .positive('El ID de cuenta debe ser un número positivo'),

  date: z
    .string({ error: 'La fecha es obligatoria' })
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'La fecha debe estar en formato ISO 8601 válido' }
    ),

  categoryId: z
    .number({ error: 'La categoría es obligatoria y debe ser un número' })
    .int('El ID de categoría debe ser un número entero')
    .positive('El ID de categoría debe ser un número positivo'),

  subcategoryId: z
    .number()
    .int('El ID de subcategoría debe ser un número entero')
    .positive('El ID de subcategoría debe ser un número positivo')
    .nullable()
    .optional(),

  amount: z
    .number({ error: 'El monto es obligatorio y debe ser un número' })
    .positive('El monto debe ser mayor a 0')
    .max(999999999.99, 'El monto no puede exceder 999,999,999.99')
    .refine(hasAtMostTwoDecimals, {
      message: 'El monto no puede tener más de 2 decimales',
    }),

  type: z.nativeEnum(TransactionType, {
    error: 'El tipo de transacción es obligatorio y debe ser válido',
  }),

  // ── P4.1 richer transaction model (all optional) ──
  merchant: z
    .string()
    .trim()
    .max(100, 'El comercio no puede exceder 100 caracteres')
    .nullable()
    .optional(),

  subtype: z
    .enum(['refund', 'reimbursement', 'adjustment'], {
      error: 'El subtipo no es válido',
    })
    .nullable()
    .optional(),

  reconciled: z.boolean().optional(),

  status: z
    .enum(['pending', 'posted'], { error: 'El estado no es válido' })
    .optional(),

  externalId: z
    .string()
    .trim()
    .max(120, 'El identificador externo no puede exceder 120 caracteres')
    .nullable()
    .optional(),

  invoiceFile: z
    .string()
    .optional(),
});

/**
 * Schema de validación para actualización de transacciones.
 */
export const updateTransactionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),

  accountId: z
    .number({ error: 'El ID de cuenta debe ser un número' })
    .int('El ID de cuenta debe ser un número entero')
    .positive('El ID de cuenta debe ser un número positivo')
    .optional(),

  date: z
    .string()
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'La fecha debe estar en formato ISO 8601 válido' }
    )
    .optional(),

  categoryId: z
    .number({ error: 'El ID de categoría debe ser un número' })
    .int('El ID de categoría debe ser un número entero')
    .positive('El ID de categoría debe ser un número positivo')
    .optional(),

  subcategoryId: z
    .number()
    .int('El ID de subcategoría debe ser un número entero')
    .positive('El ID de subcategoría debe ser un número positivo')
    .nullable()
    .optional(),

  amount: z
    .number({ error: 'El monto debe ser un número' })
    .positive('El monto debe ser mayor a 0')
    .max(999999999.99, 'El monto no puede exceder 999,999,999.99')
    .refine(hasAtMostTwoDecimals, {
      message: 'El monto no puede tener más de 2 decimales',
    })
    .optional(),

  type: z.nativeEnum(TransactionType, {
    error: 'El tipo de transacción no es válido',
  }).optional(),

  // ── P4.1 richer transaction model (all optional) ──
  merchant: z
    .string()
    .trim()
    .max(100, 'El comercio no puede exceder 100 caracteres')
    .nullable()
    .optional(),

  subtype: z
    .enum(['refund', 'reimbursement', 'adjustment'], {
      error: 'El subtipo no es válido',
    })
    .nullable()
    .optional(),

  reconciled: z.boolean().optional(),

  status: z
    .enum(['pending', 'posted'], { error: 'El estado no es válido' })
    .optional(),

  externalId: z
    .string()
    .trim()
    .max(120, 'El identificador externo no puede exceder 120 caracteres')
    .nullable()
    .optional(),

  invoiceFile: z
    .string()
    .optional()
    .nullable(),
});

/**
 * Schema para registro rápido de transacciones.
 * Requisitos: 11.1, 11.7
 */
export const quickTransactionSchema = z.object({
  amount: z
    .number({ error: 'El monto es obligatorio y debe ser un número' })
    .min(0.01, 'El monto debe ser al menos 0.01')
    .max(999999999.99, 'El monto no puede exceder 999,999,999.99')
    .refine(hasAtMostTwoDecimals, {
      message: 'El monto no puede tener más de 2 decimales',
    }),

  accountId: z
    .number({ error: 'La cuenta es obligatoria y debe ser un número' })
    .int('El ID de cuenta debe ser un número entero')
    .positive('El ID de cuenta debe ser un número positivo'),

  categoryId: z
    .number({ error: 'La categoría es obligatoria y debe ser un número' })
    .int('El ID de categoría debe ser un número entero')
    .positive('El ID de categoría debe ser un número positivo'),

  type: z.nativeEnum(TransactionType, {
    error: 'El tipo de transacción no es válido',
  }).default(TransactionType.Gasto),
});

export type CreateTransactionSchema = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionSchema = z.infer<typeof updateTransactionSchema>;
export type QuickTransactionSchema = z.infer<typeof quickTransactionSchema>;
export type QuickTransactionInput = z.input<typeof quickTransactionSchema>;

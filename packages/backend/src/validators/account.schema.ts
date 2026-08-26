import { z } from 'zod';
import { AccountType } from '@smart-finance/shared';

/**
 * Schema de validación para creación de cuentas financieras.
 * Requisitos: 1.1, 1.6, 5.1
 */
export const createAccountSchema = z
  .object({
    name: z
      .string({ error: 'El nombre es obligatorio' })
      .trim()
      .min(1, 'El nombre no puede estar vacío')
      .max(50, 'El nombre no puede exceder 50 caracteres'),

    initialBalance: z
      .number({ error: 'El balance inicial es obligatorio y debe ser un número' })
      .min(-999999999.99, 'El balance inicial no puede ser menor a -999,999,999.99')
      .max(999999999.99, 'El balance inicial no puede exceder 999,999,999.99'),

    currency: z
      .string()
      .default('MXN'),

    type: z.nativeEnum(AccountType, {
      error: 'El tipo de cuenta es obligatorio y debe ser válido',
    }),

    bank: z
      .string()
      .trim()
      .max(50, 'El banco no puede exceder 50 caracteres')
      .optional(),

    balanceLimit: z
      .number({ error: 'El límite de balance debe ser un número' })
      .optional(),

    creditLimit: z
      .number({ error: 'El límite de crédito debe ser un número' })
      .min(0.01, 'El límite de crédito debe ser al menos 0.01')
      .max(999999999.99, 'El límite de crédito no puede exceder 999,999,999.99')
      .optional(),

    linkedSubscriptionIds: z
      .array(z.number().int().positive('Los IDs de suscripciones deben ser números positivos'))
      .optional(),
  })
  .refine(
    (data) => {
      if (data.type === AccountType.Credito) {
        return data.creditLimit !== undefined && data.creditLimit !== null;
      }
      return true;
    },
    {
      message: 'El límite de crédito es obligatorio para cuentas de tipo Crédito',
      path: ['creditLimit'],
    }
  );

/**
 * Schema de validación para actualización de cuentas.
 * Todos los campos son opcionales excepto las validaciones condicionales.
 */
export const updateAccountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'El nombre no puede estar vacío')
      .max(50, 'El nombre no puede exceder 50 caracteres')
      .optional(),

    initialBalance: z
      .number({ error: 'El balance inicial debe ser un número' })
      .min(-999999999.99, 'El balance inicial no puede ser menor a -999,999,999.99')
      .max(999999999.99, 'El balance inicial no puede exceder 999,999,999.99')
      .optional(),

    currency: z
      .string()
      .optional(),

    type: z.nativeEnum(AccountType, {
      error: 'El tipo de cuenta no es válido',
    }).optional(),

    bank: z
      .string()
      .trim()
      .max(50, 'El banco no puede exceder 50 caracteres')
      .optional()
      .nullable(),

    balanceLimit: z
      .number({ error: 'El límite de balance debe ser un número' })
      .optional()
      .nullable(),

    creditLimit: z
      .number({ error: 'El límite de crédito debe ser un número' })
      .min(0.01, 'El límite de crédito debe ser al menos 0.01')
      .max(999999999.99, 'El límite de crédito no puede exceder 999,999,999.99')
      .optional()
      .nullable(),

    linkedSubscriptionIds: z
      .array(z.number().int().positive('Los IDs de suscripciones deben ser números positivos'))
      .optional(),
  })
  .refine(
    (data) => {
      if (data.type === AccountType.Credito) {
        return data.creditLimit !== undefined && data.creditLimit !== null;
      }
      return true;
    },
    {
      message: 'El límite de crédito es obligatorio para cuentas de tipo Crédito',
      path: ['creditLimit'],
    }
  );

export type CreateAccountSchema = z.infer<typeof createAccountSchema>;
export type UpdateAccountSchema = z.infer<typeof updateAccountSchema>;

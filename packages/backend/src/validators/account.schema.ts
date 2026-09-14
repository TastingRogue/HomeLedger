import { z } from 'zod';
import { AccountType } from '@homeledger/shared';
import { hasAtMostTwoDecimals } from '../utils/money.js';

const twoDecimalMsg = 'El monto no puede tener más de 2 decimales';

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
      .max(999999999.99, 'El balance inicial no puede exceder 999,999,999.99')
      .refine(hasAtMostTwoDecimals, { message: twoDecimalMsg }),

    currency: z
      .string()
      .optional(),

    // P4.11: rate to convert this account's currency into the instance/base
    // currency. Must be > 0. Defaults to 1 (base) when omitted.
    exchangeRate: z
      .number()
      .positive('El tipo de cambio debe ser mayor a 0')
      .optional(),

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
      .refine(hasAtMostTwoDecimals, { message: twoDecimalMsg })
      .optional(),

    creditLimit: z
      .number({ error: 'El límite de crédito debe ser un número' })
      .min(0.01, 'El límite de crédito debe ser al menos 0.01')
      .max(999999999.99, 'El límite de crédito no puede exceder 999,999,999.99')
      .refine(hasAtMostTwoDecimals, { message: twoDecimalMsg })
      .optional(),

    // ── P4.2 credit-card statement fields (credit-only; all optional) ──
    statementDay: z
      .number({ error: 'El día de corte debe ser un número' })
      .int('El día de corte debe ser un número entero')
      .min(1, 'El día de corte debe estar entre 1 y 31')
      .max(31, 'El día de corte debe estar entre 1 y 31')
      .optional(),

    paymentDueDay: z
      .number({ error: 'El día de pago debe ser un número' })
      .int('El día de pago debe ser un número entero')
      .min(1, 'El día de pago debe estar entre 1 y 31')
      .max(31, 'El día de pago debe estar entre 1 y 31')
      .optional(),

    apr: z
      .number({ error: 'La tasa (APR) debe ser un número' })
      .min(0, 'La tasa (APR) no puede ser negativa')
      .max(1000, 'La tasa (APR) no puede exceder 1000%')
      .optional(),

    minimumPayment: z
      .number({ error: 'El pago mínimo debe ser un número' })
      .min(0, 'El pago mínimo no puede ser negativo')
      .max(999999999.99, 'El pago mínimo no puede exceder 999,999,999.99')
      .refine(hasAtMostTwoDecimals, { message: twoDecimalMsg })
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
      .refine(hasAtMostTwoDecimals, { message: twoDecimalMsg })
      .optional(),

    currency: z
      .string()
      .optional(),

    exchangeRate: z
      .number()
      .positive('El tipo de cambio debe ser mayor a 0')
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
      .refine(hasAtMostTwoDecimals, { message: twoDecimalMsg })
      .optional()
      .nullable(),

    creditLimit: z
      .number({ error: 'El límite de crédito debe ser un número' })
      .min(0.01, 'El límite de crédito debe ser al menos 0.01')
      .max(999999999.99, 'El límite de crédito no puede exceder 999,999,999.99')
      .refine(hasAtMostTwoDecimals, { message: twoDecimalMsg })
      .optional()
      .nullable(),

    // ── P4.2 credit-card statement fields ──
    statementDay: z
      .number({ error: 'El día de corte debe ser un número' })
      .int('El día de corte debe ser un número entero')
      .min(1, 'El día de corte debe estar entre 1 y 31')
      .max(31, 'El día de corte debe estar entre 1 y 31')
      .optional()
      .nullable(),

    paymentDueDay: z
      .number({ error: 'El día de pago debe ser un número' })
      .int('El día de pago debe ser un número entero')
      .min(1, 'El día de pago debe estar entre 1 y 31')
      .max(31, 'El día de pago debe estar entre 1 y 31')
      .optional()
      .nullable(),

    apr: z
      .number({ error: 'La tasa (APR) debe ser un número' })
      .min(0, 'La tasa (APR) no puede ser negativa')
      .max(1000, 'La tasa (APR) no puede exceder 1000%')
      .optional()
      .nullable(),

    minimumPayment: z
      .number({ error: 'El pago mínimo debe ser un número' })
      .min(0, 'El pago mínimo no puede ser negativo')
      .max(999999999.99, 'El pago mínimo no puede exceder 999,999,999.99')
      .refine(hasAtMostTwoDecimals, { message: twoDecimalMsg })
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

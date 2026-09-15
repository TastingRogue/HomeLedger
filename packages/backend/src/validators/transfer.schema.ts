import { z } from 'zod';
import { hasAtMostTwoDecimals } from '../utils/money.js';

/**
 * Schema de validación para creación de transferencias entre cuentas.
 * Requisitos: 3.1, 3.3
 */
export const createTransferSchema = z
  .object({
    name: z
      .string({ error: 'El nombre es obligatorio' })
      .trim()
      .min(1, 'El nombre no puede estar vacío')
      .max(100, 'El nombre no puede exceder 100 caracteres'),

    date: z
      .string({ error: 'La fecha es obligatoria' })
      .refine(
        (val) => !isNaN(Date.parse(val)),
        { message: 'La fecha debe estar en formato ISO 8601 válido' }
      ),

    amount: z
      .number({ error: 'El monto es obligatorio y debe ser un número' })
      .positive('El monto debe ser mayor a 0')
      .max(999999999.99, 'El monto no puede exceder 999,999,999.99')
      .refine(hasAtMostTwoDecimals, { message: 'El monto no puede tener más de 2 decimales' }),

    // P4.11: for cross-currency transfers, the amount entering the destination
    // in its own currency. Omit/null when both accounts share a currency.
    destinationAmount: z
      .number()
      .positive('El monto destino debe ser mayor a 0')
      .max(999999999.99, 'El monto destino no puede exceder 999,999,999.99')
      .refine(hasAtMostTwoDecimals, { message: 'El monto destino no puede tener más de 2 decimales' })
      .optional(),

    sourceAccountId: z
      .number({ error: 'La cuenta origen es obligatoria y debe ser un número' })
      .int('El ID de cuenta origen debe ser un número entero')
      .positive('El ID de cuenta origen debe ser un número positivo'),

    destinationAccountId: z
      .number({ error: 'La cuenta destino es obligatoria y debe ser un número' })
      .int('El ID de cuenta destino debe ser un número entero')
      .positive('El ID de cuenta destino debe ser un número positivo'),
  })
  .refine(
    (data) => data.sourceAccountId !== data.destinationAccountId,
    {
      message: 'La cuenta origen y la cuenta destino deben ser diferentes',
      path: ['destinationAccountId'],
    }
  );

export type CreateTransferSchema = z.infer<typeof createTransferSchema>;

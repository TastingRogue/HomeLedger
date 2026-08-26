import { z } from 'zod';

/**
 * Schema de validación para importación de respaldos.
 * Requisitos: 13.7, 13.8
 */
export const importBackupSchema = z.object({
  version: z
    .string({ error: 'La versión del respaldo es obligatoria' })
    .min(1, 'La versión no puede estar vacía'),

  exportedAt: z
    .string({ error: 'La fecha de exportación es obligatoria' })
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'La fecha de exportación debe estar en formato ISO 8601 válido' }
    ),

  data: z.object({
    accounts: z.array(z.any()).optional(),
    transactions: z.array(z.any()).optional(),
    transfers: z.array(z.any()).optional(),
    subscriptions: z.array(z.any()).optional(),
    goals: z.array(z.any()).optional(),
    categories: z.array(z.any()).optional(),
    budgets: z.array(z.any()).optional(),
    rules: z.array(z.any()).optional(),
    assets: z.array(z.any()).optional(),
    liabilities: z.array(z.any()).optional(),
    loans: z.array(z.any()).optional(),
  }),
});

/**
 * Schema para confirmar la importación (paso de confirmación del usuario).
 */
export const confirmBackupImportSchema = z.object({
  confirmed: z
    .boolean({ error: 'La confirmación es obligatoria' })
    .refine(
      (val) => val === true,
      { message: 'Debe confirmar la operación para reemplazar los datos actuales' }
    ),
});

export type ImportBackupSchema = z.infer<typeof importBackupSchema>;
export type ConfirmBackupImportSchema = z.infer<typeof confirmBackupImportSchema>;

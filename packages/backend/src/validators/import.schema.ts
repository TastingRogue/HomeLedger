import { z } from 'zod';

/**
 * Schema de validación para subida de archivos de importación bancaria.
 */
export const uploadImportSchema = z.object({
  accountId: z
    .number({ error: 'La cuenta destino es obligatoria y debe ser un número' })
    .int('El ID de cuenta debe ser un número entero')
    .positive('El ID de cuenta debe ser un número positivo'),

  parser: z
    .string()
    .optional(),
});

/**
 * Schema para mapeo de campos durante la importación.
 */
const fieldMappingSchema = z.object({
  sourceField: z
    .string({ error: 'El campo origen es obligatorio' })
    .min(1, 'El campo origen no puede estar vacío'),

  targetField: z
    .string({ error: 'El campo destino es obligatorio' })
    .min(1, 'El campo destino no puede estar vacío'),

  transform: z
    .string()
    .optional(),
});

/**
 * Schema para confirmación de importación.
 */
export const confirmImportSchema = z.object({
  mappings: z
    .array(fieldMappingSchema)
    .optional(),

  selectedTransactionIds: z
    .array(z.number().int().positive('Los IDs deben ser números positivos'))
    .optional(),

  defaultCategoryId: z
    .number({ error: 'El ID de categoría debe ser un número' })
    .int('El ID de categoría debe ser un número entero')
    .positive('El ID de categoría debe ser un número positivo')
    .optional(),
});

export type UploadImportSchema = z.infer<typeof uploadImportSchema>;
export type ConfirmImportSchema = z.infer<typeof confirmImportSchema>;

import { z } from 'zod';

/**
 * Schema de validación para creación de categorías.
 * Requisitos: 10.4, 10.5
 */
export const createCategorySchema = z.object({
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(50, 'El nombre no puede exceder 50 caracteres'),

  icon: z
    .string()
    .trim()
    .optional(),

  color: z
    .string()
    .trim()
    .optional(),

  type: z
    .enum(['Gasto', 'Ingreso', 'Ambos'], {
      error: 'El tipo debe ser Gasto, Ingreso o Ambos',
    })
    .default('Ambos'),
});

/**
 * Schema de validación para actualización de categorías.
 * Todos los campos son opcionales.
 */
export const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .optional(),

  icon: z
    .string()
    .trim()
    .optional()
    .nullable(),

  color: z
    .string()
    .trim()
    .optional()
    .nullable(),

  type: z
    .enum(['Gasto', 'Ingreso', 'Ambos'], {
      error: 'El tipo debe ser Gasto, Ingreso o Ambos',
    })
    .optional(),
});

/**
 * Schema de validación para creación de subcategorías.
 */
export const createSubcategorySchema = z.object({
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
});

export type CreateCategorySchema = z.infer<typeof createCategorySchema>;
export type UpdateCategorySchema = z.infer<typeof updateCategorySchema>;
export type CreateSubcategorySchema = z.infer<typeof createSubcategorySchema>;

import { z } from 'zod';

/**
 * Schema de validación para registro de usuario.
 */
export const registerSchema = z.object({
  email: z
    .string({ error: 'El correo electrónico es obligatorio' })
    .email('El correo electrónico no tiene un formato válido')
    .max(255, 'El correo electrónico no puede exceder 255 caracteres'),

  password: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres'),

  name: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
});

/**
 * Schema de validación para inicio de sesión.
 */
export const loginSchema = z.object({
  email: z
    .string({ error: 'El correo electrónico es obligatorio' })
    .email('El correo electrónico no tiene un formato válido'),

  password: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña no puede estar vacía'),
});

/**
 * Schema para refresh token.
 */
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ error: 'El token de actualización es obligatorio' })
    .min(1, 'El token de actualización no puede estar vacío'),
});

/**
 * Schema para generación de API key.
 */
export const createApiKeySchema = z.object({
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres'),

  expiresAt: z
    .string()
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'La fecha de expiración debe estar en formato ISO 8601 válido' }
    )
    .optional(),
});

export type RegisterSchema = z.infer<typeof registerSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;
export type CreateApiKeySchema = z.infer<typeof createApiKeySchema>;

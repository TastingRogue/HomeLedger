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

  // Second factor, only required when the account has TOTP 2FA enabled.
  // Accepts either a 6-digit TOTP code or a one-time backup code.
  totpCode: z.string().trim().max(20).optional(),
});

/**
 * Schema para confirmar/activar TOTP (código de 6 dígitos del autenticador).
 */
export const totpCodeSchema = z.object({
  code: z
    .string({ error: 'El código es obligatorio' })
    .trim()
    .min(1, 'El código no puede estar vacío')
    .max(20, 'El código no es válido'),
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

  // Optional scope list (P4.13). Omitted/empty = full access.
  scopes: z.array(z.string()).optional(),

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
export type TotpCodeSchema = z.infer<typeof totpCodeSchema>;
export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;
export type CreateApiKeySchema = z.infer<typeof createApiKeySchema>;

import { z } from 'zod';

/**
 * Validators for user-configured webhooks (P4.13).
 */
export const createWebhookSchema = z.object({
  url: z
    .string({ error: 'La URL es obligatoria' })
    .trim()
    .min(1, 'La URL no puede estar vacía')
    .max(2048, 'La URL es demasiado larga'),

  secret: z.string().trim().max(255).optional().nullable(),

  events: z
    .array(z.string(), { error: 'Debes indicar los eventos' })
    .min(1, 'Selecciona al menos un evento'),

  enabled: z.boolean().optional(),
});

export const updateWebhookSchema = z.object({
  url: z.string().trim().min(1).max(2048).optional(),
  secret: z.string().trim().max(255).optional().nullable(),
  events: z.array(z.string()).min(1).optional(),
  enabled: z.boolean().optional(),
});

export type CreateWebhookSchema = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookSchema = z.infer<typeof updateWebhookSchema>;

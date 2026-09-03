import { z } from 'zod';

/**
 * Validación en runtime de lo que responde el backend para Chat (Atención Personalizada).
 *
 * Mismo criterio que `features/community/api/wallSchemas.ts`: los tipos de TypeScript se borran
 * al compilar, así que sin esto un cambio de nombre de campo en el backend se manifiesta como un
 * `undefined` silencioso muy lejos de la causa. `validarRespuesta` se duplica acá a propósito
 * (AGENTS.md: estructura modular por feature, cada una dueña de su propia validación).
 *
 * `passthrough()` a propósito: que el backend agregue campos nuevos no debe romper la app.
 */

export const wireConversacionSchema = z
  .object({
    id: z.string(),
    type: z.enum(['CELL', 'DIRECT', 'GLOBAL']),
    celulaId: z.string().nullable(),
    nombre: z.string().nullable(),
    createdAt: z.string(),
  })
  .passthrough();

const wireReplyPreviewSchema = z
  .object({
    id: z.string(),
    senderName: z.string().nullable(),
    type: z.enum(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'SYSTEM']),
    text: z.string().nullable(),
    deletedAt: z.string().nullable(),
  })
  .passthrough();

export const wireMensajeSchema = z
  .object({
    id: z.string(),
    conversationId: z.string(),
    senderId: z.string(),
    senderName: z.string().nullable(),
    senderAvatarUrl: z.string().nullable(),
    type: z.enum(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'SYSTEM']),
    text: z.string().nullable(),
    mediaBucket: z.string().nullable(),
    mediaPath: z.string().nullable(),
    mediaMime: z.string().nullable(),
    mediaBytes: z.number().nullable(),
    mediaDurationSeconds: z.number().nullable(),
    hidden: z.boolean(),
    replyToId: z.string().nullable(),
    replyTo: wireReplyPreviewSchema.nullable(),
    createdAt: z.string(),
  })
  .passthrough();

export const wireConversacionResumenSchema = z
  .object({
    conversation: wireConversacionSchema,
    lastMessage: wireMensajeSchema.nullable(),
    unreadCount: z.number(),
  })
  .passthrough();

export const wireConversacionesListSchema = z.array(wireConversacionResumenSchema);

export const wireMensajesPageSchema = z
  .object({
    messages: z.array(wireMensajeSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  })
  .passthrough();

const wireMiembroSchema = z
  .object({
    id: z.string(),
    fullName: z.string(),
    avatarUrl: z.string().nullable(),
    role: z.string(),
  })
  .passthrough();

export const wireMiembrosPageSchema = z
  .object({
    members: z.array(wireMiembroSchema),
    nextCursor: z.string().nullable(),
  })
  .passthrough();

/**
 * Valida y devuelve el dato con el tipo que el resto del código ya espera. Si la forma no coincide
 * se lanza un error que dice QUÉ campo falló y en qué endpoint.
 */
export function validarRespuesta<T>(schema: z.ZodType, dato: unknown, endpoint: string): T {
  const resultado = schema.safeParse(dato);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join('; ');
    throw new Error(`El backend respondió algo inesperado en ${endpoint} — ${detalle}`);
  }
  return resultado.data as T;
}

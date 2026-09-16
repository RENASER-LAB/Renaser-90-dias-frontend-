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
    /**
     * `z.string()` y NO `z.enum([...])`, a propósito y a pesar de que los valores válidos son
     * cuatro y conocidos (CELL/DIRECT/GLOBAL/SUPPORT).
     *
     * El motivo es el radio de la explosión. `type` viaja dentro de cada elemento de
     * `GET /conversations`, un `z.array(...)`: si UNA conversación trae un tipo que el `enum` no
     * lista, falla la validación del array ENTERO, `validarRespuesta` lanza, y la persona no ve
     * una conversación rara — ve la bandeja vacía con un error, sin ninguna de sus conversaciones
     * viejas. Y como la app vive publicada en la tienda, eso le pasaría a todo el que no haya
     * actualizado el día que el backend estrene un tipo nuevo.
     *
     * Validar acá no gana nada: el `enum` no "protege" a nadie río abajo, porque `reconocerTipoChat`
     * (`chatMappers.ts`) ya tiene que decidir qué hacer con cada valor y trata lo desconocido como
     * una conversación genérica. Lo único que agregaba el `enum` era convertir un tipo nuevo en una
     * caída total. El resto del schema sigue estricto: si falta `id` o `createdAt` no hay nada que
     * pintar y ahí sí conviene fallar ruidosamente.
     */
    type: z.string(),
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
    mediaUrl: z.string().nullable(),
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
    /**
     * Con quién es el chat, cuando es 1 a 1. `null` en grupos.
     *
     * `.nullish()` y no `.nullable()`: un backend anterior a este campo no lo manda, y con
     * `.nullable()` la respuesta entera fallaría la validación y la bandeja quedaría vacía. Un
     * nombre genérico es un defecto; una pantalla en blanco por desplegar en distinto orden es
     * otra cosa.
     */
    otherParticipantId: z.string().nullish(),
    /** Su nombre, ya resuelto por el servidor. Ver `resolverOtroParticipante`. */
    otherParticipantName: z.string().nullish(),
    otherParticipantAvatarUrl: z.string().nullish(),
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

/** `UrlSubidaMediaChatResponse` (`ChatMediaController.urlDeSubida`). */
export const urlSubidaChatSchema = z
  .object({ uploadUrl: z.string(), bucket: z.string(), ruta: z.string() })
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

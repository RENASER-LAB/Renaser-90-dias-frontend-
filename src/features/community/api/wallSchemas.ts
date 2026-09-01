import { z } from 'zod';

/**
 * Validación en runtime de lo que responde el backend para el Muro.
 *
 * Mismo criterio que `features/auth/api/authSchemas.ts`: los tipos de TypeScript se borran al
 * compilar, así que sin esto un cambio de nombre de campo en el backend (ya pasó una vez en este
 * proyecto: `{disponible}` vs `{available}`) se manifiesta como un `undefined` silencioso muy
 * lejos de la causa, en vez de un error claro en la primera llamada.
 *
 * `validarRespuesta` se duplica acá en vez de importarse de `auth` a propósito: cada feature es
 * dueña de su propia validación (AGENTS.md, estructura modular por feature); son 10 líneas, el
 * costo de la duplicación es menor que el de acoplar `community` a `auth`.
 *
 * `passthrough()` a propósito: que el backend agregue campos nuevos no debe romper la app.
 */

const wallMediaSchema = z.object({ url: z.string(), mimeType: z.string() }).passthrough();

export const wallPostSchema = z
  .object({
    id: z.string(),
    authorId: z.string(),
    authorName: z.string().nullable(),
    authorAvatarUrl: z.string().nullable(),
    type: z.string(),
    category: z.string().nullable(),
    text: z.string(),
    media: z.array(wallMediaSchema),
    createdAt: z.string(),
    reactionCounts: z.record(z.string(), z.number()),
    myReactions: z.array(z.string()),
    commentCount: z.number(),
  })
  .passthrough();

export const wallFeedPageSchema = z
  .object({ posts: z.array(wallPostSchema), nextCursor: z.string().nullable() })
  .passthrough();

export const wallCommentSchema = z
  .object({
    id: z.string(),
    postId: z.string(),
    authorId: z.string(),
    authorName: z.string().nullable(),
    authorAvatarUrl: z.string().nullable(),
    text: z.string(),
    createdAt: z.string(),
  })
  .passthrough();

export const wallCommentsPageSchema = z
  .object({
    comments: z.array(wallCommentSchema),
    nextCursor: z.string().nullable(),
    total: z.number(),
  })
  .passthrough();

export const wallCommentCreadoSchema = z
  .object({ comment: wallCommentSchema, commentCount: z.number() })
  .passthrough();

export const wallCategorySchema = z
  .object({ key: z.string(), label: z.string(), emoji: z.string(), order: z.number() })
  .passthrough();

export const wallCategoriesResponseSchema = z
  .object({ categories: z.array(wallCategorySchema) })
  .passthrough();

export const wallReactionToggleSchema = z
  .object({ reacted: z.boolean(), reactionCounts: z.record(z.string(), z.number()) })
  .passthrough();

/** `UrlSubidaMediaResponse` (`WallController.urlDeSubida`, POST /wall/media/upload-url). */
export const urlSubidaMuroSchema = z
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

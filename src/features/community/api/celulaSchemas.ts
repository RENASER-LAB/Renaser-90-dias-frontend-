import { z } from 'zod';

/**
 * Validación en runtime de lo que responde el backend para "mi célula" (`MiCelulaController`,
 * GET /api/v1/me/cell y GET /api/v1/me/cell/members). Mismo criterio que `wallSchemas.ts`:
 * cada feature valida su propia forma, `passthrough()` para no romper si el backend agrega
 * campos nuevos.
 *
 * Verificado en vivo contra el backend real (2026-09-02), con un aprendiz sin célula
 * (`af4984b2-bf75-4b56-8f1a-f8d6b957d2ab`) y uno con célula y mentor asignados
 * (`11111111-1111-1111-1111-111111111111`, célula "Celula Humo", mentor "Mentor De Prueba"):
 *
 * - Sin célula: hoy el backend responde `404 {"assigned":false}` — bloqueante conocido, ver
 *   `docs/informes/comunidad-mentor-y-tribu.md`. `celulaApi.obtenerMiCelula` ya contempla los
 *   dos casos (200 y 404) para no depender de cuándo se recompile el backend.
 * - Con célula: `200 {"cellId","cellName","cohortName","cohortStatus","mentorName",
 *   "mentorAvatarUrl","memberCount","totalCellsInCohort","videoCallUrl","nextSessionAt"}`.
 */

const miCelulaSinAsignarSchema = z.object({ assigned: z.literal(false) }).passthrough();

const miCelulaAsignadaSchema = z
  .object({
    cellId: z.string(),
    cellName: z.string(),
    cohortName: z.string(),
    cohortStatus: z.string(),
    mentorName: z.string().nullable(),
    mentorAvatarUrl: z.string().nullable(),
    memberCount: z.number(),
    totalCellsInCohort: z.number(),
    videoCallUrl: z.string().nullable(),
    nextSessionAt: z.string().nullable(),
    /* D-206 (2026-09-27), aditivos y opcionales: un backend anterior no los manda. `mentorId` dice
       quién es el mentor (para el «Tú» de la info y para escribirle, D-207) y `mentorPhotoPath` la ruta
       de su tarjeta con nombre, pedida con la sesión (solo en `/me/cells`). */
    mentorId: z.string().nullish(),
    mentorPhotoPath: z.string().nullish(),
  })
  .passthrough();

/**
 * Une los dos cuerpos posibles de `GET /api/v1/me/cell`. `z.union` prueba cada rama en orden:
 * la de "sin asignar" exige el campo `assigned` con valor literal `false`, que la respuesta con
 * célula no tiene, así que no hay ambigüedad entre las dos formas.
 */
export const miCelulaResponseSchema = z.union([miCelulaSinAsignarSchema, miCelulaAsignadaSchema]);

/**
 * `GET /api/v1/me/cells` (D-142) — los grupos del aprendiz, el principal primero. Cada elemento
 * tiene la MISMA forma que la respuesta con célula de `/me/cell`, así que se reusa ese esquema en
 * vez de escribir uno gemelo que podría desincronizarse.
 *
 * Sin grupos responde `{"cells": []}`: no tener grupo es un estado válido, no un error.
 */
export const misCelulasResponseSchema = z
  .object({ cells: z.array(miCelulaAsignadaSchema) })
  .passthrough();

export const cellMemberSchema = z
  .object({
    traineeId: z.string(),
    fullName: z.string(),
    avatarUrl: z.string().nullable(),
    isSelf: z.boolean(),
    /* D-206 (2026-09-27), aditivo y opcional: la ruta de su tarjeta con nombre en el chat del grupo
       (solo en `/me/cells/{id}/members`). Cuando viene, la info muestra la tarjeta e ignora `avatarUrl`. */
    photoPath: z.string().nullish(),
  })
  .passthrough();

export const cellMembersResponseSchema = z.object({ members: z.array(cellMemberSchema) }).passthrough();

/**
 * `GET|PUT /api/v1/admin/cells/{id}/photo` (D-212): si el grupo tiene foto propia y desde cuándo.
 * `photoChangedAt` en `null` = usa la foto de Renaser. La foto en sí la sirve el chat del grupo.
 */
export const fotoDelGrupoSchema = z
  .object({ cellId: z.string(), photoChangedAt: z.string().nullable() })
  .passthrough();

/** Mismo helper que `wallSchemas.ts` — duplicado a propósito, ver el comentario ahí. */
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

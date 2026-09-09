import { z } from 'zod';

/**
 * Validación de los endpoints que YA existen y que un mentor puede llamar hoy.
 *
 * `passthrough()` en todos: que el backend agregue campos no debe romper la app; lo que rompe
 * es que falte o cambie de tipo uno de los que sí se usan.
 */

/** `CohorteResponse` — `GET /api/v1/admin/cohorts` (a un MENTOR le devuelve solo la suya). */
export const cohorteSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    status: z.string(),
    cellCount: z.number(),
  })
  .passthrough();

/** `PerfilBasicoResponse` — lo que hay de cada persona: id, nombre y avatar. Nada más. */
export const perfilBasicoSchema = z
  .object({
    id: z.string(),
    fullName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  })
  .passthrough();

/** `CelulaResponse` — `GET /api/v1/admin/cells?cohortId=…` */
export const celulaResumenSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    cohortId: z.string(),
    videoCallUrl: z.string().nullable(),
    nextSessionAt: z.string().nullable(),
    memberCount: z.number(),
    mentor: perfilBasicoSchema.nullable(),
  })
  .passthrough();

/** `CelulaDetalleResponse` — `GET /api/v1/admin/cells/{id}`. Este SÍ trae `members`. */
export const celulaDetalleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    cohortId: z.string(),
    videoCallUrl: z.string().nullable(),
    nextSessionAt: z.string().nullable(),
    mentor: perfilBasicoSchema.nullable(),
    members: z.array(perfilBasicoSchema),
  })
  .passthrough();

export type CohorteApi = z.infer<typeof cohorteSchema>;
export type CelulaResumenApi = z.infer<typeof celulaResumenSchema>;
export type CelulaDetalleApi = z.infer<typeof celulaDetalleSchema>;

export function validarRespuesta<T>(esquema: z.ZodType, datos: unknown, origen: string): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join('; ');
    throw new Error(`El backend respondió algo inesperado en ${origen} — ${detalle}`);
  }
  return resultado.data as T;
}

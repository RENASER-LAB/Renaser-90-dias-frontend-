import { z } from 'zod';

/**
 * Contratos de la superficie administrativa. Se validan con Zod y `passthrough()` por el mismo
 * criterio que `mentorSchemas`: un campo que el backend agregue mañana no rompe la pantalla de
 * hoy, y uno que falte se ve como error de contrato y no como `undefined` recorriendo la app.
 *
 * Los campos nuevos del SDD 003 (`status`, `type`, `capacity`, `specialty`) van con `.nullish()`
 * a propósito: durante el despliegue conviven una app nueva con un backend anterior, y que la
 * lista de grupos deje de cargar por un campo que todavía no existe sería peor que mostrarla sin
 * el estado.
 */

/** `PerfilBasicoResponse` — id, nombre y avatar. Nada más. */
export const perfilAdminSchema = z
  .object({
    id: z.string(),
    fullName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  })
  .passthrough();

/** VIGENTE | PROGRAMADO | CERRADO | SIN_PERIODO. Lo decide el servidor, en la zona del programa. */
export const estadoGrupoSchema = z.enum(['VIGENTE', 'PROGRAMADO', 'CERRADO', 'SIN_PERIODO']);

export const grupoResumenSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    cohortId: z.string(),
    videoCallUrl: z.string().nullable(),
    nextSessionAt: z.string().nullable(),
    memberCount: z.number(),
    mentor: perfilAdminSchema.nullable(),
    periodStart: z.string().nullish(),
    periodEnd: z.string().nullish(),
    status: estadoGrupoSchema.nullish(),
    type: z.string().nullish(),
    /** Ocupación real del historial: la que mide el cupo. */
    learnerCount: z.number().nullish(),
    /** `null` en recepción: no tiene tope comercial. */
    capacity: z.number().nullish(),
  })
  .passthrough();

export const grupoDetalleSchema = grupoResumenSchema
  .omit({ memberCount: true })
  .extend({ members: z.array(perfilAdminSchema) })
  .passthrough();

export const cohorteAdminSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    startDate: z.string(),
    endDate: z.string().nullable(),
    status: z.string(),
    cellCount: z.number().nullish(),
  })
  .passthrough();

export const mentorCandidatoSchema = z
  .object({
    userId: z.string(),
    fullName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    cellId: z.string().nullable(),
    /** NEGOCIO | MENTE | RELACIONES, o `null` si no la declaró. Nunca se rellena. */
    specialty: z.string().nullish(),
  })
  .passthrough();

export const aprendizCandidatoSchema = z
  .object({
    userId: z.string(),
    fullName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  })
  .passthrough();

export const aprendizAdminSchema = z
  .object({
    id: z.string(),
    fullName: z.string().nullable(),
    email: z.string().nullable(),
    status: z.string(),
    programDay: z.number(),
    phase: z.string().nullish(),
    cellId: z.string().nullable(),
    mentorId: z.string().nullable(),
  })
  .passthrough();

export const paginaAprendicesSchema = z
  .object({
    content: z.array(aprendizAdminSchema),
    total: z.number(),
    page: z.number(),
    size: z.number(),
  })
  .passthrough();

export const solicitudSchema = z
  .object({
    id: z.string(),
    fullName: z.string().nullable(),
    email: z.string().nullable(),
    status: z.string(),
    createdAt: z.string().nullish(),
    phone: z.string().nullish(),
  })
  .passthrough();

export const paginaSolicitudesSchema = z
  .object({
    content: z.array(solicitudSchema),
    total: z.number(),
    page: z.number(),
    size: z.number(),
  })
  .passthrough();

export type PerfilAdminApi = z.infer<typeof perfilAdminSchema>;
export type EstadoGrupoApi = z.infer<typeof estadoGrupoSchema>;
export type GrupoResumenApi = z.infer<typeof grupoResumenSchema>;
export type GrupoDetalleApi = z.infer<typeof grupoDetalleSchema>;
export type CohorteAdminApi = z.infer<typeof cohorteAdminSchema>;
export type MentorCandidatoApi = z.infer<typeof mentorCandidatoSchema>;
export type AprendizCandidatoApi = z.infer<typeof aprendizCandidatoSchema>;
export type AprendizAdminApi = z.infer<typeof aprendizAdminSchema>;
export type PaginaAprendicesApi = z.infer<typeof paginaAprendicesSchema>;
export type SolicitudApi = z.infer<typeof solicitudSchema>;
export type PaginaSolicitudesApi = z.infer<typeof paginaSolicitudesSchema>;

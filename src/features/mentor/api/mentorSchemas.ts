import { z } from 'zod';

/**
 * Validación de los endpoints que YA existen y que un mentor puede llamar hoy.
 *
 * `passthrough()` en todos: que el backend agregue campos no debe romper la app; lo que rompe
 * es que falte o cambie de tipo uno de los que sí se usan.
 */

/**
 * `ContextoMentorResponse` — `GET /api/v1/mentor/context`.
 *
 * Una sola lectura que reemplaza la cadena de tres saltos por `/admin/**` que había antes.
 * `day` es `number | null` a propósito: `null` significa "no cursa el programa", que no es lo
 * mismo que ir por el día 0.
 */
export const contextoMentorSchema = z
  .object({
    personalProgram: z
      .object({ enrolled: z.boolean(), day: z.number().nullable() })
      .passthrough(),
    canAccompany: z.boolean(),
    /**
     * Qué puede hacer con su propio programa. Lo decide el servidor: deducirlo del rol en el
     * cliente es como se termina mostrando un onboarding obligatorio a quien no le corresponde.
     */
    capabilities: z
      .object({
        /** El cliente NO puede dejar pasar sin onboarding. Falso para el staff (D-07). */
        programRequired: z.boolean(),
        /** Tiene rol para iniciar el programa y todavía no lo hizo. */
        canStartProgram: z.boolean(),
        canAccompany: z.boolean(),
      })
      .passthrough(),
    assignments: z.array(
      z
        .object({
          groupId: z.string(),
          groupName: z.string(),
          cohortId: z.string(),
          /** RECEPCION | REGULAR */
          type: z.string(),
          /** MENTOR | GUIA | SOPORTE (APRENDIZ no llega: no es acompañamiento). */
          function: z.string(),
          from: z.string(),
          to: z.string().nullable(),
          /** CON_MENTOR | SOPORTE | SIN_COBERTURA */
          coverage: z.string(),
          learners: z.number(),
          /** `null` en recepción, que no tiene tope comercial. */
          capacity: z.number().nullable(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

/** `AprendicesDelGrupoResponse` — `GET /api/v1/mentor/groups/{groupId}/learners`. */
export const aprendicesGrupoSchema = z
  .object({
    groupId: z.string(),
    groupName: z.string(),
    coverage: z.string(),
    total: z.number(),
    learners: z.array(
      z
        .object({
          userId: z.string(),
          fullName: z.string().nullable(),
          avatarUrl: z.string().nullable(),
          active: z.boolean(),
        })
        .passthrough(),
    ),
    nextCursor: z.string().nullable(),
  })
  .passthrough();

/**
 * `SemanaDelAlumno` — `GET /api/v1/mentor/groups/{g}/learners/{u}/progress`.
 *
 * Tres campos que NO se colapsan entre sí, porque significan cosas distintas: `estadoHabito`
 * (qué pasó con el hábito), `entrega` (si mandó el archivo) y `revision` (qué dijo quien lo
 * miró). `revision` es null cuando no hay entrega — nunca se convierte en "rechazada".
 */
export const semanaAlumnoSchema = z
  .object({
    grupoId: z.string(),
    alumnoId: z.string(),
    nombre: z.string().nullable(),
    inicioDeSemana: z.string(),
    finDeSemana: z.string(),
    diaDePrograma: z.number().nullable(),
    zona: z.string(),
    dias: z.array(
      z
        .object({
          fecha: z.string(),
          diaDePrograma: z.number().nullable(),
          obligaciones: z.array(
            z
              .object({
                registroId: z.string(),
                titulo: z.string(),
                /** PENDIENTE | EN_CURSO | COMPLETADO | FALLIDO | EXPIRADO */
                estadoHabito: z.string(),
                requiereEvidencia: z.boolean(),
                /** NO_REQUERIDA | SIN_ENTREGA | ENTREGADA */
                entrega: z.string(),
                entregadaEn: z.string().nullable(),
                revision: z.string().nullable(),
                evidenciaId: z.string().nullable(),
              })
              .passthrough(),
          ),
        })
        .passthrough(),
    ),
    resumen: z
      .object({
        obligaciones: z.number(),
        cumplidas: z.number(),
        conEntrega: z.number(),
        pendientes: z.number(),
        sinCumplir: z.number(),
      })
      .passthrough(),
    /** COMPLETA | SIN_DATOS. Sin datos NO es "no cumplió". */
    cobertura: z.string(),
    actualizadoEn: z.string(),
  })
  .passthrough();

/** `EvaluacionPropia` — `GET /api/v1/mentor/me/evaluation?month=YYYY-MM`. */
export const evaluacionPropiaSchema = z
  .object({
    mes: z.string(),
    zona: z.string(),
    /** null cuando el estado no es CALCULADA. Nunca cero por falta de datos. */
    porcentaje: z.number().nullable(),
    entregadas: z.number(),
    esperadas: z.number(),
    alumnosEvaluados: z.number(),
    alumnosExcluidos: z.number(),
    tardiasFueraDeVentana: z.number(),
    verificadas: z.number(),
    /** CALCULADA | SIN_MUESTRA | SIN_HISTORIAL */
    estado: z.string(),
    versionFormula: z.string(),
    corteEn: z.string(),
    tramos: z.array(
      z
        .object({
          grupoNombre: z.string().nullable(),
          desde: z.string(),
          hasta: z.string().nullable(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

/**
 * `RankingDeGrupos` — `GET /api/v1/ranking/groups`.
 *
 * `posicion` puede repetirse: los empates la comparten (P-08). `porcentaje` es `null` en los
 * grupos sin muestra, que aparecen al final SIN calificación — no son los peores, son los que
 * no se pueden medir.
 */
export const rankingGruposSchema = z
  .object({
    cohorteId: z.string(),
    mes: z.string(),
    zona: z.string().nullable(),
    versionFormula: z.string().nullable(),
    grupos: z.array(
      z
        .object({
          posicion: z.number(),
          grupoId: z.string(),
          nombre: z.string(),
          porcentaje: z.number().nullable(),
          muestra: z.number(),
          entregadas: z.number(),
          esperadas: z.number(),
          estado: z.string(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

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

export type ContextoMentorApi = z.infer<typeof contextoMentorSchema>;
export type SemanaAlumnoApi = z.infer<typeof semanaAlumnoSchema>;
export type DiaAlumnoApi = SemanaAlumnoApi['dias'][number];
export type ObligacionDiaApi = DiaAlumnoApi['obligaciones'][number];
export type EvaluacionPropiaApi = z.infer<typeof evaluacionPropiaSchema>;
export type RankingGruposApi = z.infer<typeof rankingGruposSchema>;
export type AsignacionMentorApi = ContextoMentorApi['assignments'][number];
export type AprendicesGrupoApi = z.infer<typeof aprendicesGrupoSchema>;
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

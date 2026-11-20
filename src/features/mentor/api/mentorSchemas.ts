import { medicionDeLaFichaSchema } from '../../pasos/utils/medicionDeLaFicha';
import { z } from 'zod';

import { radarSchemas } from '../../radar/api/radarSchemas';

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
        /**
         * Si la app muestra la entrada a Administración (SDD 003). `.nullish()` porque durante el
         * despliegue una app nueva puede hablar con un backend anterior que todavía no lo manda:
         * sin capacidad declarada la entrada no aparece, que es el lado seguro del error.
         */
        canAdminister: z.boolean().nullish(),
        /**
         * Si la app ofrece «Descargar» en Comunidad → Ranking (spec 006 del backend, permiso `EXPORT_RANKING`:
         * líder de mentores, alquimista, administrador y Soporte TI). Mismo criterio que `canAdminister`:
         * `.nullish()` porque un backend anterior no lo manda, y sin capacidad declarada no hay botón.
         */
        canExportRanking: z.boolean().nullish(),
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
/** Spec 055 FR-013: el pilar de un hábito; cualquier otro valor (o su ausencia) se lee como `null`. */
export const pilarSchema = z.string().nullish().catch(null);

export const semanaAlumnoSchema = z
  .object({
    /**
     * `null` cuando el alumno no tiene grupo vigente. Al mentor nunca le llega así —él pregunta
     * por un grupo que acompaña—, pero la misma respuesta la sirve la lectura administrativa, que
     * mira a la persona y no al grupo: un aprendiz recién aprobado, o uno cuyo grupo cerró, tiene
     * semana igual. Es dato, no ausencia de datos.
     */
    grupoId: z.string().nullable(),
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
                /**
                 * Spec 005 (R-6): en el post diario, la publicación del Muro con la que se cumplió. Opcional y
                 * tolerante: un backend anterior no lo manda, y un valor raro pierde el botón, no la semana.
                 */
                publicacionId: z.string().nullish().catch(null),
                /**
                 * Spec 055 FR-013: el pilar del hábito (`CUERPO`, `MENTE`, `ESPIRITU`, `EMOCIONES`) o `null`. Opcional y
                 * tolerante: un servidor anterior no lo manda y un valor raro se lee como «sin pilar», no rompe la semana.
                 */
                pilar: pilarSchema,
                /**
                 * Spec 037 (D-310): los km del día y de dónde salieron (la captura o los pasos del teléfono, con su fuente y si
                 * quedó «por revisar»). Opcional y tolerante: un backend anterior no lo manda y un valor raro pierde la línea
                 * de los km, no la semana.
                 */
                medicion: medicionDeLaFichaSchema.nullish().catch(null),
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

/**
 * `GET /api/v1/mentor/groups/{g}/learners/{u}/radar` — el Código Renaser de un aprendiz.
 *
 * **No se escribe un esquema nuevo a propósito.** La respuesta es exactamente la de
 * `GET /api/v1/radar/history`, que la app ya consume en `features/radar`, así que se reusa el
 * suyo: dos esquemas para la misma forma es la manera de que dentro de seis meses uno valide
 * un campo que el otro no, y que nadie sepa cuál de los dos está bien.
 */
export const radarDelAlumnoSchema = radarSchemas.historial;

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
    /**
     * Spec 057 FR-010: los tres campos nuevos son aditivos. Un servidor viejo no los manda, así que todo es opcional: sin ellos la hoja se
     * ve como en la fase 1.
     */
    /** El porcentaje del mes anterior, o null si ese mes no está CALCULADA. */
    porcentajeMesAnterior: z.number().nullish(),
    /** «Quién baja el promedio» (FR-012): hasta 5 aprendices vigentes con menos de 80 %, del menor al mayor. */
    quienBaja: z
      .array(
        z
          .object({
            aprendizId: z.string(),
            grupoId: z.string().nullish(),
            nombre: z.string().nullish(),
            porcentaje: z.number().nullish(),
            entregadas: z.number().nullish(),
            esperadas: z.number().nullish(),
          })
          .passthrough(),
      )
      .nullish(),
    /** «Qué sigue» (FR-011): hasta 3 acciones. ESCRIBIR trae el aprendiz al que se le escribe. */
    acciones: z
      .array(
        z
          .object({
            tipo: z.string(),
            titulo: z.string().nullish(),
            motivo: z.string().nullish(),
            aprendizId: z.string().nullish(),
            grupoId: z.string().nullish(),
          })
          .passthrough(),
      )
      .nullish(),
  })
  .passthrough();

/**
 * Spec 057 FR-020: `GET /api/v1/mentor/me/groups/history` — los grupos que el mentor ya no acompaña. Tolerante: llega una lista o un
 * objeto con la lista adentro; lo que falta es «sin dato» (nunca un 0 inventado) y un tramo sin nombre ni período no se dibuja.
 * `personas` no lleva ids a propósito (FR-021): la sección es de solo lectura.
 */
export const grupoAnteriorSchema = z
  .object({
    grupoId: z.string().nullish(),
    nombre: z.string().nullish(),
    desde: z.string().nullish(),
    hasta: z.string().nullish(),
    aprendices: z.number().nullish(),
    puestoFinal: z.object({ posicion: z.number(), total: z.number() }).passthrough().nullish(),
    colorFinal: z.string().nullish(),
    porcentajeFinal: z.number().nullish(),
    personas: z.array(z.object({ nombre: z.string().nullish(), colorFinal: z.string().nullish() }).passthrough()).nullish(),
  })
  .passthrough();

export const historialDeGruposSchema = z.union([
  z.array(grupoAnteriorSchema),
  z
    .object({
      grupos: z.array(grupoAnteriorSchema).nullish(),
      tramos: z.array(grupoAnteriorSchema).nullish(),
      anteriores: z.array(grupoAnteriorSchema).nullish(),
    })
    .passthrough(),
]);

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

/**
 * Spec 055: `GET /api/v1/mentor/groups/{g}/learners/{u}/dias?desde&hasta` — el color y el porcentaje del semáforo de cada día.
 * Tolerante: un color o un estado que la app no conoce se lee como «sin datos» (nunca verde por falta de datos).
 */
export const diasDelAprendizSchema = z
  .object({
    zona: z.string().nullish(),
    diaUno: z.string().nullish(),
    dias: z.array(
      z
        .object({
          fecha: z.string(),
          estado: z.string().nullish(),
          color: z.string().nullish(),
          porcentaje: z.number().nullish(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export type ContextoMentorApi = z.infer<typeof contextoMentorSchema>;
export type SemanaAlumnoApi = z.infer<typeof semanaAlumnoSchema>;
export type DiaAlumnoApi = SemanaAlumnoApi['dias'][number];
export type ObligacionDiaApi = DiaAlumnoApi['obligaciones'][number];
export type EvaluacionPropiaApi = z.infer<typeof evaluacionPropiaSchema>;
export type QuienBajaApi = NonNullable<EvaluacionPropiaApi['quienBaja']>[number];
export type AccionDeLaEvaluacionApi = NonNullable<EvaluacionPropiaApi['acciones']>[number];
export type GrupoAnteriorApi = z.infer<typeof grupoAnteriorSchema>;
export type RankingGruposApi = z.infer<typeof rankingGruposSchema>;
export type AsignacionMentorApi = ContextoMentorApi['assignments'][number];
export type AprendicesGrupoApi = z.infer<typeof aprendicesGrupoSchema>;

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

import { z } from 'zod';

/**
 * Contrato de la gestión del Líder de Mentores (backend D-241, módulo `leadership`).
 *
 * Cada bloque trae `source`: `OK` o `UNAVAILABLE`. Con `UNAVAILABLE` sus cifras llegan en null y la
 * app lo dice con palabras; **nunca** lo pinta como cero ni como «al día» (SDD 002, RL-05/RL-21).
 * Ningún campo trae un aprendiz: el líder ve cantidades, no personas (decisión del dueño, 01/10).
 */
const fuente = z.enum(['OK', 'UNAVAILABLE']);

const colorSemaforo = z.enum(['VERDE', 'AMARILLO', 'ROJO', 'SIN_DATOS']);

export const semaforoResumenSchema = z
  .object({
    verde: z.number(),
    amarillo: z.number(),
    rojo: z.number(),
    sinDatos: z.number(),
    total: z.number(),
    promedio: z.number().nullable(),
    color: colorSemaforo,
    etiqueta: z.string().nullable().optional(),
  })
  .passthrough();

const grupoSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    trainees: z.number(),
    semaforo: semaforoResumenSchema.nullable(),
  })
  .passthrough();

export const indicadoresSchema = z
  .object({
    userId: z.string(),
    fullName: z.string(),
    avatarUrl: z.string().nullable().optional(),
    groups: z.object({ source: fuente, items: z.array(grupoSchema).nullable() }).passthrough(),
    traineeCount: z.number().nullable(),
    semaforo: z.object({ source: fuente, summary: semaforoResumenSchema.nullable() }).passthrough(),
    attention: z
      .object({
        source: fuente,
        open: z.number().nullable(),
        oldestOpenDays: z.number().nullable(),
        answered: z.number().nullable(),
        medianResponseHours: z.number().nullable(),
      })
      .passthrough(),
    evaluation: z
      .object({
        source: fuente,
        month: z.string().nullable(),
        percentage: z.number().nullable(),
        delivered: z.number().nullable(),
        expected: z.number().nullable(),
        traineesEvaluated: z.number().nullable(),
        state: z.string().nullable(),
        formulaVersion: z.string().nullable().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const padronSchema = z
  .object({
    month: z.string(),
    timezone: z.string(),
    cutoffAt: z.string(),
    semaforoFrom: z.string().nullable(),
    semaforoTo: z.string().nullable(),
    mentors: z.array(indicadoresSchema),
  })
  .passthrough();

export const tipoObservacionSchema = z.enum(['RECONOCIMIENTO', 'SUGERENCIA', 'ALERTA']);

export const observacionSchema = z
  .object({
    id: z.string(),
    mentorId: z.string(),
    type: tipoObservacionSchema,
    text: z.string(),
    sentByChat: z.boolean(),
    messageId: z.string().nullable().optional(),
    createdAt: z.string(),
  })
  .passthrough();

export const fichaSchema = z
  .object({
    mentor: indicadoresSchema,
    accountActive: z.boolean(),
    profile: z
      .object({ level: z.string().nullable(), operationalStatus: z.string().nullable(), since: z.string().nullable() })
      .passthrough()
      .nullable(),
    month: z.string(),
    timezone: z.string(),
    cutoffAt: z.string(),
    recentObservations: z.array(observacionSchema),
  })
  .passthrough();

const entradaDelReporteSchema = z
  .object({
    mentor: indicadoresSchema,
    observations: z
      .object({
        source: fuente,
        recognitions: z.number().nullable(),
        suggestions: z.number().nullable(),
        alerts: z.number().nullable(),
        total: z.number().nullable(),
      })
      .passthrough(),
  })
  .passthrough();

export const reporteSchema = z
  .object({
    month: z.string(),
    timezone: z.string(),
    cutoffAt: z.string(),
    closed: z.boolean(),
    answeredWithoutAttribution: z.number().nullable(),
    ranked: z.array(entradaDelReporteSchema),
    withoutSample: z.array(entradaDelReporteSchema),
  })
  .passthrough();

export type SemaforoResumenApi = z.infer<typeof semaforoResumenSchema>;
export type IndicadoresApi = z.infer<typeof indicadoresSchema>;
export type PadronApi = z.infer<typeof padronSchema>;
export type ObservacionApi = z.infer<typeof observacionSchema>;
export type TipoObservacion = z.infer<typeof tipoObservacionSchema>;
export type FichaApi = z.infer<typeof fichaSchema>;
export type EntradaDelReporteApi = z.infer<typeof entradaDelReporteSchema>;
export type ReporteApi = z.infer<typeof reporteSchema>;

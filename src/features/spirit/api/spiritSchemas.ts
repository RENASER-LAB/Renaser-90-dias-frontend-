import { z } from 'zod';

/**
 * Validación en runtime de lo que responde `/api/v1/spirit-audio/*`.
 *
 * Mismo criterio que `features/academy/api/academySchemas.ts`: los tipos de TypeScript se borran
 * al compilar, así que sin esto un cambio de nombre de campo en el backend aparece como un
 * `undefined` silencioso muy lejos de la causa. `validarRespuesta` se duplica por feature a
 * propósito (AGENTS.md, estructura modular).
 *
 * `passthrough()` en todos los objetos: que el backend agregue campos no debe romper la app.
 */

const spiritDaySchema = z
  .object({
    day: z.number(),
    title: z.string().nullable(),
    // El backend serializa el estado en minúsculas (`SpiritDayResponse.from` hace `toLowerCase`).
    state: z.enum(['locked', 'current', 'submitted', 'missed']),
    unlockedAt: z.string().nullable(),
    deadlineAt: z.string().nullable(),
    submittedAt: z.string().nullable(),
    summaryText: z.string().nullable(),
    // Los tres campos de audio son nuevos: `nullish()` para que un backend anterior a este cambio
    // (o un día sin archivo publicado) no invalide toda la respuesta.
    audioUrl: z.string().nullish(),
    audioMimeType: z.string().nullish(),
    audioSizeBytes: z.number().nullish(),
  })
  .passthrough();

const spiritStatusSchema = z
  .object({
    days: z.array(spiritDaySchema),
    currentDay: z.number().nullable(),
  })
  .passthrough();

const submitSpiritSummarySchema = z.object({ onTime: z.boolean() }).passthrough();

export const spiritSchemas = {
  status: spiritStatusSchema,
  submit: submitSpiritSummarySchema,
};

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

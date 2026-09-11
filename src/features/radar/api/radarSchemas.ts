import { z } from 'zod';

/**
 * Validación en runtime de lo que responde `/api/v1/radar`. Mismo criterio que el resto de la
 * app: los tipos de TypeScript se borran al compilar, y sin esto un cambio de nombre de campo en
 * el backend aparece como un `undefined` silencioso muy lejos de la causa.
 *
 * `passthrough()` en todos los objetos a propósito: que el backend agregue campos no rompe nada.
 */

const registroRadarSchema = z
  .object({
    id: z.string(),
    whatAmIDoing: z.string(),
    whatAmIThinking: z.string(),
    whatAmIFeeling: z.string(),
    energyLevel: z.number(),
    whatAmIAvoiding: z.string(),
    createdAt: z.string(),
  })
  .passthrough();

/**
 * `createdAt` es `nullable` porque el controller devuelve `new UltimoRadarResponse(null)` cuando
 * la persona nunca respondió — no es un error, es el caso del primer check-in del día 1. Y
 * `optional` además, porque Jackson puede omitir el campo nulo según cómo esté configurado.
 */
const ultimoRadarSchema = z
  .object({ createdAt: z.string().nullable().optional() })
  .passthrough();

const historialRadarSchema = z
  .object({
    entries: z.array(registroRadarSchema),
    nextCursor: z.string().nullable().optional(),
  })
  .passthrough();

export const radarSchemas = {
  registro: registroRadarSchema,
  ultimo: ultimoRadarSchema,
  historial: historialRadarSchema,
};

export function validarRespuesta<T>(esquema: z.ZodType, datos: unknown, origen: string): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .slice(0, 3)
      .map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join(' | ');
    throw new Error(`Respuesta inesperada de ${origen} — ${detalle}`);
  }
  return resultado.data as T;
}

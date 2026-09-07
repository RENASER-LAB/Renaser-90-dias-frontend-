import { z } from 'zod';

/**
 * Validación en runtime de lo que responde el backend para las Rocas Maestras. Mismo criterio que
 * `features/habits/api/habitsSchemas.ts`: los tipos de TypeScript se borran al compilar, así que
 * sin esto un cambio de nombre de campo en el backend aparece como un `undefined` silencioso muy
 * lejos de la causa, en vez de un error claro en la primera llamada.
 *
 * `passthrough()` a propósito: que el backend agregue campos nuevos no debe romper la app.
 */

const rocaMaestraSchema = z
  .object({
    id: z.string(),
    eje: z.enum(['CUERPO', 'TRABAJO', 'RELACIONES']),
    objetivo: z.string(),
    // Los cuatro van juntos o los cuatro en null: un objetivo puede ser cualitativo. El backend lo
    // impone con un CHECK (V35), acá solo se refleja.
    meta: z.number().nullable(),
    avance: z.number().nullable(),
    unidad: z.string().nullable(),
    porcentaje: z.number().nullable(),
    creadoEn: z.string(),
    actualizadoEn: z.string(),
  })
  .passthrough();

export const objetivosSchemas = {
  rocaMaestra: rocaMaestraSchema,
  rocasMaestras: z.array(rocaMaestraSchema),
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

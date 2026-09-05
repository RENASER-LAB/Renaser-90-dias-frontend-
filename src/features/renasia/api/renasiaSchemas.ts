import { z } from 'zod';

/**
 * Validación en runtime del contrato de RENASIA. Mismo criterio que el resto de las features
 * (`home`, `community`): los tipos de TypeScript se borran al compilar, así que sin esto un
 * cambio de nombre de campo en el backend aparece como un `undefined` silencioso muy lejos de la
 * causa, en vez de un error claro en la primera llamada.
 *
 * `validarRespuesta` está duplicada acá a propósito (AGENTS.md: estructura modular por feature,
 * cada una dueña de su propia validación).
 *
 * `passthrough()` en los objetos, a propósito: que el backend agregue campos nuevos no debe
 * romper la app.
 */

const mensajeRenasiaSchema = z
  .object({
    id: z.string(),
    role: z.enum(['USER', 'ASSISTANT']),
    content: z.string(),
    sourceLessonIds: z.array(z.string()).nullable(),
    createdAt: z.string(),
  })
  .passthrough();

const historialRenasiaSchema = z
  .object({
    messages: z.array(mensajeRenasiaSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  })
  .passthrough();

/** `{"tipo":"texto","valor":"..."}` — puede repetirse muchas veces por respuesta. */
const eventoTextoSchema = z.object({ tipo: z.literal('texto'), valor: z.string() }).passthrough();
/** `{"tipo":"fuentes","lecciones":[...]}` — a lo sumo una vez por respuesta. */
const eventoFuentesSchema = z
  .object({ tipo: z.literal('fuentes'), lecciones: z.array(z.string()) })
  .passthrough();
/** `{"tipo":"fin"}` — siempre el último evento del stream. */
const eventoFinSchema = z.object({ tipo: z.literal('fin') }).passthrough();
/** `{"tipo":"error","valor":"..."}` — D-100: falla del modelo, apta para mostrar. */
const eventoErrorSchema = z.object({ tipo: z.literal('error'), valor: z.string() }).passthrough();

/**
 * Rama de escape para tipos de evento que esta versión de la app no conoce.
 *
 * NO se usa `discriminatedUnion` a propósito: rechaza cualquier `tipo` que no esté en la lista,
 * y eso rompería el stream entero el día que el backend agregue un evento nuevo (por ejemplo,
 * avisar que el agente está usando una herramienta). Una app instalada hace meses tiene que
 * poder ignorar lo que no entiende y seguir mostrando la respuesta.
 *
 * `union` prueba en orden, así que los tres tipos conocidos matchean primero y solo lo
 * desconocido cae acá.
 */
const eventoDesconocidoSchema = z.object({ tipo: z.string() }).passthrough();

const eventoRenasiaSchema = z.union([
  eventoTextoSchema,
  eventoFuentesSchema,
  eventoFinSchema,
  eventoErrorSchema,
  eventoDesconocidoSchema,
]);

export const renasiaSchemas = {
  historial: historialRenasiaSchema,
  evento: eventoRenasiaSchema,
};

export function validarRespuesta<T>(esquema: z.ZodType<T>, datos: unknown, origen: string): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .slice(0, 3)
      .map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join(' | ');
    throw new Error(`Respuesta inesperada de ${origen} — ${detalle}`);
  }
  return resultado.data;
}

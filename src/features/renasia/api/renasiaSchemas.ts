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
    // E-141: se valida pero no se muestra. El backend no se tocó y lo sigue mandando; sacarlo del
    // esquema no dejaría de recibirlo, solo dejaría de documentar que llega.
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
/**
 * `{"tipo":"fuentes","lecciones":[...]}` — a lo sumo una vez por respuesta.
 *
 * E-141: se valida y se descarta. Sigue en la unión a propósito, y no se deja caer en
 * `eventoDesconocidoSchema`: mientras el backend emita este evento, el esquema es la única
 * documentación de su forma real.
 */
const eventoFuentesSchema = z
  .object({ tipo: z.literal('fuentes'), lecciones: z.array(z.string()) })
  .passthrough();
/** `{"tipo":"fin"}` — siempre el último evento del stream. */
const eventoFinSchema = z.object({ tipo: z.literal('fin') }).passthrough();
/** `{"tipo":"error","valor":"..."}` — D-100: falla del modelo, apta para mostrar. */
const eventoErrorSchema = z.object({ tipo: z.literal('error'), valor: z.string() }).passthrough();

/** `{"tipo":"propuesta",...}` — D-153: una escritura que la persona confirma con un botón. */
const eventoPropuestaSchema = z
  .object({ tipo: z.literal('propuesta'), id: z.string(), resumen: z.string(), venceEn: z.string() })
  .passthrough();

/** `{"tipo":"evidencia",...}` — el acompañante pide la foto de un hábito (2026-09-26). */
const eventoEvidenciaSchema = z
  .object({ tipo: z.literal('evidencia'), registroId: z.string(), titulo: z.string(), venceEn: z.string() })
  .passthrough();

/** Respuesta de confirmar una propuesta. */
const resultadoPropuestaSchema = z
  .object({ estado: z.enum(['CONFIRMADA', 'FALLIDA']), mensaje: z.string() })
  .passthrough();

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
  eventoPropuestaSchema,
  eventoEvidenciaSchema,
  eventoDesconocidoSchema,
]);

/**
 * `GET /api/v1/renasia/memoria` (D-167). `categoria` es texto libre y no un enum a propósito: una
 * categoría nueva del backend no puede romper el perfil de una app instalada hace meses; se muestra
 * con su `titulo`, al final.
 */
const recuerdoRenasiaSchema = z
  .object({ id: z.string(), categoria: z.string(), titulo: z.string(), texto: z.string() })
  .passthrough();

const memoriaRenasiaSchema = z
  .object({ activa: z.boolean(), recuerdos: z.array(recuerdoRenasiaSchema), resumen: z.string().nullable() })
  .passthrough();

export const renasiaSchemas = {
  historial: historialRenasiaSchema,
  evento: eventoRenasiaSchema,
  resultadoPropuesta: resultadoPropuestaSchema,
  memoria: memoriaRenasiaSchema,
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

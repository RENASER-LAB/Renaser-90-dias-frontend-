import { z } from 'zod';

/**
 * Validación en runtime de lo que responde el backend para hábitos. Mismo criterio que
 * `features/academy/api/academySchemas.ts`: los tipos de TypeScript se borran al compilar, así que
 * sin esto un cambio de nombre de campo en el backend aparece como un `undefined` silencioso muy
 * lejos de la causa, en vez de un error claro en la primera llamada.
 *
 * `passthrough()` en todos los objetos a propósito: que el backend agregue campos nuevos no debe
 * romper la app.
 */

const habitoCatalogoSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    habitType: z.string(),
    category: z.string(),
    evidenceRequirement: z.string(),
    isOptional: z.boolean(),
    isSystemHabit: z.boolean(),
    isDeactivatable: z.boolean(),
  })
  .passthrough();

const preferenciaHabitoSchema = z
  .object({
    habitId: z.string(),
    title: z.string(),
    triggerTime: z.string().nullable(),
    limitTime: z.string().nullable(),
    customized: z.boolean(),
    pendingChange: z.unknown().nullable(),
  })
  .passthrough();

const trackDelDiaSchema = z
  .object({
    id: z.string(),
    habitoId: z.string(),
    fechaEjecucion: z.string(),
    diaPrograma: z.number(),
    tipoDia: z.string(),
    esOpcional: z.boolean(),
    estado: z.string(),
    puntosOtorgados: z.number(),
    completadoEn: z.string().nullable(),
    respuestaTexto: z.string().nullable(),
    calificacionProductividad: z.number().nullable(),
    guia: z.unknown().nullable(),
    tituloHabito: z.string(),
    tipoHabito: z.string(),
    horaDisparo: z.string().nullable(),
    horaLimite: z.string().nullable(),
  })
  .passthrough();

export const habitsSchemas = {
  catalogo: z.array(habitoCatalogoSchema),
  /** El backend envuelve las preferencias en `{habits: [...]}`, no las devuelve sueltas. */
  preferencias: z.object({ habits: z.array(preferenciaHabitoSchema) }).passthrough(),
  tracksDeHoy: z.array(trackDelDiaSchema),
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

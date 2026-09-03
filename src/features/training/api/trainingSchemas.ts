import { z } from 'zod';

/**
 * Validación en runtime de lo que responde el backend para `TrainingScreen` (rocas + evidencia).
 * Mismo criterio que `features/habits/api/habitsSchemas.ts`: sin esto, un cambio de nombre de
 * campo en el backend aparece como `undefined` silencioso muy lejos de la causa.
 *
 * `passthrough()` en todos los objetos a propósito: que el backend agregue campos nuevos no debe
 * romper la app.
 */

const rocaDiariaSchema = z
  .object({
    id: z.string(),
    fecha: z.string(),
    posicion: z.number(),
    titulo: z.string(),
    descripcion: z.string().nullable(),
    color: z.string(),
    puntajeImpacto: z.number(),
    esDelegable: z.boolean(),
    eje: z.string(),
    rocaSemanalId: z.string().nullable(),
    horaInicio: z.string().nullable(),
    horaFin: z.string().nullable(),
    completada: z.boolean(),
    completadaEn: z.string().nullable(),
    puntosOtorgados: z.number(),
    bloqueada: z.boolean(),
  })
  .passthrough();

const evidenciaSchema = z
  .object({
    id: z.string(),
    participanteId: z.string(),
    registroHabitoId: z.string().nullable(),
    rocaDiariaId: z.string().nullable(),
    registroEspirituId: z.string().nullable(),
    tipo: z.string(),
    contenidoTexto: z.string().nullable(),
    timestampExif: z.string().nullable(),
    subidaEn: z.string(),
    gpsLat: z.number().nullable(),
    gpsLng: z.number().nullable(),
    esPrincipal: z.boolean(),
    estadoValidacion: z.string(),
    notasValidacion: z.string().nullable(),
    intentosIa: z.number(),
    penalizacionAplicada: z.boolean(),
    publicadaEnMuro: z.boolean(),
  })
  .passthrough();

export const trainingSchemas = {
  rocasDeHoy: z.array(rocaDiariaSchema),
  rocaDiaria: rocaDiariaSchema,
  evidencePage: z.object({ evidencias: z.array(evidenciaSchema), nextCursor: z.string().nullable() }).passthrough(),
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

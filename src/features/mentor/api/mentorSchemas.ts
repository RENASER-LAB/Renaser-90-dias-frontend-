import { z } from 'zod';

/**
 * Validación en runtime de lo que devuelve el endpoint de célula del mentor.
 *
 * `passthrough()` en todos: que el backend agregue campos no debe romper la app; lo que rompe
 * es que falte o cambie de tipo uno de los que sí se usan.
 *
 * Casi todo es `nullable`. No es pereza: cada `null` es un "todavía no se sabe" distinto —
 * un alumno que no arrancó su programa, una semana que el servidor aún no calcula, una célula
 * sin sesión agendada. La pantalla los pinta distinto, y por eso no se colapsan a cero.
 */

export const celulaResumenSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    cohorte: z.string().nullable(),
    proximaSesionEn: z.string().nullable(),
    urlVideollamada: z.string().nullable(),
  })
  .passthrough();

export const alumnoCelulaSchema = z
  .object({
    participanteId: z.string(),
    nombre: z.string().nullable(),
    diaPrograma: z.number().nullable(),
    ultimaActividadEn: z.string().nullable(),
    habitosProgramados: z.number().nullable(),
    habitosCumplidos: z.number().nullable(),
    evidenciasPendientes: z.number().nullable(),
  })
  .passthrough();

export const miCelulaSchema = z
  .object({
    celula: celulaResumenSchema,
    alumnos: z.array(alumnoCelulaSchema),
  })
  .passthrough();

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

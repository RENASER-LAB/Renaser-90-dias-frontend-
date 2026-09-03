import { z } from 'zod';

/**
 * Validacion en runtime de `GET /api/v1/home`. Mismo criterio que
 * `features/habits/api/habitsSchemas.ts`: los tipos de TypeScript se borran al compilar, asi que
 * sin esto un cambio de nombre de campo en el backend aparece como un `undefined` silencioso muy
 * lejos de la causa, en vez de un error claro en la primera llamada.
 *
 * `passthrough()` en todos los objetos a proposito: que el backend agregue campos nuevos no debe
 * romper la app.
 *
 * `validarRespuesta` esta duplicada en cada feature a proposito (AGENTS.md: estructura modular
 * por feature, cada una duena de su propia validacion).
 */

const conteoHoySchema = z
  .object({
    completados: z.number(),
    total: z.number(),
  })
  .passthrough();

/**
 * Las rocas vienen con `completadas` (femenino) y los habitos con `completados`. No es un
 * descuido del backend, son dos records distintos; se normaliza aca para que la pantalla lea
 * un solo nombre.
 */
const conteoRocasSchema = z
  .object({
    completadas: z.number(),
    total: z.number(),
  })
  .passthrough();

const proximoEventoSchema = z
  .object({
    eventoId: z.string(),
    titulo: z.string(),
    iniciaEn: z.string(),
  })
  .passthrough();

/**
 * `fase` se valida como string y no como enum cerrado: si el backend agrega una quinta fase, la
 * app tiene que seguir funcionando y mostrar el dia igual, no romper la pantalla de inicio.
 *
 * `coherencia` llega como numero (BigDecimal de Java serializado por Jackson).
 */
const resumenHomeSchema = z
  .object({
    puntosLiga: z.number(),
    coherencia: z.number(),
    rachaActual: z.number(),
    rachaMaxima: z.number(),
    diaPrograma: z.number(),
    inscrito: z.boolean(),
    fase: z.string().nullable(),
    habitosHoy: conteoHoySchema.nullable(),
    rocasHoy: conteoRocasSchema.nullable(),
    proximoEvento: proximoEventoSchema.nullable(),
    notificacionesNoLeidas: z.number().nullable(),
    bloqueos: z.array(z.string()),
  })
  .passthrough();

export const homeSchemas = {
  resumen: resumenHomeSchema,
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

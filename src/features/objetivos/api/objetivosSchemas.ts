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
    // Agregada por V43 (E-166). Nullable también hacia adelante: las rocas viejas no la tienen.
    lineaBase: z.number().nullable(),
    porcentaje: z.number().nullable(),
    creadoEn: z.string(),
    actualizadoEn: z.string(),
  })
  .passthrough();

const rocaSemanalSchema = z
  .object({
    id: z.string(),
    rocaMaestraId: z.string(),
    numeroSemana: z.number(),
    titulo: z.string(),
    // Siempre tres, ya ordenadas por el servidor. Si algún día llegan menos, es un bug del backend
    // y conviene que explote acá y no en un `acciones[2]` undefined dentro de la pantalla.
    accionesCriticas: z.array(z.string()),
    obstaculo: z.string().nullable(),
    contingencia: z.string().nullable(),
    autoevaluacionInicio: z.number().nullable(),
    // Los tres de cierre llegan en null mientras la semana sigue abierta.
    autoevaluacionFin: z.number().nullable(),
    bloqueoPrincipal: z.string().nullable(),
    correccion: z.string().nullable(),
    creadoEn: z.string(),
    actualizadoEn: z.string(),
  })
  .passthrough();

const rocaDiariaSchema = z
  .object({
    id: z.string(),
    fecha: z.string(),
    posicion: z.number(),
    titulo: z.string(),
    descripcion: z.string().nullable(),
    color: z.enum(['VERDE', 'AMARILLA', 'ROJA']),
    puntajeImpacto: z.number(),
    esDelegable: z.boolean(),
    eje: z.enum(['CUERPO', 'TRABAJO', 'RELACIONES']),
    rocaSemanalId: z.string().nullable(),
    horaInicio: z.string().nullable(),
    horaFin: z.string().nullable(),
    completada: z.boolean(),
    completadaEn: z.string().nullable(),
    puntosOtorgados: z.number(),
    bloqueada: z.boolean(),
  })
  .passthrough();

const urlSubidaEvidenciaSchema = z
  .object({ uploadUrl: z.string(), bucket: z.string(), ruta: z.string() })
  .passthrough();

export const objetivosSchemas = {
  rocaMaestra: rocaMaestraSchema,
  rocasMaestras: z.array(rocaMaestraSchema),
  rocaSemanal: rocaSemanalSchema,
  rocasSemanales: z.array(rocaSemanalSchema),
  rocaDiaria: rocaDiariaSchema,
  rocasDiarias: z.array(rocaDiariaSchema),
  urlSubidaEvidencia: urlSubidaEvidenciaSchema,
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

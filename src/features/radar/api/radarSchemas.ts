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
    /* Spec 012: la hora prevista (0..23). Ausente en un backend anterior y en los registros viejos. Un valor
       que no es un número se pierde SOLO él: el registro, que es lo que la persona escribió, sigue. */
    horaPrevista: z.number().nullish().catch(null),
  })
  .passthrough();

/** Las horas en punto de un día, de 0 a 23, sin repetir y ordenadas. Lo demás se descarta acá y no más adelante. */
function horasValidas(horas: readonly number[] | null | undefined): number[] {
  return [...new Set((horas ?? []).filter(h => Number.isInteger(h) && h >= 0 && h <= 23))].sort((a, b) => a - b);
}

/**
 * Un día con horas propias (cuarta ronda): `dia` ISO 1..7 y sus horas (`[]` = sin Radar ese día). Un día roto (sin `dia`
 * o sin la lista de horas) se pierde SOLO él y ese día sigue las de todos: no se lo lee como «sin Radar», que sería
 * apagarle los avisos a alguien por un campo que no se entendió.
 */
const diaDeMiRadarSchema = z
  .object({ dia: z.number(), horas: z.array(z.number()) })
  .passthrough()
  .transform(d => ({ dia: d.dia, horas: horasValidas(d.horas) }));

/**
 * Mi Radar (spec 012): encendido o apagado, las horas de todos los días y las de los días que tienen las suyas.
 * `horas` ausente o con basura se lee como «ninguna»; las que no son horas en punto de un día se descartan acá y no más
 * adelante (`normalizarMiRadar`). **`dias` ausente (un backend anterior) es «ningún día tiene horas propias»**: siempre
 * sale un arreglo, ordenado por día, sin días fuera de 1..7 ni repetidos (gana el primero).
 */
const miRadarSchema = z
  .object({
    encendido: z.boolean(),
    horas: z.array(z.number()).nullish().catch(null),
    dias: z.array(z.unknown()).nullish().catch(null),
  })
  .passthrough()
  .transform(m => {
    if (!m.encendido) return { encendido: false, horas: [] as number[], dias: [] as { dia: number; horas: number[] }[] };
    const vistos = new Set<number>();
    const dias = (m.dias ?? [])
      .map(d => diaDeMiRadarSchema.safeParse(d))
      .flatMap(r => (r.success ? [r.data] : []))
      .filter(d => Number.isInteger(d.dia) && d.dia >= 1 && d.dia <= 7 && !vistos.has(d.dia) && vistos.add(d.dia))
      .sort((a, b) => a.dia - b.dia);
    return { encendido: true, horas: horasValidas(m.horas), dias };
  });

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
    /* Spec 012: lo ven el mentor, el líder y administración en la ficha. Un `miRadar` roto o ausente se pierde SOLO
       él: la lista de registros, que es lo que importa, sigue. */
    miRadar: miRadarSchema.nullish().catch(null),
  })
  .passthrough();

export const radarSchemas = {
  registro: registroRadarSchema,
  ultimo: ultimoRadarSchema,
  historial: historialRadarSchema,
  miRadar: miRadarSchema,
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

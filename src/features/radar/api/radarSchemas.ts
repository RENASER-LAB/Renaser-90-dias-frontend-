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
    /* Spec 030: «dictado» (al menos una respuesta se habló). Ausente en un backend anterior y en los registros viejos: vale
       `false`. Un valor raro se pierde SOLO él: lo que la persona escribió sigue. */
    dictado: z.boolean().catch(false),
  })
  .passthrough();

/** Las horas en punto de un día, de 0 a 23, sin repetir y ordenadas. Lo demás se descarta acá y no más adelante. */
function horasValidas(horas: readonly number[] | null | undefined): number[] {
  return [...new Set((horas ?? []).filter(h => Number.isInteger(h) && h >= 0 && h <= 23))].sort((a, b) => a - b);
}

const horaLegible = z.string().regex(/^\d{2}:\d{2}/);
const entero = (minimo: number) => z.number().int().min(minimo);

/**
 * Un día de Mi Radar (spec 019): `dia` ISO 1..7 y lo que el servidor resolvió. Un día roto (sin `dia`, sin `maximo` ni `veces`,
 * que es como llega una respuesta de un backend anterior a la 019) se pierde SOLO él y, si no queda ninguno, la lectura entera
 * se lee como un backend sin Mi Radar nuevo (`miRadarSchema`).
 */
const diaDeMiRadarSchema = z
  .object({
    dia: entero(1).max(7),
    fecha: z.string().nullish().catch(null),
    modo: z.enum(['AUTOMATICO', 'PERSONALIZADO']).catch('AUTOMATICO'),
    veces: entero(0),
    maximo: entero(0),
    sinRadar: z.boolean().catch(false),
    editable: z.boolean().catch(false),
    despertar: horaLegible.nullish().catch(null),
    dormir: horaLegible.nullish().catch(null),
    horas: z.array(z.number()).nullish().catch(null),
    motivo: z.enum(['SIN_DESPERTAR', 'SIN_DORMIR', 'HORARIO_INVALIDO']).nullish().catch(null),
  })
  .passthrough()
  .transform(d => {
    const horas = horasValidas(d.horas).filter(h => h >= 3);
    return {
      dia: d.dia,
      fecha: d.fecha ?? null,
      modo: d.modo,
      veces: d.sinRadar ? 0 : Math.max(d.veces, 0),
      maximo: d.maximo,
      sinRadar: d.sinRadar,
      editable: d.editable,
      despertar: d.despertar ? d.despertar.slice(0, 5) : null,
      dormir: d.dormir ? d.dormir.slice(0, 5) : null,
      horas,
      motivo: d.motivo ?? null,
    };
  });

/**
 * Mi Radar (spec 019): encendido, la fecha de hoy y los días que el servidor resolvió con el Despertar y el Dormir. Siempre
 * sale un arreglo ordenado por día, sin días fuera de 1..7 ni repetidos (gana el primero). **Una respuesta sin ningún día
 * entendible (un backend anterior a la 019, que mandaba `horas`) NO es un Mi Radar apagado: es un error de lectura**, y quien
 * llama no ofrece nada en vez de inventar un estado.
 */
const miRadarSchema = z
  .object({
    encendido: z.boolean(),
    hoy: z.string().nullish().catch(null),
    dias: z.array(z.unknown()),
  })
  .passthrough()
  .superRefine((m, ctx) => {
    if (!m.dias.some(d => diaDeMiRadarSchema.safeParse(d).success)) {
      ctx.addIssue({ code: 'custom', message: 'Mi Radar sin días (¿backend anterior a la spec 019?)', path: ['dias'] });
    }
  })
  .transform(m => {
    const vistos = new Set<number>();
    const dias = m.dias
      .map(d => diaDeMiRadarSchema.safeParse(d))
      .flatMap(r => (r.success ? [r.data] : []))
      .filter(d => !vistos.has(d.dia) && vistos.add(d.dia))
      .sort((a, b) => a.dia - b.dia);
    return { encendido: m.encendido, hoy: m.hoy ?? null, dias };
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

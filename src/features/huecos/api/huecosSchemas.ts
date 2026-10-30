import { z } from 'zod';

import type {
  BloqueOcupado,
  DiaConHuecos,
  HuecoDelDia,
  HuecoQueSeRepite,
  HuecosDeLaSemana,
  ResumenDeHuecos,
  SinVentanaPor,
  TipoDeOcupado,
} from '../types/huecos.types';

/**
 * Validación en runtime de lo que responde el servidor (contrato de la spec 015). Mismo criterio que el resto de la app:
 * `passthrough()` para que un campo nuevo no rompa nada y **tolerante por partes**: un día, un hueco o un campo del
 * resumen que no se entienden se pierden ELLOS, no la sección. Lo único indispensable es `semana` (sin saber qué
 * lunes es, no hay a dónde ir con ‹ ›): sin él, la respuesta no sirve y se lee como un fallo.
 */

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** `yyyy-MM-dd` que existe en el calendario (el 2026-02-31 no). */
export function esFechaIso(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !FECHA.test(valor)) return false;
  const d = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor;
}

const fechaSchema = z.string().refine(esFechaIso, 'fecha yyyy-MM-dd');

/**
 * `HH:mm` (también `24:00`, el fin de un día sin ventana). Si el servidor mandara `HH:mm:ss`, se queda con `HH:mm`.
 */
const horaSchema = z
  .string()
  .regex(/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)(?::\d{2}(?:\.\d+)?)?$/)
  .transform(h => h.slice(0, 5));

function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/** Minutos enteros no negativos; lo demás es «no lo sé» (`null`), no un cero que parecería un dato. */
const minutosOpcionales = z
  .number()
  .finite()
  .nonnegative()
  .transform(n => Math.round(n))
  .nullish()
  .catch(null)
  .transform(n => n ?? null);

const huecoSchema = z
  .object({ desde: horaSchema, hasta: horaSchema, minutos: z.number().finite().nonnegative().nullish().catch(null) })
  .passthrough()
  .transform((h): HuecoDelDia => ({
    desde: h.desde,
    hasta: h.hasta,
    /* Si no llegaron los minutos, salen de las dos horas: el tramo es lo que importa. */
    minutos: h.minutos != null ? Math.round(h.minutos) : Math.max(0, aMinutos(h.hasta) - aMinutos(h.desde)),
  }))
  .refine(h => h.hasta > h.desde, 'el hueco termina antes de empezar');

/**
 * `null` (o ausente: Jackson puede omitir el campo nulo) = el día cuenta entero. Una ventana que no se entiende también
 * se lee así: es la que no limita nada.
 */
const ventanaSchema = z
  .object({ desde: horaSchema, hasta: horaSchema })
  .passthrough()
  .transform(v => ({ desde: v.desde, hasta: v.hasta }))
  .nullish()
  .catch(null)
  .transform(v => v ?? null);

const TIPOS_CONOCIDOS: readonly string[] = ['HABITO', 'ACCION', 'EVENTO', 'AGENDA'];

/**
 * Un bloque ocupado de la agenda de un día. Un tipo que la app no conoce no lo pierde: se dibuja como `OTRO`. El nombre
 * vacío o que no es texto es «sin nombre» (`null`), y la agenda personal NUNCA lleva nombre aunque el servidor lo mande:
 * se dice solo «Ocupado».
 */
const bloqueSchema = z
  .object({
    desde: horaSchema,
    hasta: horaSchema,
    tipo: z.string().nullish().catch(null),
    titulo: z.string().nullish().catch(null),
  })
  .passthrough()
  .transform((b): BloqueOcupado => {
    const tipo = (typeof b.tipo === 'string' && TIPOS_CONOCIDOS.includes(b.tipo) ? b.tipo : 'OTRO') as TipoDeOcupado;
    const titulo = tipo === 'AGENDA' ? '' : (b.titulo ?? '').trim();
    return { desde: b.desde, hasta: b.hasta, tipo, titulo: titulo === '' ? null : titulo };
  })
  .refine(b => aMinutos(b.hasta) > aMinutos(b.desde), 'el bloque termina antes de empezar');

const MOTIVOS: readonly string[] = ['SIN_DESPERTAR', 'SIN_DORMIR', 'SIN_DESPERTAR_NI_DORMIR', 'DORMIR_ANTES_DE_DESPERTAR'];

const sinVentanaPorSchema = z
  .string()
  .nullish()
  .catch(null)
  .transform((v): SinVentanaPor | null => (typeof v === 'string' && MOTIVOS.includes(v) ? (v as SinVentanaPor) : null));

/** Un conteo del día: entero no negativo, o `null` (no lo sé). Un cero es un dato; la ausencia no. */
const conteoDelDiaSchema = z
  .number()
  .finite()
  .nonnegative()
  .transform(n => Math.round(n))
  .nullish()
  .catch(null)
  .transform(n => n ?? null);

const diaSchema = z
  .object({
    fecha: fechaSchema,
    ventana: ventanaSchema,
    sinVentanaPor: sinVentanaPorSchema,
    minutosOcupados: minutosOpcionales,
    minutosLibres: minutosOpcionales,
    huecos: z.array(z.unknown()).nullish().catch(null),
    ocupados: z.array(z.unknown()).nullish().catch(null),
    cumplidosATiempo: conteoDelDiaSchema,
    cumplidosTarde: conteoDelDiaSchema,
    noCumplidos: conteoDelDiaSchema,
  })
  .passthrough()
  .transform((d): DiaConHuecos => ({
    fecha: d.fecha,
    ventana: d.ventana,
    sinVentanaPor: d.sinVentanaPor,
    minutosOcupados: d.minutosOcupados,
    minutosLibres: d.minutosLibres,
    huecos: (d.huecos ?? [])
      .flatMap(h => {
        const r = huecoSchema.safeParse(h);
        return r.success ? [r.data] : [];
      })
      .sort((a, b) => a.desde.localeCompare(b.desde)),
    /* Ausente o no es una lista = el servidor no la dice (`null`). Una lista vacía es «nada planificado». */
    ocupados: d.ocupados
      ? d.ocupados
          .flatMap(b => {
            const r = bloqueSchema.safeParse(b);
            return r.success ? [r.data] : [];
          })
          .sort((a, b) => a.desde.localeCompare(b.desde) || a.hasta.localeCompare(b.hasta))
      : null,
    cumplidosATiempo: d.cumplidosATiempo,
    cumplidosTarde: d.cumplidosTarde,
    noCumplidos: d.noCumplidos,
  }));

/** Un hueco que se repite: sus días en ISO 1..7, sin repetir y en orden. Sin ningún día válido no se entiende. */
const huecoQueSeRepiteSchema = z
  .object({ desde: horaSchema, hasta: horaSchema, dias: z.array(z.number()) })
  .passthrough()
  .transform((h): HuecoQueSeRepite => ({
    desde: h.desde,
    hasta: h.hasta,
    dias: [...new Set(h.dias.filter(d => Number.isInteger(d) && d >= 1 && d <= 7))].sort((a, b) => a - b),
  }))
  .refine(h => h.dias.length > 0, 'sin días');

const conteoSchema = z
  .number()
  .finite()
  .nonnegative()
  .transform(n => Math.round(n))
  .nullish()
  .catch(null)
  .transform(n => n ?? null);

const resumenSchema = z
  .object({
    minutosOcupados: minutosOpcionales,
    minutosLibres: minutosOpcionales,
    huecosQueSeRepiten: z.array(z.unknown()).nullish().catch(null),
    cumplidosATiempo: conteoSchema,
    cumplidosTarde: conteoSchema,
    noCumplidos: conteoSchema,
  })
  .passthrough()
  .transform((r): ResumenDeHuecos => ({
    minutosOcupados: r.minutosOcupados,
    minutosLibres: r.minutosLibres,
    huecosQueSeRepiten: (r.huecosQueSeRepiten ?? []).flatMap(h => {
      const p = huecoQueSeRepiteSchema.safeParse(h);
      return p.success ? [p.data] : [];
    }),
    cumplidosATiempo: r.cumplidosATiempo,
    cumplidosTarde: r.cumplidosTarde,
    noCumplidos: r.noCumplidos,
  }));

const huecosDeLaSemanaSchema = z
  .object({
    semana: fechaSchema,
    primeraSemana: fechaSchema.nullish().catch(null),
    hoy: fechaSchema.nullish().catch(null),
    cerrada: z.boolean().catch(false),
    dias: z.array(z.unknown()).nullish().catch(null),
    /* Un resumen roto se pierde SOLO él: los días, que son lo que se mira, siguen. */
    resumen: resumenSchema.nullish().catch(null),
  })
  .passthrough()
  .transform((r): HuecosDeLaSemana => {
    const vistos = new Set<string>();
    const dias = (r.dias ?? [])
      .flatMap(d => {
        const p = diaSchema.safeParse(d);
        return p.success ? [p.data] : [];
      })
      /* Un mismo día dos veces: gana el primero. */
      .filter(d => !vistos.has(d.fecha) && vistos.add(d.fecha))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    return {
      semana: r.semana,
      primeraSemana: r.primeraSemana ?? null,
      hoy: r.hoy ?? null,
      cerrada: r.cerrada,
      dias,
      resumen: r.resumen ?? null,
    };
  });

export const huecosSchemas = { semana: huecosDeLaSemanaSchema };

/** Lee la respuesta. Si no tiene ni `semana`, no sirve: error (la sección dice «Reintentar»). */
export function leerHuecosDeLaSemana(datos: unknown, origen: string): HuecosDeLaSemana {
  const resultado = huecosDeLaSemanaSchema.safeParse(datos);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .slice(0, 3)
      .map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join(' | ');
    throw new Error(`Respuesta inesperada de ${origen} — ${detalle}`);
  }
  return resultado.data;
}

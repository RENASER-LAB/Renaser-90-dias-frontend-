import { z } from 'zod';

import type {
  AccionDelCierre,
  CierreDelDia,
  CierresDeLaSemana,
  DiaDelCierre,
  EstadoDelCierre,
  RespuestaDelCierre,
  ResumenDeLosCierres,
} from '../types/cierre.types';

/**
 * Validación en runtime de lo que responde el servidor (contrato de la spec 017). El mismo criterio que el resto de la
 * app: `passthrough()` para que un campo nuevo no rompa nada y **tolerante por partes**: una acción, un día o el
 * resumen que no se entienden se pierden ELLOS, no la lectura. Lo único indispensable es la fecha (el día) o el lunes
 * (la semana): sin eso la respuesta no sirve y se lee como un fallo.
 *
 * Por eso un backend que contesta otra cosa (`[]`, un objeto sin `fecha`) no es un «día sin cierre»: es «acá no hay
 * cierre», y Training no dibuja la fila.
 */

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** `yyyy-MM-dd` que existe en el calendario (el 2026-02-31 no). */
export function esFechaIso(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !FECHA.test(valor)) return false;
  const d = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor;
}

const fechaSchema = z.string().refine(esFechaIso, 'fecha yyyy-MM-dd');

/** `HH:mm` (o `HH:mm:ss`, que se recorta); lo que no es una hora es «sin hora». */
const horaOpcional = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::\d{2}(?:\.\d+)?)?$/)
  .transform(h => h.slice(0, 5))
  .nullish()
  .catch(null)
  .transform(h => h ?? null);

/** Texto opcional: lo que no es texto, o es vacío, es «sin texto». */
const textoOpcional = z
  .string()
  .nullish()
  .catch(null)
  .transform(t => (t != null && t.trim() !== '' ? t : null));

const instanteOpcional = z
  .string()
  .nullish()
  .catch(null)
  .transform(t => (t != null && !Number.isNaN(new Date(t).getTime()) ? t : null));

const respuestaSchema = z
  .object({ motivo: textoOpcional, manana: textoOpcional, nota: textoOpcional })
  .passthrough()
  .transform((r): RespuestaDelCierre => ({ motivo: r.motivo, manana: r.manana, nota: r.nota }));

const accionSchema = z
  .object({
    id: z.string().min(1),
    titulo: z.string().refine(t => t.trim() !== '', 'sin título'),
    horaInicio: horaOpcional,
    cumplida: z.boolean().catch(false),
    cumplidaEn: instanteOpcional,
    /* Una respuesta rota se pierde sola: la acción sigue a la vista. */
    cierre: respuestaSchema.nullish().catch(null),
    /* Opcional: un servidor anterior no lo manda. Un valor que no es verdadero/falso se lee como «no lo dijo». */
    exigeRespuesta: z.boolean().nullish().catch(null),
  })
  .passthrough()
  .transform((a): AccionDelCierre => ({
    id: a.id,
    titulo: a.titulo.trim(),
    horaInicio: a.horaInicio,
    cumplida: a.cumplida,
    cumplidaEn: a.cumplidaEn,
    cierre: a.cierre ?? null,
    exigeRespuesta: a.exigeRespuesta ?? null,
  }));

const ESTADOS: ReadonlySet<string> = new Set<EstadoDelCierre>(['ABIERTO', 'CERRADO', 'SIN_CERRAR']);

/** El estado que el servidor dijo, o —si dijo algo que esta versión no entiende— el que se deduce de haber cerrado. */
function estadoDe(valor: unknown, cerradoEn: string | null): EstadoDelCierre | null {
  if (typeof valor === 'string' && ESTADOS.has(valor)) return valor as EstadoDelCierre;
  return cerradoEn ? 'CERRADO' : null;
}

function accionesLegibles(lista: unknown[] | null | undefined): AccionDelCierre[] {
  const vistas = new Set<string>();
  return (lista ?? []).flatMap(a => {
    const r = accionSchema.safeParse(a);
    /* Una misma acción dos veces: gana la primera. */
    if (!r.success || vistas.has(r.data.id)) return [];
    vistas.add(r.data.id);
    return [r.data];
  });
}

const diaBase = {
  fecha: fechaSchema,
  estado: z.unknown().optional(),
  cerradoEn: instanteOpcional,
  nota: textoOpcional,
  acciones: z.array(z.unknown()).nullish().catch(null),
};

const diaSchema = z
  .object(diaBase)
  .passthrough()
  .transform((d): DiaDelCierre => ({
    fecha: d.fecha,
    estado: estadoDe(d.estado, d.cerradoEn),
    cerradoEn: d.cerradoEn,
    nota: d.nota,
    acciones: accionesLegibles(d.acciones),
  }));

const conteoSchema = z
  .number()
  .finite()
  .nonnegative()
  .transform(n => Math.round(n))
  .nullish()
  .catch(null)
  .transform(n => n ?? null);

const semanaEnCursoSchema = z
  .object({ cumplidas: conteoSchema, planificadas: conteoSchema })
  .passthrough()
  .nullish()
  .catch(null)
  .transform(s => (s && s.cumplidas !== null && s.planificadas !== null ? { cumplidas: s.cumplidas, planificadas: s.planificadas } : null));

const cierreDelDiaSchema = z
  .object({ ...diaBase, puedeCerrar: z.boolean().catch(false), semana: semanaEnCursoSchema })
  .passthrough()
  .transform((d): CierreDelDia => ({
    fecha: d.fecha,
    estado: estadoDe(d.estado, d.cerradoEn),
    cerradoEn: d.cerradoEn,
    nota: d.nota,
    acciones: accionesLegibles(d.acciones),
    puedeCerrar: d.puedeCerrar,
    semana: d.semana,
  }));

const motivoQueSeRepiteSchema = z
  .object({ motivo: z.string().min(1), veces: z.number().finite().positive() })
  .passthrough()
  .transform(m => ({ motivo: m.motivo, veces: Math.round(m.veces) }));

const resumenSchema = z
  .object({ cerrados: conteoSchema, sinCerrar: conteoSchema, motivos: z.array(z.unknown()).nullish().catch(null) })
  .passthrough()
  .transform((r): ResumenDeLosCierres => ({
    cerrados: r.cerrados,
    sinCerrar: r.sinCerrar,
    motivos: (r.motivos ?? []).flatMap(m => {
      const p = motivoQueSeRepiteSchema.safeParse(m);
      return p.success ? [p.data] : [];
    }),
  }));

const cierresDeLaSemanaSchema = z
  .object({
    semana: fechaSchema,
    primeraSemana: fechaSchema.nullish().catch(null),
    dias: z.array(z.unknown()).nullish().catch(null),
    resumen: resumenSchema.nullish().catch(null),
  })
  .passthrough()
  .transform((r): CierresDeLaSemana => {
    const vistos = new Set<string>();
    const dias = (r.dias ?? [])
      .flatMap(d => {
        const p = diaSchema.safeParse(d);
        return p.success ? [p.data] : [];
      })
      /* Un mismo día dos veces: gana el primero. */
      .filter(d => !vistos.has(d.fecha) && vistos.add(d.fecha))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    return { semana: r.semana, primeraSemana: r.primeraSemana ?? null, dias, resumen: r.resumen ?? null };
  });

export const cierreSchemas = { dia: cierreDelDiaSchema, semana: cierresDeLaSemanaSchema };

function leer<T>(esquema: z.ZodType<T, unknown>, datos: unknown, origen: string): T {
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

/** El cierre de un día. Sin una `fecha` válida no sirve: error (quien lo pide lo trata como «acá no hay cierre»). */
export function leerCierreDelDia(datos: unknown, origen: string): CierreDelDia {
  return leer(cierreDelDiaSchema, datos, origen);
}

/** La semana de cierres. Sin el lunes no sirve: error (la sección dice «Reintentar»). */
export function leerCierresDeLaSemana(datos: unknown, origen: string): CierresDeLaSemana {
  return leer(cierresDeLaSemanaSchema, datos, origen);
}

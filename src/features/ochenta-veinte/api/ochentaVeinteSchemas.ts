import { z } from 'zod';

import type {
  AccionDelOchentaVeinte,
  CifrasDelEje,
  CifrasDelOchentaVeinte,
  EnergiaDelCodigoRenaser,
  EstadoDelPeriodo,
  LoQueFalta,
  RepeticionDelCierre,
  ResumenDeLaSemana,
  ResumenDelCierre,
  TextoDelAnalisis,
  TipoDePeriodo,
  VistaDelPeriodo,
} from '../types/ochentaVeinte.types';

/**
 * Validación en runtime de lo que responde `GET /api/v1/analisis-80-20` y sus dos rutas de ficha (spec 031). El mismo criterio que
 * el resto de la app: `passthrough()` para que un campo nuevo no rompa nada y **tolerante por partes**: una acción, una semana o el
 * resumen del Código Renaser que no se entienden se pierden ELLOS, no la lectura. Lo único indispensable es el periodo (tipo, inicio y
 * fin); sin eso la respuesta no sirve y se lee como un fallo.
 *
 * Un estado que esta versión no conoce se lee como `PENDIENTE` si el periodo cerró y como `EN_CURSO` si no: nunca se inventa un
 * análisis que no llegó.
 */

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaIso(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !FECHA.test(valor)) return false;
  const d = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor;
}

const fecha = z.string().refine(esFechaIso, 'fecha yyyy-MM-dd');
const fechaOpcional = z.string().refine(esFechaIso).nullish().catch(null).transform(v => v ?? null);
const entero = z.number().finite().transform(n => Math.round(n)).catch(0);
const enteroOpcional = z.number().finite().transform(n => Math.round(n)).nullish().catch(null).transform(v => v ?? null);
const decimalOpcional = z.number().finite().nullish().catch(null).transform(v => v ?? null);
const texto = z.string().transform(t => t.trim());

const accionSchema = z
  .object({
    eje: z.string(),
    color: z.string(),
    impacto: entero,
    fecha,
    titulo: texto.refine(t => t !== '', 'sin título'),
  })
  .passthrough()
  .transform((a): AccionDelOchentaVeinte => ({ eje: a.eje, color: a.color, impacto: a.impacto, fecha: a.fecha, titulo: a.titulo }));

const ejeSchema = z
  .object({ eje: z.string(), planificadas: entero, cumplidas: entero, impactoCumplido: entero, porcentajeDelImpacto: enteroOpcional })
  .passthrough()
  .transform((e): CifrasDelEje => ({
    eje: e.eje,
    planificadas: e.planificadas,
    cumplidas: e.cumplidas,
    impactoCumplido: e.impactoCumplido,
    porcentajeDelImpacto: e.porcentajeDelImpacto,
  }));

const repeticionSchema = z
  .object({ clave: z.string(), veces: entero })
  .passthrough()
  .transform((r): RepeticionDelCierre => ({ clave: r.clave, veces: r.veces }));

const cierreSchema = z
  .object({
    diasCerrados: entero,
    diasSinCerrar: entero,
    motivos: z.array(z.unknown()).nullish().catch(null),
    planes: z.array(z.unknown()).nullish().catch(null),
  })
  .passthrough()
  .transform((c): ResumenDelCierre => ({
    diasCerrados: c.diasCerrados,
    diasSinCerrar: c.diasSinCerrar,
    motivos: legibles(c.motivos, repeticionSchema),
    planes: legibles(c.planes, repeticionSchema),
  }));

function legibles<T>(lista: unknown[] | null | undefined, esquema: z.ZodType<T>): T[] {
  return (lista ?? []).flatMap(elemento => {
    const r = esquema.safeParse(elemento);
    return r.success ? [r.data] : [];
  });
}

const verdesSchema = z
  .object({ planificadas: entero, cumplidas: entero, impactoCumplido: entero, porcentajeDelImpacto: enteroOpcional })
  .passthrough();

const veinteSchema = z
  .object({ acciones: entero, impacto: entero, porcentajeDelImpacto: enteroOpcional })
  .passthrough();

const cifrasSchema = z
  .object({
    desde: fecha,
    hasta: fecha,
    planificadas: entero,
    cumplidas: entero,
    diasConAcciones: entero,
    porVenir: entero,
    impactoPlanificado: entero,
    impactoCumplido: entero,
    porcentajeCumplidas: enteroOpcional,
    verdes: verdesSchema.nullish().catch(null),
    veintePorCiento: veinteSchema.nullish().catch(null),
    porEje: z.array(z.unknown()).nullish().catch(null),
    lasQueMasMovieron: z.array(z.unknown()).nullish().catch(null),
    lasQueSeFueron: z.array(z.unknown()).nullish().catch(null),
    cumplioLoQueMenosMovia: z.boolean().catch(false),
    cierre: cierreSchema.nullish().catch(null),
  })
  .passthrough()
  .transform((c): CifrasDelOchentaVeinte => ({
    desde: c.desde,
    hasta: c.hasta,
    planificadas: c.planificadas,
    cumplidas: c.cumplidas,
    diasConAcciones: c.diasConAcciones,
    porVenir: c.porVenir,
    impactoPlanificado: c.impactoPlanificado,
    impactoCumplido: c.impactoCumplido,
    porcentajeCumplidas: c.porcentajeCumplidas,
    verdes: c.verdes
      ? {
          planificadas: c.verdes.planificadas,
          cumplidas: c.verdes.cumplidas,
          impactoCumplido: c.verdes.impactoCumplido,
          porcentajeDelImpacto: c.verdes.porcentajeDelImpacto,
        }
      : null,
    veintePorCiento: c.veintePorCiento
      ? { acciones: c.veintePorCiento.acciones, impacto: c.veintePorCiento.impacto, porcentajeDelImpacto: c.veintePorCiento.porcentajeDelImpacto }
      : null,
    porEje: legibles(c.porEje, ejeSchema),
    lasQueMasMovieron: legibles(c.lasQueMasMovieron, accionSchema),
    lasQueSeFueron: legibles(c.lasQueSeFueron, accionSchema),
    cumplioLoQueMenosMovia: c.cumplioLoQueMenosMovia,
    cierre: c.cierre ?? null,
  }));

/* Una semana sin número no se puede nombrar: se pierde ELLA (por eso el número no lleva `.catch(0)`). */
const numeroDeSemana = z.number().finite().positive().transform(n => Math.round(n));

const semanaSchema = z
  .object({ numero: numeroDeSemana, planificadas: entero, cumplidas: entero, porcentajeCumplidas: enteroOpcional, porcentajeDelImpactoDeLasVerdes: enteroOpcional })
  .passthrough()
  .transform((s): ResumenDeLaSemana => ({
    numero: s.numero,
    planificadas: s.planificadas,
    cumplidas: s.cumplidas,
    porcentajeCumplidas: s.porcentajeCumplidas,
    porcentajeDelImpactoDeLasVerdes: s.porcentajeDelImpactoDeLasVerdes,
  }));

const energiaSchema = z
  .object({
    respuestas: entero,
    dictadas: entero,
    energiaPromedio: decimalOpcional,
    energiaMinima: enteroOpcional,
    energiaMaxima: enteroOpcional,
    porMomento: z
      .object({ manana: decimalOpcional, tarde: decimalOpcional, noche: decimalOpcional })
      .passthrough()
      .nullish()
      .catch(null),
  })
  .passthrough()
  .transform((e): EnergiaDelCodigoRenaser => ({
    respuestas: e.respuestas,
    dictadas: e.dictadas,
    energiaPromedio: e.energiaPromedio,
    energiaMinima: e.energiaMinima,
    energiaMaxima: e.energiaMaxima,
    manana: e.porMomento?.manana ?? null,
    tarde: e.porMomento?.tarde ?? null,
    noche: e.porMomento?.noche ?? null,
  }));

const analisisSchema = z
  .object({
    loQueMasMovio: texto.refine(t => t !== ''),
    loQueSeTeFue: texto.refine(t => t !== ''),
    comoEstuviste: texto.refine(t => t !== ''),
    proximosPasos: z.array(z.unknown()).catch([]),
  })
  .passthrough()
  .transform((a): TextoDelAnalisis | null => {
    const pasos = a.proximosPasos.flatMap(p => (typeof p === 'string' && p.trim() !== '' ? [p.trim()] : []));
    return pasos.length === 0
      ? null
      : { loQueMasMovio: a.loQueMasMovio, loQueSeTeFue: a.loQueSeTeFue, comoEstuviste: a.comoEstuviste, proximosPasos: pasos };
  });

const ESTADOS: ReadonlySet<string> = new Set<EstadoDelPeriodo>(['EN_CURSO', 'LISTO', 'PENDIENTE', 'SIN_DATOS', 'SIN_ANALISIS']);
const FALTAS: ReadonlySet<string> = new Set<LoQueFalta>(['ACCIONES', 'DIAS']);

function estadoDe(valor: unknown, cerrado: boolean, analisis: TextoDelAnalisis | null): EstadoDelPeriodo {
  /* Un «LISTO» sin texto legible no es un análisis: se lee como pendiente, no como una hoja vacía. */
  if (valor === 'LISTO') return analisis ? 'LISTO' : 'PENDIENTE';
  if (typeof valor === 'string' && ESTADOS.has(valor)) return valor as EstadoDelPeriodo;
  return cerrado ? 'PENDIENTE' : 'EN_CURSO';
}

const vistaSchema = z
  .object({
    tipo: z.enum(['SEMANA', 'MES']),
    numero: entero,
    inicio: fecha,
    fin: fecha,
    cerrado: z.boolean().catch(false),
    anterior: fechaOpcional,
    siguiente: fechaOpcional,
    cifras: cifrasSchema,
    semanas: z.array(z.unknown()).nullish().catch(null),
    estado: z.unknown().optional(),
    falta: z.array(z.unknown()).nullish().catch(null),
    minimoDeAcciones: entero,
    codigoRenaser: energiaSchema.nullish().catch(null),
    analisis: analisisSchema.nullish().catch(null),
    generadoEn: z.string().nullish().catch(null),
  })
  .passthrough()
  .transform((v): VistaDelPeriodo => {
    const analisis = v.analisis ?? null;
    const estado = estadoDe(v.estado, v.cerrado, analisis);
    return {
      tipo: v.tipo as TipoDePeriodo,
      numero: v.numero,
      inicio: v.inicio,
      fin: v.fin,
      cerrado: v.cerrado,
      anterior: v.anterior,
      siguiente: v.siguiente,
      cifras: v.cifras,
      semanas: legibles(v.semanas, semanaSchema),
      estado,
      falta: (v.falta ?? []).filter((f): f is LoQueFalta => typeof f === 'string' && FALTAS.has(f)),
      minimoDeAcciones: v.minimoDeAcciones,
      codigoRenaser: v.codigoRenaser ?? null,
      /* El texto solo se muestra con el estado LISTO: nunca junto a «llega pronto». */
      analisis: estado === 'LISTO' ? analisis : null,
      generadoEn: estado === 'LISTO' && v.generadoEn && !Number.isNaN(new Date(v.generadoEn).getTime()) ? v.generadoEn : null,
    };
  });

/** @throws Error si la respuesta no es un periodo: quien llama lo trata como un fallo. */
export function leerVistaDelPeriodo(respuesta: unknown, origen: string): VistaDelPeriodo {
  const r = vistaSchema.safeParse(respuesta);
  if (!r.success) throw new Error(`Respuesta inesperada de ${origen}`);
  return r.data;
}

import type { EjeObjetivo, RocaMaestraApi, RocaSemanalApi } from '../types/objetivos.types';
import {
  mesDeLaSemana,
  mesesDelProgramaDe,
  semanaAPlanificar,
  semanaDe,
  semanasDelMes,
  semanasDelProgramaDe,
} from './periodoDelPrograma';

/**
 * El mes del programa, con sus semanas y sus fechas (spec 028, «Planificar mi mes», 2026-10-31). Pura: recibe el día del programa y
 * «hoy» y no toca red ni reloj, así que se prueba con cualquier día.
 *
 * ## De qué mes y de qué semanas habla
 *
 * Las del programa, contadas igual que el servidor (D-203, `periodoDelPrograma`): semanas de lunes a domingo, trece, la 13 hasta el
 * día 90, y el mes es un bloque de cuatro semanas (el 3 se lleva la 13). **No son meses del calendario**: «Mes 2 · Semanas 5 a 8»
 * cae en fechas distintas para dos personas que empezaron en días distintos (decisión del dueño 028-2).
 *
 * Con la duración de cada persona (spec 022) los meses son los del servidor, `duración / 30`: 3 en 90 días y 12 en 365 (hasta la semana 53),
 * con las semanas repartidas parejo entre ellos. Todo recibe la duración como último argumento opcional; sin ella, la de 90 días.
 *
 * ## Las fechas
 *
 * El Día 1 es hoy menos los días que van del programa (`GET /home` ya trae el día con el ajuste aplicado, la misma cuenta que usa
 * `semanaDe`). La semana 1 va del Día 1 al primer domingo (corta si no se empezó un lunes); de la 2 a la 12, de lunes a domingo; la 13
 * va de su lunes al día 90 — los días que caerían en una «semana 14» se suman a ella (D-203). Todo con `Date` local al mediodía: nada
 * de `toISOString` (pasa a UTC y a la noche cambia el día, E-91).
 *
 * Con el programa sin arrancar (`diaPrograma < 1`) no hay Día 1 y por eso no hay fechas: las semanas se listan sin ellas.
 */

/** El programa de siempre dura 90 días. */
export const DIAS_DEL_PROGRAMA = 90;

/**
 * Los días del programa de ESTA persona (90 o 365, spec 022). Todo lo de abajo recibe la duración como último argumento opcional: sin ella vale la de
 * siempre, y un programa de 90 días queda exactamente como estaba (E2E de las formaciones, 01/11/2026, J2-6: «Planificar mi mes» ofrecía 3 meses
 * a quien tiene 12).
 */
export function diasDelProgramaDe(duracionDias?: number | null): number {
  return !duracionDias || !Number.isFinite(duracionDias) || duracionDias < 1 ? DIAS_DEL_PROGRAMA : Math.min(Math.trunc(duracionDias), 365);
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

export interface FechasDeUnPeriodo {
  desde: Date;
  hasta: Date;
}

/** La fecha al mediodía, hora local: sin el borde de la medianoche ni los saltos de horario. */
export function alMediodia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12, 0, 0, 0);
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias, 12, 0, 0, 0);
}

/** El Día 1 del programa, o `null` si todavía no arrancó (o no se sabe el día). */
export function diaUnoDelPrograma(diaPrograma: number, hoy: Date): Date | null {
  if (!Number.isFinite(diaPrograma) || diaPrograma < 1) return null;
  return sumarDias(hoy, -(Math.trunc(diaPrograma) - 1));
}

/** El lunes de la semana de esa fecha. */
function lunesDe(fecha: Date): Date {
  return sumarDias(fecha, -((fecha.getDay() + 6) % 7));
}

/**
 * Del Día 1 (o primer día) a último día de la semana `numero` (1 a 13). `null` sin Día 1 o con un número fuera de 1 a 13.
 */
export function fechasDeLaSemanaDelPrograma(numero: number, diaPrograma: number, hoy: Date, duracionDias?: number | null): FechasDeUnPeriodo | null {
  const diaUno = diaUnoDelPrograma(diaPrograma, hoy);
  const ultimaSemana = semanasDelProgramaDe(duracionDias);
  if (!diaUno || !Number.isInteger(numero) || numero < 1 || numero > ultimaSemana) return null;
  const lunesDeLaPrimera = lunesDe(diaUno);
  const desde = numero === 1 ? diaUno : sumarDias(lunesDeLaPrimera, 7 * (numero - 1));
  const hasta = numero === ultimaSemana ? sumarDias(diaUno, diasDelProgramaDe(duracionDias) - 1) : sumarDias(lunesDeLaPrimera, 7 * numero - 1);
  return { desde, hasta };
}

/** Del primer día de su primera semana al último de la última. `null` si no hay Día 1. */
export function fechasDelMes(mes: number, diaPrograma: number, hoy: Date, duracionDias?: number | null): FechasDeUnPeriodo | null {
  const semanas = semanasDelMes(mes, duracionDias);
  const primera = fechasDeLaSemanaDelPrograma(semanas[0], diaPrograma, hoy, duracionDias);
  const ultima = fechasDeLaSemanaDelPrograma(semanas[semanas.length - 1], diaPrograma, hoy, duracionDias);
  return primera && ultima ? { desde: primera.desde, hasta: ultima.hasta } : null;
}

/** `3 nov`. */
export function fechaCorta(fecha: Date): string {
  return `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
}

/** `3 a 9 nov` dentro de un mes; `26 oct a 1 nov` si cruza. */
export function rangoDeFechas({ desde, hasta }: FechasDeUnPeriodo): string {
  if (desde.getFullYear() === hasta.getFullYear() && desde.getMonth() === hasta.getMonth()) {
    return `${desde.getDate()} a ${fechaCorta(hasta)}`;
  }
  return `${fechaCorta(desde)} a ${fechaCorta(hasta)}`;
}

/* ------------------------------------------------------------------------------------------------
 * El estado de una semana
 * ---------------------------------------------------------------------------------------------- */

export type EstadoDeLaSemanaDelMes =
  /** Ya se revisó (autoevaluación final), sea la de ahora o una pasada. */
  | 'revisada'
  | 'esta-semana'
  /** El domingo: la que empieza el lunes se arma HOY y todavía no tiene objetivo. */
  | 'se-arma-hoy'
  /** El domingo: la que empieza el lunes ya tiene objetivo. */
  | 'armada'
  /** La que viene, antes del domingo. */
  | 'se-arma-el-domingo'
  | 'no-llega'
  /** Pasó y no se armó. */
  | 'pasada-sin-objetivo'
  /** Pasó (con objetivo, sin revisar o todavía sin saber). */
  | 'pasada';

export const ETIQUETA_DEL_ESTADO: Readonly<Record<EstadoDeLaSemanaDelMes, string>> = {
  revisada: 'Revisada',
  'esta-semana': 'Esta semana',
  'se-arma-hoy': 'Se arma hoy',
  armada: 'Ya armada',
  'se-arma-el-domingo': 'Se arma el domingo',
  'no-llega': 'Todavía no llega',
  'pasada-sin-objetivo': 'Sin objetivo',
  pasada: 'Terminó',
};

/** Lo único del objetivo semanal que cambia el estado. */
export interface ObjetivoSemanalLeido {
  titulo: string;
  autoevaluacionFin: number | null;
}

/**
 * El estado de la semana `numero` para el eje abierto.
 *
 * @param roca el objetivo semanal de ese eje en esa semana: `undefined` = todavía no se leyó (o la lectura falló), `null` = se leyó y no
 *             hay. Solo cambia el estado de las semanas pasadas, la en curso (revisada o no) y la que se arma el domingo.
 */
export function estadoDeLaSemana(
  numero: number,
  diaPrograma: number,
  hoy: Date,
  roca?: ObjetivoSemanalLeido | null,
  duracionDias?: number | null,
): EstadoDeLaSemanaDelMes {
  const actual = semanaDe(diaPrograma, hoy, duracionDias);
  const seArma = semanaAPlanificar(diaPrograma, hoy, duracionDias);
  if (numero === actual) return roca?.autoevaluacionFin != null ? 'revisada' : 'esta-semana';
  if (numero > actual) {
    if (numero === seArma) return roca ? 'armada' : 'se-arma-hoy';
    return numero === actual + 1 ? 'se-arma-el-domingo' : 'no-llega';
  }
  if (roca === undefined) return 'pasada';
  if (roca === null) return 'pasada-sin-objetivo';
  return roca.autoevaluacionFin != null ? 'revisada' : 'pasada';
}

/**
 * ¿Se puede abrir «Organizar mi semana» desde esta fila? Solo la de ahora y la que se arma hoy: las semanas que no llegaron no se arman
 * por adelantado (la ventana del domingo no cambia).
 */
export function sePuedeOrganizar(numero: number, diaPrograma: number, hoy: Date, duracionDias?: number | null): boolean {
  return numero === semanaDe(diaPrograma, hoy, duracionDias) || numero === semanaAPlanificar(diaPrograma, hoy, duracionDias);
}

/* ------------------------------------------------------------------------------------------------
 * Lo que dibuja la hoja
 * ---------------------------------------------------------------------------------------------- */

export interface SemanaDeLaHoja {
  numero: number;
  /** `3 a 9 nov`; `null` sin Día 1. */
  rango: string | null;
  esLaDeAhora: boolean;
  /** Se lee su objetivo semanal: pasó, es la de ahora o es la que se arma hoy. */
  seLee: boolean;
}

/** Las semanas del mes, en orden. */
export function semanasDeLaHoja(mes: number, diaPrograma: number, hoy: Date, duracionDias?: number | null): SemanaDeLaHoja[] {
  const actual = semanaDe(diaPrograma, hoy, duracionDias);
  const seArma = semanaAPlanificar(diaPrograma, hoy, duracionDias);
  return semanasDelMes(mes, duracionDias).map(numero => {
    const fechas = fechasDeLaSemanaDelPrograma(numero, diaPrograma, hoy, duracionDias);
    return {
      numero,
      rango: fechas ? rangoDeFechas(fechas) : null,
      esLaDeAhora: numero === actual,
      seLee: numero <= seArma,
    };
  });
}

/** «3 a 30 nov», o `null` sin Día 1. */
export function rangoDelMes(mes: number, diaPrograma: number, hoy: Date, duracionDias?: number | null): string | null {
  const fechas = fechasDelMes(mes, diaPrograma, hoy, duracionDias);
  return fechas ? rangoDeFechas(fechas) : null;
}

/** Los meses del programa de esta persona, en orden: 3 en uno de 90 días y 12 en el de 365 (los mismos que cuenta el servidor). */
export function mesesDeLaHoja(duracionDias?: number | null): readonly number[] {
  return Array.from({ length: mesesDelProgramaDe(duracionDias) }, (_, i) => i + 1);
}

/** Los tres meses del programa de 90 días, en orden. */
export const MESES: readonly number[] = mesesDeLaHoja();

/** El mes que se abre elegido: el de hoy. */
export function mesAlAbrir(diaPrograma: number, hoy: Date, duracionDias?: number | null): number {
  return mesDeLaSemana(semanaDe(diaPrograma, hoy, duracionDias), duracionDias);
}

/** El objetivo semanal de ese eje, entre los objetivos de una semana, o `null`. Las rocas no traen el eje: se resuelve con las maestras. */
export function rocaDelEje(rocas: readonly RocaSemanalApi[], maestras: readonly RocaMaestraApi[], eje: EjeObjetivo): RocaSemanalApi | null {
  const maestra = maestras.find(m => m.eje === eje);
  if (!maestra) return null;
  return rocas.find(r => r.rocaMaestraId === maestra.id) ?? null;
}

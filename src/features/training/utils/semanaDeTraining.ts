import { sumarDiasIso } from '../../eventos/utils/zonaHoraria';

/**
 * La semana que muestra Training (spec 014): de lunes a domingo, la que CONTIENE a hoy.
 *
 * No es `semanaDelPlan`. Esa es la semana que se PLANIFICA —el domingo salta a la siguiente, porque lo de
 * hoy ya no se reacomoda— y aquí hace falta la que se VIVE: el domingo, Training sigue en su propia semana.
 *
 * Todo trabaja con fechas `YYYY-MM-DD` del día de la persona (la que manda el servidor, o la del teléfono),
 * sin pasar por `Date` local: la medianoche no cae en una hora UTC fija (E-91).
 */

export type RelacionConHoy = 'pasado' | 'hoy' | 'futuro';

export interface DiaDeLaSemana {
  /** `YYYY-MM-DD`. */
  iso: string;
  /** La inicial que dibuja la pastilla (`L`, `M`, `M`, `J`, `V`, `S`, `D`). */
  letra: string;
  /** El día del mes, sin cero a la izquierda (`29`). */
  numero: string;
  /** `Jueves`: lo que lee el lector de pantalla y el título del día. */
  nombre: string;
  relacion: RelacionConHoy;
}

const NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
const LETRAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

/** 0 = lunes … 6 = domingo, para `YYYY-MM-DD`. */
export function indiceIsoDeLaFecha(fechaIso: string): number {
  const [a, m, d] = fechaIso.split('-').map(Number);
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
}

/** El lunes de la semana que contiene a `fechaIso`. */
export function lunesDe(fechaIso: string): string {
  return sumarDiasIso(fechaIso, -indiceIsoDeLaFecha(fechaIso));
}

export function relacionConHoy(fechaIso: string, hoyIso: string): RelacionConHoy {
  if (fechaIso === hoyIso) return 'hoy';
  return fechaIso < hoyIso ? 'pasado' : 'futuro';
}

/** Los siete días, de lunes a domingo, de la semana que contiene a `hoyIso`. */
export function semanaDe(hoyIso: string): DiaDeLaSemana[] {
  const lunes = lunesDe(hoyIso);
  return NOMBRES.map((nombre, i) => {
    const iso = sumarDiasIso(lunes, i);
    return {
      iso,
      letra: LETRAS[i],
      numero: String(Number(iso.slice(8, 10))),
      nombre,
      relacion: relacionConHoy(iso, hoyIso),
    };
  });
}

/** «Jueves 29»: el título del día elegido. */
export function tituloDelDia(fechaIso: string): string {
  return `${NOMBRES[indiceIsoDeLaFecha(fechaIso)]} ${Number(fechaIso.slice(8, 10))}`;
}

/** El nombre del día en minúsculas, para frases («el jueves»). */
export function nombreDelDiaEnFrase(fechaIso: string): string {
  return NOMBRES[indiceIsoDeLaFecha(fechaIso)].toLowerCase();
}

/**
 * La fecha del Día 1 del programa, o `null` si no se sabe o todavía no arrancó (día 0 o sin dato). Sale del día
 * de hoy y del día del programa que dice el servidor: no se guarda otra fecha.
 */
export function fechaDelDiaUno(hoyIso: string, diaPrograma: number | null | undefined): string | null {
  if (diaPrograma == null || !Number.isFinite(diaPrograma) || diaPrograma < 1) return null;
  return sumarDiasIso(hoyIso, -(diaPrograma - 1));
}

/**
 * ¿Se puede pedir al servidor `GET /habit-tracks/day?date=` para este día? Es la misma regla que el servidor
 * (spec 014, decisión del dueño): solo fechas YA CERRADAS de la semana en curso —de ayer hacia atrás, hasta el
 * lunes— y no antes del Día 1. Cualquier otra fecha daría 400, así que ni se pide.
 *
 * Sin Día 1 conocido (programa sin arrancar, o `/home` todavía sin responder) no hay ningún día anterior del
 * programa que leer: `false`. Mejor no pedir que pedir algo que el servidor va a rechazar.
 */
export function sePuedeLeerElDia(fechaIso: string, hoyIso: string, diaPrograma: number | null | undefined): boolean {
  const diaUno = fechaDelDiaUno(hoyIso, diaPrograma);
  if (!diaUno) return false;
  return fechaIso < hoyIso && fechaIso >= lunesDe(hoyIso) && fechaIso >= diaUno;
}

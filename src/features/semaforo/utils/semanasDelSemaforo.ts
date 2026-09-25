import { sumarDias } from './lecturaDelSemaforo';

/**
 * Moverse entre semanas del semáforo: la tabla de un grupo (§4.3) y el resumen por grupos (§4.4)
 * se piden sin fecha —la ventana vigente, los últimos 7 días cerrados— o con `semanaHasta`, el
 * VIERNES que cierra una semana sábado→viernes (contrato §1; si no es viernes, el servidor responde
 * 400).
 *
 * **Todo sale de lo que ya dijo el servidor, nunca del reloj del teléfono.** El ancla es el `hasta`
 * de la ventana vigente (ayer, en la zona de la persona): el viernes de la última semana cerrada es
 * el viernes más reciente que no pasa de esa fecha. Es la misma regla que
 * `SemanaDelSemaforo.ultimaCerradaAl(hoy)` del backend (`previousOrSame(FRIDAY)` de `hoy − 1`),
 * reescrita acá solo para saber QUÉ fecha pedir: el semáforo lo sigue calculando el servidor.
 *
 * Aritmética de calendario con UTC a mano, como el resto del semáforo: dejar que el teléfono
 * interprete `yyyy-MM-dd` en su huso corre el día una casilla fuera de Lima.
 */

export type PosicionSemanal = { modo: 'vigente' } | { modo: 'semana'; semanaHasta: string };

export const VIGENTE: PosicionSemanal = { modo: 'vigente' };

/**
 * Cuántas semanas cerradas se pueden recorrer hacia atrás: las mismas 13 que el detalle de una
 * persona acepta como máximo (§4.1, `semanas` entre 1 y 13). Cubre un programa entero de 90 días;
 * más atrás no queda nada que mirar de quien cursa hoy.
 */
export const SEMANAS_HACIA_ATRAS = 13;

/** `getUTCDay()` del viernes. */
const VIERNES = 5;

function leerFecha(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function esViernes(iso: string): boolean {
  return leerFecha(iso)?.getUTCDay() === VIERNES;
}

/** El viernes más reciente que no pasa de `iso` (el mismo día, si es viernes). `null` si no se puede leer. */
export function viernesHasta(iso: string): string | null {
  const d = leerFecha(iso);
  if (!d) return null;
  const retroceso = (d.getUTCDay() - VIERNES + 7) % 7;
  return sumarDias(iso, -retroceso);
}

/**
 * El viernes de la semana cerrada más nueva que NO es la ventana vigente.
 *
 * Un sábado la ventana vigente termina el viernes de ayer: ES la semana que acaba de cerrar (el
 * contrato lo dice, «al cerrar, el vigente coincide con la semana»). Si "semana anterior" llevara
 * ahí, mostraría exactamente lo mismo que ya se ve; por eso en ese caso se salta a la de antes.
 */
export function primerViernesCerrado(hastaVigente: string): string | null {
  const viernes = viernesHasta(hastaVigente);
  if (!viernes) return null;
  return viernes === hastaVigente ? sumarDias(viernes, -7) : viernes;
}

/** Una semana más atrás. `null` si no se puede: sin ancla todavía, o ya en el tope. */
export function semanaAnterior(posicion: PosicionSemanal, hastaVigente: string | null): PosicionSemanal | null {
  if (!hastaVigente) return null;
  const primero = primerViernesCerrado(hastaVigente);
  if (!primero) return null;
  if (posicion.modo === 'vigente') return { modo: 'semana', semanaHasta: primero };
  const anterior = sumarDias(posicion.semanaHasta, -7);
  const tope = sumarDias(primero, -7 * (SEMANAS_HACIA_ATRAS - 1));
  return anterior < tope ? null : { modo: 'semana', semanaHasta: anterior };
}

/**
 * Una semana más adelante. Desde la semana cerrada más nueva se vuelve a la ventana vigente, que es
 * lo más nuevo que hay; desde la vigente no hay "siguiente" (`null`): el futuro no se mide.
 */
export function semanaSiguiente(posicion: PosicionSemanal, hastaVigente: string | null): PosicionSemanal | null {
  if (posicion.modo === 'vigente') return null;
  const siguiente = sumarDias(posicion.semanaHasta, 7);
  const primero = hastaVigente ? primerViernesCerrado(hastaVigente) : null;
  if (!primero || siguiente > primero) return VIGENTE;
  return { modo: 'semana', semanaHasta: siguiente };
}

/**
 * Qué días cubre una posición, sin esperar la respuesta: para rotular la pantalla mientras carga.
 * Una semana va del sábado (viernes − 6) al viernes; la vigente, de `hasta − 6` a `hasta`.
 */
export function rangoDePosicion(
  posicion: PosicionSemanal,
  hastaVigente: string | null,
): { desde: string; hasta: string } | null {
  if (posicion.modo === 'semana') return { desde: sumarDias(posicion.semanaHasta, -6), hasta: posicion.semanaHasta };
  return hastaVigente ? { desde: sumarDias(hastaVigente, -6), hasta: hastaVigente } : null;
}

/** Una clave estable por posición, para las dependencias de un efecto. */
export function claveDePosicion(posicion: PosicionSemanal): string {
  return posicion.modo === 'vigente' ? 'vigente' : posicion.semanaHasta;
}

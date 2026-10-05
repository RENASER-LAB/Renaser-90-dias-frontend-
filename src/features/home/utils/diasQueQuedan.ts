import { DIAS_DEL_PROGRAMA } from '../hooks/useResumenHome';

/**
 * Cuántos días le quedan del programa a quien va por `diaPrograma` (el de `GET /api/v1/home`).
 *
 * Es la cuenta que Hoy ya usaba para la tarjeta del Mapa («…para los próximos N días»): 90 menos el
 * día en que va, y nunca menos de 1. Vive acá para que el Mapa diga lo mismo que Hoy.
 *
 * > **Por qué existe (2026-10-05).** La apertura del Mapa tenía escrito «los próximos 83 días»
 * > (90 − 7, de cuando el Mapa vivía en el Día 7). Una cuenta en el día 15 leía 75 en Hoy y 83 al
 * > tocar la tarjeta. Una sola cuenta, en un solo lugar.
 */
export function diasQueQuedan(diaPrograma: number): number {
  return Math.max(1, DIAS_DEL_PROGRAMA - diaPrograma);
}

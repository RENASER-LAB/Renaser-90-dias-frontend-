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

/** Lo que se sabe del día del programa: el `GET /api/v1/home` de Hoy o el de `useProgramaDia`. */
export type DiaQueSeSabe = {
  diaPrograma: number | null | undefined;
  inscrito: boolean | null | undefined;
  cargando: boolean;
};

/**
 * Los días que quedan, o `null` si no se sabe en qué día va: cargando, la lectura falló o no hay
 * inscripción (2026-10-05). Es el criterio con el que la apertura del Mapa ya decidía si mostrar un
 * número; desde ahora lo usan también Hoy y los demás pasos del Mapa, para que nadie rellene el hueco
 * con un día inventado (el «DÍA 1 DE 90» de Hoy, corregido el 2026-09-07; el `?? 0` con el que la
 * tarjeta del Mapa de Hoy decía «los próximos 90 días» con `/home` caído).
 */
export function diasQueQuedanSiSeSabe({ diaPrograma, inscrito, cargando }: DiaQueSeSabe): number | null {
  if (cargando || !inscrito || typeof diaPrograma !== 'number') return null;
  return diasQueQuedan(diaPrograma);
}

/**
 * Los días que quedan, para ir después de «durante» o «para»: «los próximos 75 días», «el día que
 * queda» o, sin número, «lo que queda del programa». Es la redacción que la apertura del Mapa ya usaba
 * mientras no sabía el día: ninguna frase queda rota ni con un número inventado.
 */
export function lapsoQueQueda(quedan: number | null): string {
  if (quedan === null) return 'lo que queda del programa';
  return quedan === 1 ? 'el día que queda' : `los próximos ${quedan} días`;
}

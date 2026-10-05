import { diasQueQuedan } from '../home/utils/diasQueQuedan';

/** Lo que devuelve `useProgramaDia` (de `GET /api/v1/home`, el mismo dato que lee Hoy). */
export type ProgramaParaElMapa = { diaPrograma: number; inscrito: boolean; loading: boolean };

/**
 * El día y la frase de la apertura del Mapa (V01), con el día REAL del programa.
 *
 * > **Corregido 2026-10-05.** La apertura decía «DÍA 7» y «…un plan claro para los próximos 83
 * > días» escritos a mano, de cuando el Mapa vivía en el Día 7. Desde que se abre desde el Día 0
 * > (decisión del dueño del 2026-09-08) eso mentía: una cuenta en el día 15 leía «Día 15» y «75
 * > días» en Hoy, tocaba la tarjeta y el Mapa le decía «DÍA 7» y «83 días». El día sale ahora de
 * > `GET /api/v1/home` y los días que quedan, de la misma cuenta que Hoy (`diasQueQuedan`).
 *
 * Mientras no se sabe el día (cargando, o la lectura falló: `useProgramaDia` deja `inscrito` en
 * `false`) no se muestra ningún número: un día inventado es peor que ninguno (ver el «DÍA 1 DE 90»
 * de Hoy, corregido el 2026-09-07).
 */
export function textosDeApertura({ diaPrograma, inscrito, loading }: ProgramaParaElMapa): {
  dia: string | null;
  plan: string;
} {
  const inicio = 'Ya conoces mejor tu punto de partida. Ahora convertirás lo aprendido en un plan claro para';
  if (loading || !inscrito) {
    return { dia: null, plan: `${inicio} lo que queda del programa.` };
  }
  const quedan = diasQueQuedan(diaPrograma);
  return {
    dia: `Día ${diaPrograma}`,
    plan: quedan === 1 ? `${inicio} el día que queda.` : `${inicio} los próximos ${quedan} días.`,
  };
}

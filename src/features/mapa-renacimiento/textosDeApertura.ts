import { diasQueQuedanSiSeSabe, lapsoQueQueda } from '../home/utils/diasQueQuedan';

/** Lo que devuelve `useProgramaDia` (de `GET /api/v1/home`, el mismo dato que lee Hoy). */
export type ProgramaParaElMapa = { diaPrograma: number; inscrito: boolean; loading: boolean };

/**
 * Los días que quedan del programa para el Mapa, o `null` mientras no se sabe el día (cargando, o
 * la lectura falló: `useProgramaDia` deja `inscrito` en `false`). Es la cuenta de Hoy.
 */
export function diasQueQuedanDelMapa({ diaPrograma, inscrito, loading }: ProgramaParaElMapa): number | null {
  return diasQueQuedanSiSeSabe({ diaPrograma, inscrito, cargando: loading });
}

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
export function textosDeApertura(programa: ProgramaParaElMapa): {
  dia: string | null;
  plan: string;
} {
  const quedan = diasQueQuedanDelMapa(programa);
  return {
    dia: quedan === null ? null : `Día ${programa.diaPrograma}`,
    plan: `Ya conoces mejor tu punto de partida. Ahora convertirás lo aprendido en un plan claro para ${lapsoQueQueda(quedan)}.`,
  };
}

/** Todo lo del Mapa que depende del día del programa, armado una vez por el flujo (`PropsPaso.dias`). */
export type TextosConLosDiasQueQuedan = {
  apertura: ReturnType<typeof textosDeApertura>;
  /** «los próximos 75 días» / «el día que queda» / «lo que queda del programa» (aviso de carga de V06). */
  lapso: string;
  prioridad: string;
  relaciones: string;
  cierre: string;
  botonDelCierre: string;
};

/**
 * Los otros pasos del Mapa que decían «83 días» escrito a mano (2026-10-05, mismo bug que la
 * apertura): la pregunta de la prioridad (V02), la de Relaciones (V05), el aviso de carga del sistema
 * de ejecución (V06) y el cierre (V11). Mismo criterio que la apertura: la cuenta de Hoy, y sin número
 * mientras no se sabe el día.
 */
export function textosConLosDiasQueQuedan(programa: ProgramaParaElMapa): TextosConLosDiasQueQuedan {
  const quedan = diasQueQuedanDelMapa(programa);
  const lapso = lapsoQueQueda(quedan);
  return {
    apertura: textosDeApertura(programa),
    lapso,
    prioridad: `Si durante ${lapso} solo pudieras transformar profundamente un área, ¿cuál tendría mayor impacto en tu vida?`,
    relaciones: `¿Qué relación quieres fortalecer o transformar durante ${lapso}?`,
    cierre: `Has completado la fase Diseño de tu Mapa. Desde hoy tienes una ruta clara para convertir tus decisiones en resultados observables durante ${lapso}.`,
    botonDelCierre:
      quedan === null ? 'Comenzar mi ruta' : quedan === 1 ? 'Comenzar mi último día' : `Comenzar mis ${quedan} días`,
  };
}

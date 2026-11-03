/**
 * El plazo del programa de la persona dicho dentro de una frase (issue #103, identidad por formación en todo): «90 días» en la Escuela y la
 * Certificación, «3 meses» o «1 año» en el Diplomado (`plazoDelObjetivo`). Un texto que escribía «90 días» a mano se lo decía igual a quien está en un
 * Diplomado de 1 año. Con 90 días cada frase es EXACTAMENTE la que ya había.
 *
 * Solo el año pide un retoque del artículo: «durante los 90 días» pero «durante el año», «a los 3 meses» pero «al año». Puras, para probarlas sin pantallas.
 */

/** «los 90 días», «los 3 meses», «el año»: para «durante …» y «con …». */
export function plazoConArticulo(plazo: string): string {
  return plazo === '1 año' ? 'el año' : `los ${plazo}`;
}

/** «a los 90 días», «a los 3 meses», «al año»: la contracción de «a el». */
export function alPlazo(plazo: string): string {
  return plazo === '1 año' ? 'al año' : `a los ${plazo}`;
}

/** «tus 90 días», «tus 3 meses», «tu año»: para «Todavía no arrancaste …». */
export function tuPlazo(plazo: string): string {
  return plazo === '1 año' ? 'tu año' : `tus ${plazo}`;
}

/** «los próximos 90 días», «los próximos 3 meses», «el próximo año». */
export function losProximos(plazo: string): string {
  return plazo === '1 año' ? 'el próximo año' : `los próximos ${plazo}`;
}

/**
 * El día de una etapa del programa de 90 días, llevado a la duración de la persona: el Día 30 de 90 es el Día 122 de 365 (la misma proporción con que se
 * estiran las fases, `fasesDeLaDuracion`). El Día 1 sigue siendo el 1 y el último día es el último de SU programa.
 */
export function diaDeLaEtapa(diaEnNoventa: number, duracionDias: number): number {
  if (diaEnNoventa <= 1) return 1;
  return Math.max(1, Math.round((diaEnNoventa * duracionDias) / 90));
}

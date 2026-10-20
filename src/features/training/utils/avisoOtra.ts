import {
  MAXIMO_MINUTOS_RUEDA_ANTELACION,
  MINIMO_MINUTOS_ANTELACION,
  MINUTOS_OTRA_POR_DEFECTO,
} from '../../habits/utils/etiquetaDeAntelacion';

/**
 * «Otra» en el recordatorio del editor de Planificar (spec 011). Puro: decide qué aviso SUMA «Otra» y cómo lo mueven
 * «−» y «+»; el componente solo lo pinta.
 *
 * Antes «Otra» desplegaba una rueda de 1 a 60 minutos FUERA de lo que se desliza, con un botón «Añadir», y se montaba
 * encima del contenido. Ahora tocar «Otra» SUMA un aviso nuevo y lo marca ya —los que había quedan—, y debajo de las
 * opciones se abre la fila «−  15 min antes  +», dentro del desplazamiento, que mueve SOLO ese aviso de 5 en 5.
 *
 * - **Arranca en 15.** Si 15 ya está, el siguiente valor libre múltiplo de 5: primero hacia arriba hasta 60 y, si no
 *   hay, hacia abajo. Sin ningún valor libre no suma nada.
 * - **«−» y «+» saltan los avisos que ya existen**: nunca pisan ni duplican otro. Sin un valor libre en esa dirección,
 *   el botón se apaga.
 * - **Los demás avisos no cambian nunca** (30, 10, «a la hora», los personalizados que ya había).
 *
 * El rango es el de siempre (1 a 60): lo guardado fuera de él (un aviso de 90 de cuando se escribía a mano) sigue
 * vivo en su pastilla; esta fila no lo toca.
 */

/** Cuánto mueven «−» y «+». */
export const PASO_DE_OTRA = 5;

/** Los topes de la fila: los de la rueda que reemplaza. */
export const MINIMO_DE_OTRA = MINIMO_MINUTOS_ANTELACION;
export const MAXIMO_DE_OTRA = MAXIMO_MINUTOS_RUEDA_ANTELACION;

/** Donde arranca el aviso de «Otra» (15), si está libre. */
export const ARRANQUE_DE_OTRA = MINUTOS_OTRA_POR_DEFECTO;

/** Un sentido del paso: `1` = «+», `-1` = «−». */
export type SentidoDeOtra = 1 | -1;

/** Los múltiplos de 5 que ofrece «Otra» al sumar un aviso: 5, 10 … 60. */
const MULTIPLOS_DE_OTRA: readonly number[] = Array.from(
  { length: Math.floor(MAXIMO_DE_OTRA / PASO_DE_OTRA) },
  (_, i) => (i + 1) * PASO_DE_OTRA,
);

/** El conjunto de avisos en el orden de siempre del editor: de la antelación mayor a la menor, sin repetir. */
function ordenados(avisos: readonly number[]): number[] {
  return [...new Set(avisos)].sort((a, b) => b - a);
}

function dentroDelRango(minutos: number): number {
  return Math.min(Math.max(Math.round(minutos), MINIMO_DE_OTRA), MAXIMO_DE_OTRA);
}

/**
 * Los minutos del aviso nuevo de «Otra»: 15 si está libre; si no, el siguiente libre múltiplo de 5 hacia arriba hasta
 * 60 y, si no hay, hacia abajo. `null` si los doce múltiplos de 5 ya están puestos.
 */
export function minutosParaUnaOtraNueva(avisos: readonly number[]): number | null {
  const ocupados = new Set(avisos);
  const haciaArriba = MULTIPLOS_DE_OTRA.filter(m => m >= ARRANQUE_DE_OTRA);
  const haciaAbajo = MULTIPLOS_DE_OTRA.filter(m => m < ARRANQUE_DE_OTRA).reverse();
  return [...haciaArriba, ...haciaAbajo].find(m => !ocupados.has(m)) ?? null;
}

/**
 * Al tocar «Otra» por primera vez: SUMA un aviso nuevo (los que había quedan) y lo deja marcado, en el orden de
 * siempre. `null` si no hay ningún valor libre: entonces no suma nada y no hay fila que abrir.
 */
export function abrirOtra(avisos: readonly number[]): { avisos: number[]; minutos: number } | null {
  const minutos = minutosParaUnaOtraNueva(avisos);
  if (minutos === null) return null;
  return { avisos: ordenados([...avisos, minutos]), minutos };
}

/**
 * A dónde va el aviso de «Otra» con «−» o «+»: de 5 en 5 desde donde está, con tope en 1 y en 60, SALTANDO los valores
 * que ya existen en la lista (otro aviso nunca se pisa ni se duplica). Un valor que no es múltiplo de 5 se mueve de 5 en
 * 5 desde ahí (12 → 17); un paso que se pasaría del tope cae en el tope (58 → 60). `null` si en esa dirección no hay
 * ningún valor libre.
 */
export function siguienteLibreDeOtra(minutos: number, sentido: SentidoDeOtra, avisos: readonly number[]): number | null {
  const otros = new Set(avisos.filter(m => m !== minutos));
  const tope = sentido === 1 ? MAXIMO_DE_OTRA : MINIMO_DE_OTRA;
  let candidato = dentroDelRango(minutos);
  while (candidato !== tope) {
    candidato = sentido === 1
      ? Math.min(candidato + PASO_DE_OTRA, tope)
      : Math.max(candidato - PASO_DE_OTRA, tope);
    if (!otros.has(candidato)) return candidato;
  }
  return null;
}

/** `false` si en esa dirección no hay un valor libre (el tope, o todo ocupado hasta el tope): el botón se apaga. */
export function sePuedeMover(minutos: number, sentido: SentidoDeOtra, avisos: readonly number[]): boolean {
  return siguienteLibreDeOtra(minutos, sentido, avisos) !== null;
}

/**
 * «−» o «+»: cambia SOLO el aviso de «Otra» en la lista. El anterior sale y el nuevo entra marcado, sin pisar ni duplicar
 * otro, y en el orden de siempre. Los demás avisos —incluido «a la hora», el 0— no se tocan. Sin valor libre en esa
 * dirección no cambia nada.
 */
export function moverAvisoDeOtra(
  avisos: readonly number[],
  minutos: number,
  sentido: SentidoDeOtra,
): { avisos: number[]; minutos: number } {
  const siguiente = siguienteLibreDeOtra(minutos, sentido, avisos);
  if (siguiente === null) return { avisos: [...avisos], minutos };
  return { avisos: ordenados([...avisos.filter(m => m !== minutos), siguiente]), minutos: siguiente };
}

/**
 * Cuánto desplazar lo que se desliza para que la fila de «Otra» se vea entera al abrirse, o `null` si ya se ve.
 *
 * Todo en la misma medida: `filaY` y `filaAlto` son de la fila dentro del contenido, `scrollY` lo que ya se desplazó y
 * `alturaVisible` el alto de lo que se ve. En un teléfono bajo las opciones del recordatorio quedan al pie y la fila
 * nace debajo de lo visible: sin esto «Otra» parecería no hacer nada.
 */
export function desplazamientoParaVerLaFila(
  filaY: number,
  filaAlto: number,
  scrollY: number,
  alturaVisible: number,
  margen = 16,
): number | null {
  if (alturaVisible <= 0) return null;
  const abajo = filaY + filaAlto + margen;
  if (abajo <= scrollY + alturaVisible) return null;
  return Math.max(0, abajo - alturaVisible);
}

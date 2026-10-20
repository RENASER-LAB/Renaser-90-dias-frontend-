import {
  MAXIMO_MINUTOS_RUEDA_ANTELACION,
  MINIMO_MINUTOS_ANTELACION,
  minutosDeArranqueDeLaRueda,
} from '../../habits/utils/etiquetaDeAntelacion';

/**
 * «Otra» en el recordatorio del editor de Planificar (spec 011). Puro: decide qué aviso se agrega al tocar «Otra» y
 * cómo cambia con «−» y «+»; el componente solo lo pinta.
 *
 * Antes «Otra» desplegaba una rueda de 1 a 60 minutos FUERA de lo que se desliza, con un botón «Añadir», y se montaba
 * encima del contenido. Ahora «Otra» agrega y marca el aviso de arranque ya, y debajo de las opciones se abre la fila
 * «−  15 min antes  +», dentro del desplazamiento, que mueve ESE aviso de 5 en 5. El rango es el de siempre (1 a 60):
 * lo guardado fuera de él (un aviso de 90 de cuando se escribía a mano) sigue vivo en su pastilla; esta fila no lo
 * toca.
 */

/** Cuánto mueven «−» y «+». */
export const PASO_DE_OTRA = 5;

/** Los topes de la fila: los de la rueda que reemplaza. */
export const MINIMO_DE_OTRA = MINIMO_MINUTOS_ANTELACION;
export const MAXIMO_DE_OTRA = MAXIMO_MINUTOS_RUEDA_ANTELACION;

/** Un sentido del paso: `1` = «+», `-1` = «−». */
export type SentidoDeOtra = 1 | -1;

/** El conjunto de avisos en el orden de siempre del editor: de la antelación mayor a la menor, sin repetir. */
function ordenados(avisos: readonly number[]): number[] {
  return [...new Set(avisos)].sort((a, b) => b - a);
}

function dentroDelRango(minutos: number): number {
  return Math.min(Math.max(Math.round(minutos), MINIMO_DE_OTRA), MAXIMO_DE_OTRA);
}

/**
 * Al tocar «Otra»: el aviso de arranque —15, o el mayor de los que ya rigen, como abría la rueda— queda en la
 * lista y marcado. Si ya estaba no se duplica: sigue marcado y es el que la fila va a mover.
 */
export function abrirOtra(avisos: readonly number[]): { avisos: number[]; minutos: number } {
  const minutos = minutosDeArranqueDeLaRueda(avisos);
  return { avisos: ordenados([...avisos, minutos]), minutos };
}

/**
 * A dónde va el aviso con «−» o «+»: de 5 en 5 desde donde está, con tope en 1 y en 60. Un valor que no es múltiplo
 * de 5 se mueve de 5 en 5 desde ahí (12 → 17), no se redondea.
 */
export function minutosTrasElPaso(minutos: number, sentido: SentidoDeOtra): number {
  return dentroDelRango(dentroDelRango(minutos) + sentido * PASO_DE_OTRA);
}

/** `false` en el tope: «+» en 60 y «−» en 1 no hacen nada y se ven apagados. */
export function sePuedeMover(minutos: number, sentido: SentidoDeOtra): boolean {
  return minutosTrasElPaso(minutos, sentido) !== dentroDelRango(minutos);
}

/**
 * «−» o «+»: cambia ESE aviso en la lista. El anterior sale y el nuevo entra marcado, sin duplicar (si ya estaba, la
 * lista no crece) y en el orden de siempre. Los demás avisos —incluido «a la hora», el 0— no se tocan.
 */
export function moverAvisoDeOtra(
  avisos: readonly number[],
  minutos: number,
  sentido: SentidoDeOtra,
): { avisos: number[]; minutos: number } {
  const siguiente = minutosTrasElPaso(minutos, sentido);
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

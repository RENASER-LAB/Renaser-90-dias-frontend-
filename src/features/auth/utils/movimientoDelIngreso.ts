import { DURACION_MS } from '../../../theme/movimiento';

/**
 * Los números del movimiento del login (2026-10-05), separados del JSX para poder probarlos.
 *
 * **Entrada escalonada** (`emil-design-eng`, «Stagger Animations»): al abrir, el título, los campos
 * y el botón aparecen uno detrás del otro — opacidad de 0 a 1 y 8 px hacia arriba, 50 ms entre cada
 * uno, con el ease-out fuerte del tema. Es la puerta de entrada y se ve pocas veces al día: entra
 * en el presupuesto de lo «ocasional». Tres bloques: 0, 50 y 100 ms de espera + 260 ms de
 * recorrido = 360 ms, por debajo de los 400 que pidió el dueño. Nunca bloquea: se puede tocar un
 * campo mientras todavía está apareciendo.
 *
 * Con «reducir movimiento» no hay recorrido ni escalón: los tres bloques aparecen juntos con un
 * fundido corto (`apple-design` §14: fundidos en vez de desplazamientos).
 */
export const RECORRIDO_DE_ENTRADA = 8;

export function entradaDelBloque(
  indice: number,
  movimientoReducido: boolean,
): { retardo: number; duracion: number; recorrido: number } {
  if (movimientoReducido) return { retardo: 0, duracion: DURACION_MS.fundido, recorrido: 0 };
  return { retardo: indice * DURACION_MS.escalon, duracion: DURACION_MS.paso, recorrido: RECORRIDO_DE_ENTRADA };
}

/**
 * **La sacudida de «no»** cuando el ingreso falla: el bloque de los campos va y viene tres veces,
 * cada vez menos, y se queda quieto donde estaba. Es el gesto de la pantalla de bloqueo de un
 * teléfono: se entiende sin leer. Cada tramo dice a dónde va (px en horizontal) y en cuánto tiempo;
 * la suma da `DURACION_MS.sacudida` (280 ms). Cortos a propósito: si durara más, la persona tendría
 * que esperar a que termine para volver a escribir.
 */
export const TRAMOS_DE_LA_SACUDIDA: ReadonlyArray<{ hasta: number; ms: number }> = [
  { hasta: -8, ms: 40 },
  { hasta: 8, ms: 48 },
  { hasta: -6, ms: 48 },
  { hasta: 6, ms: 48 },
  { hasta: -3, ms: 48 },
  { hasta: 0, ms: 48 },
];

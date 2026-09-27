/**
 * El largo máximo de un mensaje de chat (D-215 del backend, 2026-09-27; E-374: uno de 1 MB entraba entero).
 *
 * Es el MISMO número que `Mensaje.LARGO_MAXIMO_DEL_TEXTO` del servidor, y se cuenta igual (`string.length`,
 * lo que cuenta el `maxLength` del campo): así la app nunca deja escribir algo que el servidor rechace. Si
 * el dueño cambia el número, se cambia en los dos lados.
 */
export const LARGO_MAXIMO_DEL_MENSAJE = 6000;

/** Desde cuánto se muestra cuánto falta: cerca del tope, no antes (a nadie le sirve un contador siempre). */
const DESDE = LARGO_MAXIMO_DEL_MENSAJE - 500;

/**
 * «5600 de 6000 caracteres» cuando lo escrito se acerca al tope, y `null` antes. El campo corta en el tope
 * (`maxLength`): sin este aviso, un texto pegado que no entra entero se cortaría sin que nadie lo note.
 */
export function avisoDelLargoDelMensaje(texto: string): string | null {
  if (texto.length < DESDE) return null;
  return `${Math.min(texto.length, LARGO_MAXIMO_DEL_MENSAJE)} de ${LARGO_MAXIMO_DEL_MENSAJE} caracteres`;
}

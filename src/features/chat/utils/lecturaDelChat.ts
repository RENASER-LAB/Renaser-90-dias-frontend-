import type { ChatMessage } from '../../../screens/ComunidadScreen';
import type { WireEstadoDeEntregaRecibido } from '../types/chat.types';

/**
 * La doble marca de leído (✓✓, D-208 del backend, decisión del dueño del 2026-09-27).
 *
 * - ✓ : el servidor guardó el mensaje.
 * - ✓✓ dorado: lo leyeron. En un 1 a 1, el otro; en un grupo y en el soporte, TODOS los demás, como
 *   WhatsApp. En la comunidad no hay ✓✓: el servidor manda siempre `SENT` y no avisa lecturas.
 *
 * Dos fuentes, y las dos solo suben la marca, nunca la bajan:
 * - el listado (`GET .../messages`) trae `status` en cada mensaje propio (`mapearMensaje`);
 * - con la conversación abierta, el aviso en vivo `READ` trae «todos leyeron hasta X»
 *   (`useChatEnVivo`), y se aplica con {@link conLeidoHasta} a lo que ya está en pantalla.
 *
 * Lo desconocido o ausente es ✓: un backend anterior no manda `status`, y uno futuro puede mandar
 * un valor que este binario no conoce.
 */

/** La marca del listado: ✓✓ solo con `READ`; cualquier otra cosa, incluso nada, es ✓. */
export function estadoDeEntrega(status: WireEstadoDeEntregaRecibido | null | undefined): 'sent' | 'read' {
  return status === 'READ' ? 'read' : 'sent';
}

/**
 * Un instante de Java (`Instant.toString()`: `2026-09-27T17:00:26.869554Z`) con los decimales
 * llevados a nueve, para comparar como texto. `null` si no tiene esa forma.
 *
 * Por qué no `Date`: guarda milisegundos y el servidor manda microsegundos. Un mensaje escrito
 * 0,4 ms después de la marca caería en el mismo milisegundo y se vería leído sin estarlo.
 */
function comparable(instante: string): string | null {
  const partes = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/.exec(instante);
  return partes ? `${partes[1]}.${(partes[2] ?? '').padEnd(9, '0')}Z` : null;
}

/** Si `a` es el mismo instante que `b` o anterior. Lo que no tenga la forma de arriba va con `Date`. */
export function instanteNoPosterior(a: string, b: string): boolean {
  const ca = comparable(a);
  const cb = comparable(b);
  if (ca && cb) return ca <= cb;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  return Number.isFinite(ta) && Number.isFinite(tb) && ta <= tb;
}

/** La marca más reciente de las dos: un aviso que llega tarde, o repetido, no la hace retroceder. */
export function marcaMasReciente(actual: string | null, nueva: string): string {
  return actual !== null && instanteNoPosterior(nueva, actual) ? actual : nueva;
}

/** Si esta burbuja lleva ✓✓: un mensaje propio, de una persona, que el servidor dijo leído. */
export function llevaDobleMarca(mensaje: Pick<ChatMessage, 'isMe' | 'esDelPrograma' | 'status'>): boolean {
  return mensaje.isMe && !mensaje.esDelPrograma && mensaje.status === 'read';
}

/**
 * Los mensajes con la marca en vivo aplicada: los propios escritos hasta `leidoHasta` pasan a leídos.
 * Devuelve la MISMA lista si nada cambia, para no redibujar la conversación por un aviso que no
 * mueve nada. No toca los de otras personas ni los del programa, ni baja un leído a enviado.
 */
export function conLeidoHasta<M extends Pick<ChatMessage, 'isMe' | 'esDelPrograma' | 'status' | 'createdAt'>>(
  mensajes: readonly M[],
  leidoHasta: string | null | undefined
): readonly M[] {
  if (!leidoHasta) return mensajes;
  let cambio = false;
  const marcados = mensajes.map(mensaje => {
    const pasaALeido =
      mensaje.isMe &&
      !mensaje.esDelPrograma &&
      mensaje.status !== 'read' &&
      !!mensaje.createdAt &&
      instanteNoPosterior(mensaje.createdAt, leidoHasta);
    if (!pasaALeido) return mensaje;
    cambio = true;
    return { ...mensaje, status: 'read' as const };
  });
  return cambio ? marcados : mensajes;
}
